/**
 * Atmósfera del hero: bruma y destellos.
 *
 * Se generan en JS en lugar de escribirlos a mano en el HTML por dos
 * razones: el marcado se mantiene legible (son decoración pura, no
 * contenido), y podemos sembrar posiciones y tiempos irregulares. La
 * irregularidad importa — una cuadrícula perfecta de partículas se lee
 * como interfaz; el desorden leve se lee como aire.
 */

const azar = (min, max) => min + Math.random() * (max - min);

/** Partículas que ascienden y se desvanecen, como bruma recién pulverizada. */
export function sembrarBruma(contenedor, cantidad = 16) {
  if (!contenedor) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fragmento = document.createDocumentFragment();

  for (let i = 0; i < cantidad; i += 1) {
    const p = document.createElement('span');
    p.className = 'particula';
    // Se concentran hacia la derecha, donde flota el frasco, para que la
    // bruma parezca salir de él y no del fondo de la página.
    p.style.left = `${azar(46, 92)}%`;
    p.style.setProperty('--tam', `${azar(3, 9).toFixed(1)}px`);
    p.style.setProperty('--vel', `${azar(11, 20).toFixed(1)}s`);
    p.style.setProperty('--retraso', `${azar(0, 14).toFixed(1)}s`);
    p.style.setProperty('--deriva', `${azar(-40, 55).toFixed(0)}px`);
    fragmento.appendChild(p);
  }

  contenedor.appendChild(fragmento);
}

/** Destellos de cuatro puntas: el motivo firma del manual de marca. */
export function sembrarDestellos(contenedor, cantidad = 9) {
  if (!contenedor) return;

  const fragmento = document.createDocumentFragment();

  for (let i = 0; i < cantidad; i += 1) {
    const d = document.createElement('span');
    d.className = 'destello';
    d.style.top = `${azar(8, 88)}%`;
    d.style.left = `${azar(4, 94)}%`;
    d.style.setProperty('--d', `${azar(7, 20).toFixed(0)}px`);
    d.style.setProperty('--vel', `${azar(4, 9).toFixed(1)}s`);
    d.style.setProperty('--retraso', `${azar(0, 5).toFixed(1)}s`);
    fragmento.appendChild(d);
  }

  contenedor.appendChild(fragmento);
}
