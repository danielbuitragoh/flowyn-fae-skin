/**
 * Barra de navegación.
 *
 * Se vuelve opaca sólo cuando el visitante deja atrás el hero. La decisión
 * de fondo aquí es que la barra no compita con la entrada: durante la
 * primera pantalla es un elemento flotante casi invisible, y a partir de ahí
 * se convierte en herramienta.
 *
 * Observamos un centinela invisible al final del hero en lugar de escuchar
 * el evento de scroll: así el navegador nos avisa a nosotros y no gastamos
 * trabajo en cada fotograma.
 */
// Versión sin el tagline: a tamaño de barra, "ETHEREAL BEAUTY IN MOTION"
// se convierte en una mancha gris ilegible y ensucia el logotipo.
import logoFlowyn from '/assets/logo-flowyn-wordmark.svg?raw';
import isotipo from '/assets/isotipo-gota.svg?raw';

export function montarNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  const marca = nav.querySelector('[data-nav-logo]');
  if (marca) marca.innerHTML = logoFlowyn;

  const iso = nav.querySelector('[data-nav-iso]');
  if (iso) iso.innerHTML = isotipo;

  const centinela = document.querySelector('[data-centinela]');
  if (!centinela || !('IntersectionObserver' in window)) return;

  // El centinela va al final del hero, así que "no se ve" significa dos
  // cosas opuestas: que todavía no hemos llegado (está debajo del pliegue)
  // o que ya lo pasamos (está encima). Con `isIntersecting` a secas las dos
  // daban lo mismo, y la barra arrancaba compacta desde el primer píxel —
  // justo encima del hero, que es donde tenía que ser transparente.
  const observador = new IntersectionObserver(
    ([entrada]) => nav.classList.toggle('compacta', entrada.boundingClientRect.top <= 0),
    { threshold: 0 }
  );
  observador.observe(centinela);
}
