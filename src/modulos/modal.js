/**
 * Diálogo modal.
 *
 * Lo que hace que un panel deslizante sea un diálogo de verdad y no una capa
 * bonita: atrapa el foco mientras está abierto, se cierra con Escape,
 * devuelve el foco al botón que lo abrió, bloquea el scroll de detrás y se
 * marca `inert` cuando está cerrado para que no se pueda tabular dentro de
 * algo invisible.
 *
 * Vive aparte porque el carrito y la cuenta lo necesitan igual. Una trampa
 * de foco duplicada es una trampa de foco que se arregla una vez y se queda
 * rota en el otro sitio.
 *
 * No se usa `<dialog>` nativo a propósito: su `::backdrop` y su capa
 * superior chocan con el velo de bruma del sitio, que tiene que quedar por
 * encima del contenido pero por debajo del panel, y con la animación de
 * entrada. El comportamiento accesible se replica aquí entero.
 */

const FOCUSABLES =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Cuántos modales hay abiertos: el scroll se libera con el último. */
let abiertos = 0;

/**
 * ¿Este elemento se puede enfocar de verdad?
 *
 * Aquí había un error heredado que sólo se vio al escribir la prueba: el
 * filtro era `offsetParent !== null`, el truco habitual para "está
 * visible". No sirve en un panel `position: fixed`, porque un elemento
 * fijo no tiene `offsetParent` — devuelve `null` siempre, esté visible o
 * no. La trampa de foco creía que no había nada que atrapar y dejaba
 * tabular hacia la página de detrás.
 *
 * La pregunta se responde con `getClientRects()`: un elemento sin cajas no
 * ocupa sitio y no se puede enfocar. Es más tosco que `checkVisibility`,
 * pero acierta donde importa —descarta lo que está en `display: none`— y no
 * depende del estado de la transición de `visibility`, que en el primer
 * fotograma tras abrir el panel todavía dice "oculto" y hacía que la lista
 * saliera vacía justo cuando se necesitaba. Esta función sólo se llama con
 * el panel abierto, así que no hay ambigüedad que resolver.
 */
function esVisible(el) {
  return el.getClientRects().length > 0;
}

export function crearModal({ panel, velo, alAbrir, alCerrar }) {
  if (!panel) return null;

  let abridor = null;

  const estaAbierto = () => panel.dataset.abierto === 'true';

  const enfocables = () => [...panel.querySelectorAll(FOCUSABLES)].filter(esVisible);

  function abrir(disparador) {
    if (estaAbierto()) return;
    abridor = disparador ?? document.activeElement;

    panel.dataset.abierto = 'true';
    if (velo) velo.dataset.abierto = 'true';
    panel.removeAttribute('inert');

    abiertos += 1;
    document.body.style.overflow = 'hidden';

    alAbrir?.();

    // El primer elemento útil, no el título: quien abre el panel quiere
    // actuar sobre él.
    //
    // En el fotograma siguiente, no en éste. El panel pasa de
    // `visibility: hidden` a visible con el cambio de atributo, y enfocar
    // algo que el navegador todavía tiene por oculto no hace nada — falla
    // en silencio y el foco se queda donde estaba. Un fotograma es
    // imperceptible y quita toda la ambigüedad.
    requestAnimationFrame(() => {
      if (!estaAbierto()) return;
      enfocables()[0]?.focus();
    });
  }

  function cerrar() {
    if (!estaAbierto()) return;

    panel.dataset.abierto = 'false';
    if (velo) velo.dataset.abierto = 'false';
    panel.setAttribute('inert', '');

    abiertos = Math.max(0, abiertos - 1);
    if (abiertos === 0) document.body.style.overflow = '';

    abridor?.focus();
    abridor = null;
    alCerrar?.();
  }

  velo?.addEventListener('click', () => cerrar());
  panel.querySelector('[data-cerrar]')?.addEventListener('click', () => cerrar());

  document.addEventListener('keydown', (e) => {
    if (!estaAbierto()) return;

    if (e.key === 'Escape') { cerrar(); return; }
    if (e.key !== 'Tab') return;

    // Dentro de un modal, tabular no debe llevarte a la página de detrás,
    // que sigue ahí pero es inalcanzable visualmente.
    const focos = enfocables();
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primero.focus();
    }
  });

  panel.setAttribute('inert', '');
  panel.dataset.abierto = 'false';

  return { abrir, cerrar, estaAbierto, panel };
}

/**
 * Repinta conservando el foco del teclado.
 *
 * Un panel que se vuelve a dibujar entero en cada cambio es simple y
 * robusto, pero destruye el nodo que tuviera el foco. Para quien usa
 * teclado eso significa que al pulsar "+" el foco salta al principio del
 * documento y hay que volver a tabular hasta aquí — suficiente para hacer
 * la tienda inservible sin ratón.
 *
 * Se anota qué elemento estaba enfocado por su atributo `data-`, que
 * sobrevive al repintado porque describe la acción y no la instancia, y se
 * le devuelve el foco al equivalente del panel nuevo.
 *
 * @param {string[]} marcas  nombres de atributos `data-` que identifican
 *                           acciones, en orden de preferencia
 * @param {Object}   [respaldo]  a qué marca saltar si la original vuelve
 *                               deshabilitada (p. ej. menos → mas)
 */
export function conFocoPreservado(panel, marcas, dibujar, respaldo = {}) {
  const activo = document.activeElement;
  const marca = activo && panel.contains(activo)
    ? marcas.find((k) => activo.hasAttribute(`data-${k}`))
    : null;

  dibujar();

  if (!marca) return;
  const destino = panel.querySelector(`[data-${marca}]`);
  if (destino && !destino.disabled) { destino.focus(); return; }

  const alterna = respaldo[marca];
  if (alterna) panel.querySelector(`[data-${alterna}]`)?.focus();
}
