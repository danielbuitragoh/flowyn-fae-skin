/**
 * La bruma que sale del atomizador.
 *
 * Lo que había antes eran cinco círculos con `radial-gradient` y `blur()`
 * expandiéndose en bucle. Se veía barato, y no era cuestión de afinar los
 * valores: con cinco discos del mismo tamaño no se puede construir un
 * aerosol. Lo que distingue un spray de una niebla es físico y se traduce
 * a cuatro cosas concretas, que son las que hace este módulo:
 *
 *   1. Abanico amplio de tamaños de gota. Un atomizador rompe el líquido en
 *      gotas de tamaños muy distintos según la presión; si todas miden lo
 *      mismo, el ojo lee niebla. Aquí el radio sale de una distribución de
 *      potencia: muchas diminutas y unas pocas notablemente mayores.
 *   2. Cono, no nube. Vértice en la boquilla y apertura de unos 22°.
 *   3. La velocidad decae. Sale rápido y frena por rozamiento. Velocidad
 *      constante se lee como humo flotando.
 *   4. Densidad que baja con la distancia: concentrada al salir, dispersa
 *      al final.
 *
 * El dibujo usa un sprite de degradado radial en vez de círculos sólidos, y
 * composición normal, no aditiva. La receta habitual para vapor es aditiva
 * (`lighter`), porque en las pantallas oscuras donde se suele usar la luz se
 * acumula donde se solapan las gotas. Aquí el fondo es crema: sumar luz a un
 * blanco roto no produce nada, y el primer intento salió literalmente
 * invisible pese a estar pintando casi tres mil píxeles. Contra una pared
 * clara, un aerosol real se ve porque *oscurece* un poco lo que hay detrás,
 * no porque brille. Así que el tono es el blush de la paleta, un punto más
 * oscuro que el fondo, con un núcleo claro que es el brillo del chorro al
 * salir de la boquilla.
 *
 * Es una ráfaga, no un bucle. Además de ser más creíble —una bruma facial
 * es un gesto, no un ambiente—, evita el requisito de las WCAG de poder
 * parar el movimiento automático que dura más de cinco segundos.
 */

const DURACION = 1800;   // ms de emisión
const VIDA = 1500;       // ms que vive cada gota
const GOTAS = 190;

