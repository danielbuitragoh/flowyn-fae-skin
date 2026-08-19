/**
 * Pestañas del bloque de producto.
 *
 * Sigue el patrón de pestañas de WAI-ARIA, que no es decoración: una persona
 * con teclado espera que Tab la lleve *a la lista* de pestañas y que luego
 * las flechas cambien de una a otra, no que Tab recorra las tres. Sin eso,
 * unas pestañas son tres botones sueltos que resultan estar en fila.
 *
 * Activación automática (cambia al mover la flecha, sin pulsar Enter). Es lo
 * recomendado cuando los paneles ya están en la página y cambiar no cuesta
 * nada: aquí no hay ninguna carga que disparar.
 *
 * Los fragmentos antiguos se respetan. `#formula` y `#aroma` fueron secciones
 * propias y pueden estar guardados o compartidos por ahí; en vez de romperlos,
 * el módulo los reconoce, baja a la sección y abre la pestaña que toca.
 */

/** Qué pestaña abre cada fragmento heredado. */
const FRAGMENTOS = {
  '#frasco': 'pestana-objeto',
  '#objeto': 'pestana-objeto',
  '#producto': 'pestana-objeto',
  '#formula': 'pestana-formula',
  '#aroma': 'pestana-aroma',
};

export function iniciarPestanas() {
  const seccion = document.querySelector('[data-pestanas]');
  if (!seccion) return;

  const lista = seccion.querySelector('[role="tablist"]');
  const pestanas = [...seccion.querySelectorAll('[role="tab"]')];
  if (!lista || pestanas.length === 0) return;

  const panelDe = (pestana) => document.getElementById(pestana.getAttribute('aria-controls'));

  function activar(pestana, moverFoco = true) {
    for (const otra of pestanas) {
      const activa = otra === pestana;
      otra.setAttribute('aria-selected', String(activa));
      // Sólo la pestaña activa es alcanzable con Tab. Las otras se alcanzan
      // con las flechas, que es lo que hace que el grupo se comporte como un
      // control y no como tres botones sueltos.
      otra.tabIndex = activa ? 0 : -1;
      const panel = panelDe(otra);
      if (panel) panel.hidden = !activa;
    }
    if (moverFoco) pestana.focus();
  }

  lista.addEventListener('click', (e) => {
    const pestana = e.target.closest('[role="tab"]');
    if (!pestana) return;
    activar(pestana);
    mantenerALaVista();
  });

  lista.addEventListener('keydown', (e) => {
    const actual = pestanas.indexOf(document.activeElement);
    if (actual === -1) return;

    const saltos = { ArrowRight: 1, ArrowLeft: -1 };
    let destino = null;

    if (e.key in saltos) {
      // Da la vuelta en los extremos: al final de la fila, la siguiente es la
      // primera. Quedarse clavado en el borde se siente como un fallo.
      destino = (actual + saltos[e.key] + pestanas.length) % pestanas.length;
    } else if (e.key === 'Home') {
      destino = 0;
    } else if (e.key === 'End') {
      destino = pestanas.length - 1;
    }

    if (destino === null) return;
    e.preventDefault();
    activar(pestanas[destino]);
    mantenerALaVista();
  });

  /**
   * Al cambiar de pestaña el alto de la sección cambia mucho —la lámina del
   * envase es alta, el aroma es bajo— y si el panel encoge, el contenido de
   * abajo sube y la clienta se queda mirando otra parte de la página sin
   * haber hecho scroll. Cuando la fila de pestañas se ha ido por arriba, se
   * la devuelve a la vista.
   */
  function mantenerALaVista() {
    const caja = lista.getBoundingClientRect();
    if (caja.top >= 0) return;
    lista.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  /** Abre la pestaña que pida el fragmento de la dirección, si lo hay. */
  function porFragmento(desplazar) {
    const id = FRAGMENTOS[window.location.hash];
    if (!id) return;
    const pestana = document.getElementById(id);
    if (!pestana) return;

    // Sin mover el foco: al llegar por un enlace, el foco todavía no es de la
    // clienta, y robárselo la dejaría en un sitio que no pidió.
    activar(pestana, false);
    if (desplazar) {
      seccion.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }

  // Al cargar, el navegador ya intentó saltar a `#formula` y no encontró
  // nada, porque ese id ahora es una pestaña. Se corrige aquí.
  porFragmento(true);
  window.addEventListener('hashchange', () => porFragmento(true));
}
