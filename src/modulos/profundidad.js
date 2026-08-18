/**
 * Profundidad por paralaje en el hero.
 *
 * El frasco vuelve a ser la fotografía —que es el producto de verdad, con
 * su vidrio y sus nervaduras— pero plana se queda corta para abrir la
 * página. La solución no es fingir un objeto 3D, sino tratar la escena
 * como lo que es: varias capas a distinta distancia. Al mover el puntero,
 * cada una se desplaza en proporción a su profundidad, igual que el mundo
 * real cuando ladeas la cabeza.
 *
 * Los factores importan más que el efecto. Si todo se mueve igual, se lee
 * como una imagen que tiembla. La jerarquía es: el fondo apenas respira,
 * el frasco se mueve poco porque está cerca, y los destellos —que están
 * delante— se mueven más. Esa diferencia es la que produce la sensación
 * de espacio.
 *
 * El seguimiento va con interpolación en cada fotograma en lugar de saltar
 * al valor del puntero: un objeto con masa no se teletransporta, y ese
 * pequeño retraso es lo que separa "caro" de "reactivo".
 */

const CAPAS = [
  // selector,             desplazamiento máximo en píxeles
  ['[data-capa="velo"]', 8],
  ['[data-capa="halo"]', 16],
  ['[data-capa="frasco"]', 26],
  ['[data-capa="destellos"]', 40],
];

/** Giro máximo del frasco, en grados. Pasando de ~7 deja de leerse como
 *  perspectiva y empieza a leerse como una imagen deformada. */
const GIRO_MAX = 6;

const interpolar = (a, b, k) => a + (b - a) * k;

export function iniciarProfundidad() {
  const escena = document.querySelector('[data-profundidad]');
  if (!escena) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // En táctil no hay puntero que seguir, y usar el giroscopio para esto
  // marea más de lo que aporta.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const capas = CAPAS
    .map(([sel, fuerza]) => ({ el: escena.querySelector(sel), fuerza }))
    .filter((c) => c.el);
  if (!capas.length) return;

  const frasco = escena.querySelector('[data-capa="frasco"]');

  // Objetivo = a dónde apunta el ratón. Actual = dónde está la escena.
  // La distancia entre ambos es la inercia.
  let objetivoX = 0;
  let objetivoY = 0;
  let actualX = 0;
  let actualY = 0;
  let dentro = false;
  let corriendo = true;

  const alMover = (e) => {
    const caja = escena.getBoundingClientRect();
    // -1 a 1 con el centro de la escena en cero.
    objetivoX = ((e.clientX - caja.left) / caja.width - 0.5) * 2;
    objetivoY = ((e.clientY - caja.top) / caja.height - 0.5) * 2;
    dentro = true;
  };

  // Al salir, la escena vuelve sola al centro en lugar de quedarse ladeada.
  const alSalir = () => { objetivoX = 0; objetivoY = 0; dentro = false; };

  const zona = escena.closest('.hero') ?? escena;
  zona.addEventListener('pointermove', alMover);
  zona.addEventListener('pointerleave', alSalir);

  const marco = () => {
    if (!corriendo) return;
    requestAnimationFrame(marco);

    // Coeficiente bajo: el retraso es el efecto, no un defecto.
    actualX = interpolar(actualX, objetivoX, 0.065);
    actualY = interpolar(actualY, objetivoY, 0.065);

    // Por debajo de medio píxel el ojo no lo distingue: dejamos de escribir
    // en el DOM y el navegador puede descansar.
    if (!dentro && Math.abs(actualX) < 0.002 && Math.abs(actualY) < 0.002) return;

    for (const { el, fuerza } of capas) {
      el.style.setProperty('--par-x', `${(-actualX * fuerza).toFixed(2)}px`);
      el.style.setProperty('--par-y', `${(-actualY * fuerza).toFixed(2)}px`);
    }

    if (frasco) {
      // El giro acompaña al desplazamiento: el frasco no sólo se mueve,
      // enseña un poco el costado hacia el que se inclina.
      frasco.style.setProperty('--par-giro-y', `${(actualX * GIRO_MAX).toFixed(2)}deg`);
      frasco.style.setProperty('--par-giro-x', `${(-actualY * GIRO_MAX * 0.55).toFixed(2)}deg`);
    }
  };
  requestAnimationFrame(marco);

  return {
    destruir() {
      corriendo = false;
      zona.removeEventListener('pointermove', alMover);
      zona.removeEventListener('pointerleave', alSalir);
    },
  };
}
