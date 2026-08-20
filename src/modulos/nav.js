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

  montarMenu(nav);

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

/**
 * El menú de pantallas estrechas.
 *
 * Hasta ahora los enlaces de sección se ocultaban con `display:none` por
 * debajo de 760 px y no se sustituían por nada: en el móvil no había forma
 * de llegar al ritual, a la fórmula ni a comprar. Esto los devuelve.
 *
 * Un `disclosure` y no un menú ARIA: lo que se despliega es una lista de
 * enlaces normales. Ponerle `role="menu"` obligaría a implementar navegación
 * por flechas y a que un lector de pantalla anunciara un widget que no es.
 */
function montarMenu(nav) {
  const boton = nav.querySelector('[data-menu]');
  const panel = nav.querySelector('#nav-secciones');
  if (!boton || !panel) return;

  const etiqueta = boton.querySelector('[data-menu-etiqueta]');

  // El estado vive en `data-menu-abierto` y no en `data-menu`: el boton ya
  // usa `data-menu`, y poner el mismo nombre en la barra hacia que
  // `document.querySelector('[data-menu]')` devolviera la barra en vez del
  // boton. Dos cosas distintas, dos nombres distintos.
  function abrir(si) {
    nav.dataset.menuAbierto = si ? 'true' : 'false';
    boton.setAttribute('aria-expanded', String(si));
    if (etiqueta) etiqueta.textContent = si ? 'Cerrar el menú' : 'Abrir el menú';
  }

  boton.addEventListener('click', () => {
    abrir(boton.getAttribute('aria-expanded') !== 'true');
  });

  // Al elegir un destino el menú sobra: quien pulsó "El ritual" quiere ver
  // el ritual, no la lista otra vez tapándolo.
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a')) abrir(false);
  });

  // Escape cierra y devuelve el foco al botón. Sin lo segundo el foco se
  // queda dentro de un panel invisible y el siguiente tabulador salta a un
  // sitio que la persona no puede ver.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || boton.getAttribute('aria-expanded') !== 'true') return;
    abrir(false);
    boton.focus();
  });

  // Un toque fuera cierra, que es lo que espera cualquiera que haya usado
  // un menú desplegable antes.
  document.addEventListener('click', (e) => {
    if (boton.getAttribute('aria-expanded') !== 'true') return;
    if (!nav.contains(e.target)) abrir(false);
  });

  // Si la ventana se ensancha hasta que la fila vuelve a estar visible, el
  // estado "abierto" deja de tener sentido y hay que limpiarlo: si no, el
  // botón se queda anunciando `aria-expanded="true"` sin nada que expandir.
  const ancha = window.matchMedia('(min-width: 761px)');
  ancha.addEventListener('change', (e) => { if (e.matches) abrir(false); });

  abrir(false);
}
