/**
 * Armar y desarmar la tapa del frasco.
 *
 * La marca fotografió la tapa suelta, aparte del cuerpo del frasco —dos
 * piezas de verdad, no una imagen recortada a la mitad—, así que el gesto
 * de "quitar y poner la tapa" se puede montar con la fotografía real.
 *
 * La primera versión de esto seguía el scroll de la página, pero el hero
 * ocupa casi toda la pantalla: para cuando la tapa terminaba de levantarse,
 * el scroll ya se había llevado el frasco fuera de la vista. El gesto de la
 * referencia (un vídeo donde la tapa sale y vuelve a entrar) no es algo que
 * pasa una vez de camino a otro sitio — es algo que se repite. Por eso aquí
 * responde al puntero: con uno fino, ya lo resuelve el CSS con `:hover`.
 * Este módulo sólo cubre lo que el CSS no puede solo — el toque, donde no
 * existe "pasar por encima", y el teclado, con foco y Enter/Espacio.
 */

export function iniciarArmado() {
  const zona = document.querySelector('.hero__flotante');
  if (!zona) return;

  zona.setAttribute('role', 'button');
  zona.setAttribute('tabindex', '0');
  zona.setAttribute('aria-pressed', 'false');
  zona.setAttribute('aria-label', 'Quitar la tapa del frasco');

  const alternar = () => {
    const abierta = zona.toggleAttribute('data-tapa-abierta');
    zona.setAttribute('aria-pressed', String(abierta));
    zona.setAttribute('aria-label', abierta ? 'Poner la tapa del frasco' : 'Quitar la tapa del frasco');
  };

  zona.addEventListener('click', alternar);
  zona.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    alternar();
  });
}
