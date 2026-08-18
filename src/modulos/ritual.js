/**
 * Sincroniza los pasos del ritual con la imagen fija.
 *
 * El problema a resolver: cinco bloques de texto pasan por delante de una
 * columna que no se mueve, y la imagen tiene que corresponder siempre al
 * paso que el visitante está leyendo. Enganchar esto al evento de scroll
 * obliga a recalcular posiciones en cada fotograma y se nota en móviles
 * modestos, que es justo el público de la marca.
 *
 * En su lugar observamos una banda estrecha en mitad de la pantalla. El
 * paso que la cruza es el que se está leyendo. El margen `-45%` arriba y
 * abajo deja activa una franja de aproximadamente el 10 % central: lo
 * bastante estrecha para que sólo haya un ganador, y lo bastante ancha
 * para que nunca queden todos apagados entre dos pasos.
 */

export function iniciarRitual() {
  const seccion = document.querySelector('[data-ritual]');
  if (!seccion) return;

  const pasos = [...seccion.querySelectorAll('[data-paso]')];
  const fotos = [...seccion.querySelectorAll('[data-foto-paso]')];
  const contador = seccion.querySelector('[data-contador]');
  if (!pasos.length) return;

  const activar = (indice) => {
    pasos.forEach((p, i) => p.classList.toggle('activo', i === indice));
    fotos.forEach((f, i) => f.classList.toggle('activa', i === indice));
    if (contador) contador.textContent = String(indice + 1).padStart(2, '0');
  };

  // Sin soporte —o con el movimiento reducido— mostramos el primer paso y
  // dejamos todos los textos legibles. Nadie se queda sin contenido.
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reducido) {
    pasos.forEach((p) => p.classList.add('activo'));
    if (fotos[0]) fotos[0].classList.add('activa');
    return;
  }

  activar(0);

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const indice = pasos.indexOf(entrada.target);
        if (indice !== -1) activar(indice);
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );

  pasos.forEach((p) => observador.observe(p));
}
