/**
 * Frasco de FAE SKIN en 3D.
 *
 * Por qué modelarlo en vez de usar la fotografía: el manual describe el
 * envase como "vidrio translúcido con reflejos iridiscentes que evocan luz,
 * agua y etereidad". Una foto congela una única incidencia de luz; el
 * iridiscente sólo se entiende cuando el objeto gira y los reflejos se
 * desplazan sobre la superficie. Es la diferencia entre contar el acabado y
 * enseñarlo.
 *
 * La geometría se genera por código y no se carga un modelo: el frasco es
 * un sólido de revolución con estrías retorcidas, así que describirlo con
 * un perfil y una función de desplazamiento pesa unos cientos de bytes en
 * lugar de varios megas de malla, y permite ajustar la silueta editando
 * números en lugar de reexportar desde un programa de 3D.
 *
 * three.js se importa de forma diferida y sólo cuando el dispositivo puede
 * con ello. Si no, la página se queda con el PNG del packshot, que ya se ve
 * bien: el 3D es una mejora, nunca un requisito para ver el producto.
 */

import { construirFrasco, construirBase, ALTURA, CUELLO } from './geometria-frasco.js';

/** ¿Tiene sentido gastar three.js en este dispositivo? */
function equipoCapaz() {
  // El modelo procedural está en pausa: reproduce la proporción y la
  // torsión medidas del envase, pero no su carácter. Lo que hace bello al
  // frasco real son las nervaduras de vidrio refractando la luz, y eso no
  // se alcanza aproximando la forma con fórmulas. Hasta decidir el camino
  // —modelo original de la diseñadora, secuencia 360 o packshot con
  // profundidad— la página sirve la fotografía, que sí está a la altura.
  //
  // El modelo sigue accesible con ?forzar3d=1 para poder seguir juzgándolo.
  if (new URLSearchParams(location.search).has('forzar3d')) return true;
  return false;

  /* eslint-disable no-unreachable */

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  // El vidrio con transmisión es caro de rasterizar. En pantallas pequeñas
  // el frasco se ve diminuto y no compensa el coste.
  if (window.matchMedia('(max-width: 900px)').matches) return false;
  if (navigator.connection?.saveData) return false;
  if ((navigator.hardwareConcurrency ?? 4) < 4) return false;

  try {
    const lienzo = document.createElement('canvas');
    return Boolean(lienzo.getContext('webgl2'));
  } catch {
    return false;
  }
  /* eslint-enable no-unreachable */
}

/**
 * ¿Estamos sobre una GPU de verdad o sobre un rasterizador por software?
 *
 * Importa porque la refracción del vidrio (`transmission`) obliga a
 * renderizar la escena a un buffer aparte en cada fotograma. Las
 * implementaciones por software —SwiftShader, llvmpipe— o no la resuelven
 * bien (el objeto sale blanco plano) o la resuelven a unos pocos
 * fotogramas por segundo. En ambos casos el resultado es peor que la
 * fotografía que ya teníamos, así que conviene saberlo antes de elegir el
 * material.
 */
function usaGpuReal(renderizador) {
  try {
    const gl = renderizador.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) return true;   // sin información, asumimos que sí
    const nombre = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase();
    return !/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(nombre);
  } catch {
    return true;
  }
}

