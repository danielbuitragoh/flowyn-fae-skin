/**
 * Geometría del frasco de FAE SKIN.
 *
 * El primer intento usó un sólido de revolución con ondas radiales y salió
 * una botella de agua. El envase real no es un sólido de revolución, y las
 * tres razones están medidas sobre el packshot, no supuestas:
 *
 *  1. La sección es aplanada, tipo petaca. En las tomas de tres cuartos el
 *     frasco es claramente más ancho que hondo.
 *
 *  2. La silueta se retuerce. Midiendo el semiancho a cada lado del eje:
 *     arriba el lado derecho es 1.53 veces el izquierdo, en el centro se
 *     igualan, y abajo se invierte a 0.90. El cuerpo no es simétrico
 *     respecto a un eje vertical: se inclina como una hoja.
 *
 *  3. El relieve no son ondas. Son nervaduras diagonales superpuestas —el
 *     manual las llama "Hoja Fae"— con un borde marcado por un lado y una
 *     caída suave por el otro, como capas de un pétalo montadas entre sí.
 *     Una sinusoide es simétrica y por eso leía como abolladura.
 *
 * Se construye una malla paramétrica en lugar de usar LatheGeometry porque
 * hace falta controlar el radio en función del ángulo Y de la altura a la
 * vez, y una revolución sólo permite lo segundo.
 */

/* Pares [radio, altura] medidos sobre el canal alfa del packshot, fila a
   fila, normalizados para que el radio máximo valga 0.5.                 */
export const PERFIL = [
  [0.000, 0.000], [0.288, 0.000], [0.312, 0.034], [0.342, 0.104],
  [0.386, 0.250], [0.426, 0.400], [0.455, 0.560], [0.476, 0.720],
  [0.490, 0.860], [0.496, 1.000], [0.498, 1.120], [0.498, 1.230],
  [0.478, 1.350], [0.440, 1.470], [0.403, 1.590], [0.373, 1.712],
  [0.358, 1.835], [0.353, 1.957], [0.346, 2.079], [0.328, 2.200],
  [0.286, 2.318], [0.212, 2.398], [0.168, 2.436],
];

/* 2.436 sale de la medición: el vidrio visible mide 1409 px de alto por
   576 de ancho en el packshot, o sea 2.446 a 1. Antes estaba en 2.58
   porque le había alargado el cuello a ojo, y el frasco salía un 6 % más
   estirado de la cuenta. */
export const ALTURA = 2.436;

/**
 * Cuánto más hondo que ancho es el frasco. 1 sería cilíndrico.
 *
 * Cuidado con bajarlo: el ancho que se ve al girar sigue la elipse,
 * 2·√(a²cos²φ + b²sin²φ). Con 0.56 el frasco adelgazaba hasta leerse 4 a 1
 * a mitad de giro, cuando de frente es 2.45 a 1 — y ahí es donde dejaba de
 * parecerse al producto.
 */
const APLANADO = 0.74;

/** Radio del perfil a una altura dada, interpolado entre los puntos medidos. */
function radioEn(y) {
  if (y <= 0) return PERFIL[1][0];
  if (y >= ALTURA) return PERFIL[PERFIL.length - 1][0];
  for (let i = 1; i < PERFIL.length - 1; i += 1) {
    const [r0, y0] = PERFIL[i];
    const [r1, y1] = PERFIL[i + 1];
    if (y >= y0 && y <= y1) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      // Suavizado en la interpolación: con lineal puro se ven las facetas
      // entre puntos medidos, sobre todo en el hombro.
      const s = t * t * (3 - 2 * t);
      return r0 + (r1 - r0) * s;
    }
  }
  return PERFIL[PERFIL.length - 1][0];
}

/**
 * Desplazamiento lateral del eje según la altura.
 *
 * Reproduce la torsión medida: el cuerpo se recuesta hacia un lado arriba y
 * hacia el contrario abajo. Es lo que convierte un envase correcto en uno
 * que parece esculpido.
 */
function inclinacion(t) {
  return 0.052 * Math.sin(Math.PI * (t - 0.12)) * (t - 0.42);
}

/**
 * Relieve de las nervaduras.
 *
 * `u` recorre las cintas: avanza con el ángulo y también con la altura, así
 * que las nervaduras suben en diagonal en lugar de ser verticales. El
 * perfil dentro de cada cinta es asimétrico —sube despacio y cae de golpe—
 * para que se lea como una capa montada sobre la siguiente.
 */
function nervadura(theta, t) {
  const CINTAS = 6;        // cuántas envuelven el cuerpo
  const TORSION = 1.15;    // cuánto giran de abajo arriba

  const u = (theta / (Math.PI * 2)) * CINTAS + t * TORSION;
  const f = u - Math.floor(u);

  // Sube con una curva suave hasta el 82 % de la cinta y cae en el resto.
  const sube = f < 0.82 ? (f / 0.82) ** 0.65 : 1;
  const cae = f < 0.82 ? 1 : 1 - (f - 0.82) / 0.18;
  const perfil = sube * cae * cae;   // el cuadrado afila el borde de caída

  // Las nervaduras se apagan en la base y en el cuello, donde el vidrio
  // real es liso.
  const atenua = Math.sin(Math.PI * Math.min(Math.max((t - 0.03) / 0.84, 0), 1)) ** 0.6;

  return perfil * atenua;
}

/**
 * Construye la malla del frasco.
 *
 * @param {object} THREE  módulo three.js ya importado
 * @param {object} opciones
 * @param {number} opciones.segmentosU  divisiones alrededor
 * @param {number} opciones.segmentosV  divisiones en altura
 * @param {number} opciones.encoger     desplaza la superficie hacia dentro
 *                                      (para la pieza del contenido)
 * @param {number} opciones.relieve     amplitud de las nervaduras
 */
export function construirFrasco(THREE, {
  segmentosU = 220,
  segmentosV = 260,
  encoger = 0,
  relieve = 0.030,
} = {}) {
  const posiciones = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segmentosV; j += 1) {
    const t = j / segmentosV;
    const y = t * ALTURA;
    const rBase = Math.max(radioEn(y) - encoger, 0.0001);
    const desvio = inclinacion(t);

    for (let i = 0; i <= segmentosU; i += 1) {
      const theta = (i / segmentosU) * Math.PI * 2;

      const r = rBase + nervadura(theta, t) * relieve;

      // Sección elíptica: ancho completo en X, comprimida en Z.
      const x = Math.cos(theta) * r + desvio;
      const z = Math.sin(theta) * r * APLANADO;

      posiciones.push(x, y, z);
      uvs.push(i / segmentosU, t);
    }
  }

  const fila = segmentosU + 1;
  for (let j = 0; j < segmentosV; j += 1) {
    for (let i = 0; i < segmentosU; i += 1) {
      const a = j * fila + i;
      const b = a + fila;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Tapa el fondo del frasco, que la malla paramétrica deja abierto. */
export function construirBase(THREE, { segmentosU = 220 } = {}) {
  const rBase = PERFIL[1][0];
  const desvio = inclinacion(0);
  const posiciones = [desvio, 0, 0];
  const indices = [];

  for (let i = 0; i <= segmentosU; i += 1) {
    const theta = (i / segmentosU) * Math.PI * 2;
    posiciones.push(
      Math.cos(theta) * rBase + desvio,
      0,
      Math.sin(theta) * rBase * APLANADO,
    );
    if (i > 0) indices.push(0, i, i + 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Dónde y con qué radio se apoya el atomizador. */
export const CUELLO = {
  y: ALTURA,
  radio: PERFIL[PERFIL.length - 1][0],
  desvio: inclinacion(1),
};