/** Sprite de una gota: un degradado radial suave, dibujado una sola vez. */
function hacerSprite() {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const c = s.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  // Cálido, nunca gris azulado: un gris frío sobre crema se lee como humo.
  // El núcleo claro es el brillo del chorro; el cuerpo es blush, que es lo
  // que de verdad se ve contra el fondo crema.
  g.addColorStop(0.00, 'rgba(255, 253, 251, 0.55)');
  g.addColorStop(0.22, 'rgba(233, 210, 204, 0.50)');
  g.addColorStop(0.55, 'rgba(199, 145, 145, 0.26)');
  g.addColorStop(1.00, 'rgba(199, 145, 145, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(32, 32, 32, 0, Math.PI * 2);
  c.fill();
  return s;
}

export function iniciarVaho() {
  const lienzo = document.querySelector('[data-vaho]');
  const zona = document.querySelector('.hero__flotante');
  if (!lienzo || !zona) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const frasco = document.querySelector('.hero__frasco');
  const ctx = lienzo.getContext('2d', { alpha: true });
  if (!ctx) return;

  const sprite = hacerSprite();
  let gotas = [];
  let animando = false;
  let emitiendoHasta = 0;
  let ultimo = 0;
  // Se topa a 2: por encima se multiplica la memoria y el coste de pintado
  // por una diferencia que nadie ve, y en un móvil es justo lo que tira
  // fotogramas.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function medir() {
    const r = lienzo.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /**
   * La boquilla, en coordenadas del lienzo.
   *
   * No se calcula sobre el lienzo sino sobre la fotografía del frasco, y
   * luego se traslada. El lienzo desborda la foto por arriba y por los lados
   * —tiene que hacerlo, porque el chorro sale hacia arriba—, así que un
   * porcentaje del lienzo no cae donde está el atomizador. Midiendo la foto
   * y restando, el punto es correcto aunque cambie el tamaño del lienzo.
   *
   * El 51,5 % del ancho y el 1,2 % del alto salen de medir el canal alfa del
   * packshot: el atomizador ocupa de y=0 a y=235 sobre 1648 px y su eje cae
   * en x=302 sobre 587. No son números a ojo.
   */
  function boquilla() {
    const L = lienzo.getBoundingClientRect();
    const foto = frasco ? frasco.getBoundingClientRect() : L;
    return {
      x: foto.left - L.left + foto.width * 0.515,
      y: foto.top - L.top + foto.height * 0.012,
    };
  }

  function sembrar() {
    const b = boquilla();
    const escala = (frasco ? frasco.getBoundingClientRect().height : 620) / 620;
    const nuevas = [];
    for (let i = 0; i < GOTAS; i++) {
      // Cono de 22° de apertura, apuntando hacia arriba y a la izquierda,
      // que es hacia donde mira el atomizador en la fotografía.
      const ang = (-Math.PI / 2) - 0.62 + (Math.random() - 0.5) * 0.38;
      // Distribución de potencia: el cuadrado de un aleatorio da muchos
      // valores pequeños y pocos grandes. Es lo que produce el abanico de
      // tamaños; con `Math.random()` a secas todas saldrían parecidas.
      const t = Math.random() ** 2;
      const v = (95 + t * 260) * escala;
      nuevas.push({
        x: b.x, y: b.y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        r: (1.1 + (Math.random() ** 2.2) * 13) * escala,
        nace: performance.now() + Math.random() * DURACION,
        vida: VIDA * (0.6 + Math.random() * 0.7),
        giro: (Math.random() - 0.5) * 0.5,
      });
    }
    gotas = nuevas;
  }

  function pintar(ahora) {
    const dt = Math.min((ahora - ultimo) / 1000, 0.05);
    ultimo = ahora;

    const r = lienzo.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    let vivas = 0;
    for (const g of gotas) {
      const edad = ahora - g.nace;
      if (edad < 0) { vivas++; continue; }
      if (edad > g.vida) continue;
      vivas++;

      const p = edad / g.vida;
      // Rozamiento: la gota sale disparada y se frena. Sin esto se ve humo.
      const freno = Math.exp(-2.5 * p);
      g.x += g.vx * freno * dt;
      g.y += g.vy * freno * dt + 9 * p * dt;   // y luego pesa un poco
      g.x += Math.sin(p * 5 + g.giro * 9) * g.giro * 26 * dt;

      // Crece rápido y se apaga despacio, como una gota que se evapora.
      const radio = g.r * (0.35 + p * 2.5);
      const alfa = Math.sin(Math.min(p * 3.4, 1) * Math.PI * 0.5) * (1 - p) ** 1.5 * 0.9;
      if (alfa <= 0.002) continue;

      ctx.globalAlpha = alfa;
      ctx.drawImage(sprite, g.x - radio, g.y - radio, radio * 2, radio * 2);
    }

    ctx.globalAlpha = 1;

    if (vivas > 0 || ahora < emitiendoHasta) {
      requestAnimationFrame(pintar);
    } else {
      animando = false;
      ctx.clearRect(0, 0, r.width, r.height);
    }
  }

  function disparar() {
    if (!medir()) return;
    sembrar();
    emitiendoHasta = performance.now() + DURACION;
    if (animando) return;
    animando = true;
    ultimo = performance.now();
    requestAnimationFrame(pintar);
  }

  // Se dispara al abrir la tapa, no de forma continua. `armado.js` marca el
  // atributo al tocar o con el teclado; con puntero fino lo hace el hover,
  // que el CSS no puede comunicar, así que se escucha aquí.
  const abierto = () => zona.matches(':hover') || zona.hasAttribute('data-tapa-abierta');
  let antes = false;
  function revisar() {
    const ahora = abierto();
    if (ahora && !antes) disparar();
    antes = ahora;
  }

  zona.addEventListener('pointerenter', revisar);
  zona.addEventListener('pointerleave', () => { antes = false; });
  zona.addEventListener('focusin', disparar);
  // El toque y el teclado pasan por `armado.js`, que cambia el atributo.
  new MutationObserver(revisar).observe(zona, {
    attributes: true, attributeFilter: ['data-tapa-abierta'],
  });

  addEventListener('resize', () => { if (animando) medir(); }, { passive: true });
}