export async function montarFrasco3D(contenedor) {
  if (!contenedor || !equipoCapaz()) return null;

  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

  const ancho = () => contenedor.clientWidth;
  const alto = () => contenedor.clientHeight;

  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderizador.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderizador.setSize(ancho(), alto());
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 0.92;
  contenedor.appendChild(renderizador.domElement);
  renderizador.domElement.setAttribute('aria-hidden', 'true');

  const escena = new THREE.Scene();

  // El grupo se recentra en el origen más abajo, así que la cámara apunta
  // ahí. Un ligero picado (la cámara algo por encima) enseña el hombro del
  // frasco y evita la lectura plana de alzado técnico.
  const camara = new THREE.PerspectiveCamera(30, ancho() / alto(), 0.1, 100);
  camara.position.set(0, 0.42, 7.1);
  camara.lookAt(0, -0.02, 0);

  /* --- Entorno --------------------------------------------------------------
     El vidrio no tiene color propio: lo que vemos es lo que refleja y
     refracta. Sin un entorno alrededor, el frasco saldría plano y gris por
     mucho material que le pongamos. RoomEnvironment viene con three, así
     que no dependemos de descargar un HDRI.                              */
  const pmrem = new THREE.PMREMGenerator(renderizador);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;

  /* --- Materiales ------------------------------------------------------- */
  const conRefraccion = usaGpuReal(renderizador);

  /* Dos acabados para el mismo vidrio.

     Con GPU: refracción real. La luz atraviesa el frasco, se dobla y
     arrastra el fondo consigo — que es lo que hace que un objeto se lea
     como vidrio y no como plástico blanco.

     Sin GPU: nácar translúcido por opacidad. Renuncia a la refracción,
     pero conserva la iridiscencia y el brillo, y se dibuja en una sola
     pasada. Peor que lo anterior, mucho mejor que un bulto blanco.     */
  const vidrio = conRefraccion
    ? new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      thickness: 0.55,
      roughness: 0.09,
      ior: 1.48,
      // Aquí está el "acabado opalescente" del manual: la interferencia de
      // película fina es exactamente el fenómeno que produce esos reflejos.
      iridescence: 1,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [120, 620],
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      attenuationColor: new THREE.Color(0xf7e6de),
      attenuationDistance: 2.6,
      envMapIntensity: 1.25,
      // Sin `transparent`: con transmisión, three ya renderiza el material
      // en su propio paso. Marcarlo además como transparente sólo
      // introduce problemas de orden de dibujado.
    })
    : new THREE.MeshPhysicalMaterial({
      color: 0xf3e6e0,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      iridescence: 1,
      iridescenceIOR: 1.34,
      iridescenceThicknessRange: [140, 640],
      // Menos barniz que en la versión con refracción: aquí la capa
      // especular no compite con nada detrás, así que subida al máximo
      // tapa el cuerpo del vidrio y lo deja blanco.
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      envMapIntensity: 0.8,
      depthWrite: false,   // el frasco es hueco: hay que ver la pared de atrás
      side: THREE.DoubleSide,
    });

  // El contenido: una masa interior nacarada que da cuerpo al frasco. Sin
  // ella el vidrio se ve hueco y el objeto pierde peso visual.
  const contenido = new THREE.MeshPhysicalMaterial({
    color: 0xfdf3ee,
    roughness: 0.16,
    metalness: 0,
    // Casi toda la luz lo atraviesa. Con menos transmisión el frasco se ve
    // relleno de leche en lugar de contener una fórmula acuosa.
    transmission: 0.94,
    thickness: 1.1,
    ior: 1.34,
    iridescence: 0.9,
    iridescenceIOR: 1.28,
    iridescenceThicknessRange: [180, 560],
    attenuationColor: new THREE.Color(0xf6ddd4),
    attenuationDistance: 3.4,
    envMapIntensity: 1.0,
  });

  const oroRosa = new THREE.MeshPhysicalMaterial({
    color: 0xd8a596,
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.5,
  });

  /* --- Geometría --------------------------------------------------------- */
  const grupo = new THREE.Group();

  const geoVidrio = construirFrasco(THREE, { relieve: 0.040 });
  grupo.add(new THREE.Mesh(geoVidrio, vidrio));

  const geoBase = construirBase(THREE);
  grupo.add(new THREE.Mesh(geoBase, vidrio));

  // El contenido repite la forma un poco encogida. Sin refracción, una
  // segunda pared translúcida dentro de otra sólo acumula opacidad y
  // emborrona la silueta, así que sólo se añade cuando aporta.
  const geoDentro = construirFrasco(THREE, {
    segmentosU: 140, segmentosV: 160, encoger: 0.045, relieve: 0.022,
  });
  if (conRefraccion) grupo.add(new THREE.Mesh(geoDentro, contenido));

  /* --- Atomizador ---------------------------------------------------------- */
  const tapa = new THREE.Group();
  // El cuello está algo desplazado del eje por la torsión del cuerpo, así
  // que el atomizador tiene que seguirlo o quedaría flotando de lado.
  tapa.position.x = CUELLO.desvio;

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.166, 0.09, 64), oroRosa);
  collar.position.y = 2.462;
  tapa.add(collar);

  // Cuerpo estriado: las acanaladuras verticales del atomizador real.
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.152, 0.26, 64, 1), oroRosa);
  cuerpo.position.y = 2.640;
  tapa.add(cuerpo);

  const acanaladuras = new THREE.Group();
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * Math.PI * 2;
    const barra = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.22, 0.013), oroRosa);
    barra.position.set(Math.cos(a) * 0.149, 2.640, Math.sin(a) * 0.149);
    barra.rotation.y = -a;
    acanaladuras.add(barra);
  }
  tapa.add(acanaladuras);

  const hombro = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.150, 0.055, 64), oroRosa);
  hombro.position.y = 2.790;
  tapa.add(hombro);

  const pulsador = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.132, 0.07, 64), oroRosa);
  pulsador.position.y = 2.840;
  tapa.add(pulsador);

  const boquilla = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 24), oroRosa);
  boquilla.position.set(0, 2.868, 0.10);
  tapa.add(boquilla);

  grupo.add(tapa);

  // Centrado para que gire sobre su eje óptico y no sobre la base. La
  // altura total con atomizador ronda 2.88, así que el centro cae en 1.44.
  const CENTRO = 1.44;
  grupo.position.y = -CENTRO;
  escena.add(grupo);

  /* --- Luces ----------------------------------------------------------------
     El entorno ya ilumina; estas luces sólo colocan los brillos concretos
     que hacen legible la silueta del vidrio contra un fondo claro.       */
  const clave = new THREE.DirectionalLight(0xfff6ee, 1.5);
  clave.position.set(3.2, 4.4, 3.6);
  escena.add(clave);

  const contra = new THREE.DirectionalLight(0xffe8de, 1.1);
  contra.position.set(-3.4, 2.0, -2.8);
  escena.add(contra);

  const relleno = new THREE.DirectionalLight(0xf2ddd6, 0.55);
  relleno.position.set(-1.4, -2.2, 2.6);
  escena.add(relleno);

  /* --- Interacción ----------------------------------------------------------
     Gira solo, despacio, y el visitante puede arrastrarlo. Al soltar, la
     rotación vuelve por sí misma: nunca se queda en una pose rara si
     alguien lo empuja y se va.                                           */
  let giro = 0.35;
  let velocidad = 0;
  let arrastrando = false;
  let ultimoX = 0;

  const lienzo = renderizador.domElement;
  lienzo.style.cursor = 'grab';
  lienzo.style.touchAction = 'pan-y';

  const empezar = (x) => { arrastrando = true; ultimoX = x; lienzo.style.cursor = 'grabbing'; };
  const mover = (x) => {
    if (!arrastrando) return;
    velocidad += (x - ultimoX) * 0.0055;
    ultimoX = x;
  };
  const soltar = () => { arrastrando = false; lienzo.style.cursor = 'grab'; };

  lienzo.addEventListener('pointerdown', (e) => empezar(e.clientX));
  window.addEventListener('pointermove', (e) => mover(e.clientX));
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  /* --- Bucle ----------------------------------------------------------------
     Se detiene cuando el frasco sale de pantalla. Un canvas WebGL animado
     fuera de vista gasta batería sin que nadie lo mire.                  */
  let visible = true;
  let corriendo = true;

  const observador = new IntersectionObserver(
    ([e]) => { visible = e.isIntersecting; },
    { threshold: 0 }
  );
  observador.observe(contenedor);

  let anterior = 0;
  const animar = (ahora) => {
    if (!corriendo) return;
    requestAnimationFrame(animar);
    if (!visible) return;

    const dt = Math.min((ahora - anterior) / 1000, 0.05);
    anterior = ahora;

    velocidad *= 0.94;                       // rozamiento
    giro += velocidad + (arrastrando ? 0 : dt * 0.16);
    grupo.rotation.y = giro;

    // Cabeceo mínimo: sugiere que flota, sin marear.
    grupo.rotation.z = Math.sin(ahora / 2600) * 0.016;
    grupo.position.y = -CENTRO + Math.sin(ahora / 2100) * 0.045;

    renderizador.render(escena, camara);
  };
  requestAnimationFrame(animar);

  /* --- Redimensionado ------------------------------------------------------- */
  const redimensionar = () => {
    if (!ancho() || !alto()) return;
    camara.aspect = ancho() / alto();
    camara.updateProjectionMatrix();
    renderizador.setSize(ancho(), alto());
  };
  const ro = new ResizeObserver(redimensionar);
  ro.observe(contenedor);

  contenedor.dataset.listo = 'true';

  return {
    destruir() {
      corriendo = false;
      ro.disconnect();
      observador.disconnect();
      geoVidrio.dispose();
      geoDentro.dispose();
      [vidrio, contenido, oroRosa].forEach((m) => m.dispose());
      entorno.dispose();
      pmrem.dispose();
      renderizador.dispose();
      lienzo.remove();
    },
  };
}
