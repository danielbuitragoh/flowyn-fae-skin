/**
 * Panel del carrito.
 *
 * Traduce el estado a pantalla y las acciones de la clienta a llamadas al
 * estado. No calcula precios ni decide tarifas: eso vive en `carrito.js`,
 * para que exista una sola respuesta a "cuánto cuesta esto".
 *
 * El panel es un diálogo modal de verdad, no una capa bonita: atrapa el
 * foco mientras está abierto, se cierra con Escape, devuelve el foco al
 * botón que lo abrió y bloquea el scroll de la página. Quien navega con
 * teclado o con lector de pantalla se encuentra lo mismo que quien navega
 * con ratón, que es lo mínimo para una tienda.
 */

import isotipo from '/assets/isotipo-gota.svg?raw';
import { PRODUCTO, MAX_UNIDADES, ENVIOS, ENVIO_GRATIS_DESDE, formatearPrecio } from '../datos/catalogo.js';
import {
  obtenerLineas, obtenerCiudad, totales, unidades, estaVacio,
  fijarCantidad, quitar, fijarCiudad, alCambiar,
} from './carrito.js';

const FOCUSABLES = 'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])';

export function montarCarrito() {
  const panel = document.querySelector('[data-carrito]');
  const velo = document.querySelector('[data-velo-carrito]');
  if (!panel || !velo) return;

  const cuerpo = panel.querySelector('[data-carrito-cuerpo]');
  const pie = panel.querySelector('[data-carrito-pie]');
  const iso = panel.querySelector('[data-carrito-iso]');
  if (iso) iso.innerHTML = isotipo;

  let abridor = null;
  let recienAgregado = false;

  /* --- Apertura y cierre --------------------------------------------------- */

  const estaAbierto = () => panel.dataset.abierto === 'true';

  function abrir(disparador) {
    if (estaAbierto()) return;
    abridor = disparador ?? document.activeElement;
    panel.dataset.abierto = 'true';
    velo.dataset.abierto = 'true';
    panel.removeAttribute('inert');
    // Sin esto la página de detrás sigue desplazándose bajo el panel.
    document.body.style.overflow = 'hidden';
    // El primer elemento útil, no el título: quien abre el carrito quiere
    // actuar sobre él.
    const primero = panel.querySelector(FOCUSABLES);
    primero?.focus();
  }

  function cerrar() {
    if (!estaAbierto()) return;
    panel.dataset.abierto = 'false';
    velo.dataset.abierto = 'false';
    panel.setAttribute('inert', '');
    document.body.style.overflow = '';
    abridor?.focus();
    abridor = null;
  }

  panel.querySelector('[data-cerrar-carrito]')?.addEventListener('click', () => cerrar());
  velo.addEventListener('click', () => cerrar());

  document.addEventListener('keydown', (e) => {
    if (!estaAbierto()) return;

    if (e.key === 'Escape') { cerrar(); return; }

    // Trampa de foco: dentro de un modal, tabular no debe llevarte a la
    // página de detrás, que sigue ahí pero es inalcanzable visualmente.
    if (e.key !== 'Tab') return;
    const focos = [...panel.querySelectorAll(FOCUSABLES)].filter((el) => el.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primero.focus();
    }
  });

  document.querySelectorAll('[data-abrir-carrito]').forEach((b) => {
    b.addEventListener('click', () => abrir(b));
  });

  /* --- Pintado --------------------------------------------------------------- */

  function pintarVacio() {
    cuerpo.innerHTML = `
      <div class="carrito__vacio">
        <img src="${PRODUCTO.imagen}" alt="" aria-hidden="true" />
        <strong>Tu bandeja está lista</strong>
        <p>Cuando añadas FAE SKIN aparecerá aquí, con su envío y su total.</p>
      </div>`;
    pie.hidden = true;
  }

  function pintarLineas() {
    const lineas = obtenerLineas();

    cuerpo.innerHTML = lineas.map((l) => `
      <article class="linea${recienAgregado ? ' linea--nueva' : ''}">
        <div class="linea__foto">
          <img src="${l.producto.imagen}" alt="" aria-hidden="true" />
        </div>
        <div>
          <p class="linea__nombre">${l.producto.nombre}</p>
          <p class="linea__meta">${l.producto.descriptor} · ${l.producto.formato}</p>

          <div class="cantidad">
            <button type="button" data-menos="${l.id}"
                    aria-label="Quitar una unidad"${l.cantidad <= 1 ? ' disabled' : ''}>−</button>
            <!-- Sin aria-live: el anuncio lo da la región estable del pie.
                 Dos regiones vivas describiendo el mismo cambio hacen que
                 el lector lo lea dos veces. -->
            <output aria-label="Unidades">${l.cantidad}</output>
            <button type="button" data-mas="${l.id}"
                    aria-label="Añadir una unidad"${l.cantidad >= MAX_UNIDADES ? ' disabled' : ''}>+</button>
          </div>

          <div class="linea__pie">
            <span class="linea__precio">${formatearPrecio(l.producto.precio * l.cantidad)}</span>
            <button type="button" class="linea__quitar" data-quitar="${l.id}">Quitar</button>
          </div>
        </div>
      </article>
    `).join('') + pintarEnvio();

    pie.hidden = false;
    pintarResumen();
    recienAgregado = false;
  }

  function pintarEnvio() {
    const t = totales();
    const ciudad = obtenerCiudad();
    const avance = Math.min(100, (t.subtotal / ENVIO_GRATIS_DESDE) * 100);

    const opciones = ENVIOS.map((e) =>
      `<option value="${e.id}"${e.id === ciudad ? ' selected' : ''}>${e.nombre}</option>`).join('');

    const mensaje = t.envioGratis
      ? '<p><strong>Tu envío es gratis.</strong></p>'
      : `<p>Te faltan <strong>${formatearPrecio(t.faltaParaGratis)}</strong> para el envío gratis.</p>`;

    return `
      <div class="envio">
        <label class="envio__etiqueta" for="envio-ciudad">Ciudad de envío</label>
        <select id="envio-ciudad" data-ciudad>${opciones}</select>
        <p class="envio__plazo">Entrega estimada: ${t.zona.dias}.</p>

        <div class="progreso">
          <div class="progreso__pista">
            <div class="progreso__barra" style="--avance:${avance.toFixed(1)}%"></div>
          </div>
          ${mensaje}
        </div>
      </div>`;
  }

  function pintarResumen() {
    const t = totales();
    pie.innerHTML = `
      <div class="resumen">
        <div><span>Subtotal</span><span>${formatearPrecio(t.subtotal)}</span></div>
        <div>
          <span>Envío${t.envioGratis ? '' : ` · ${t.zona.nombre}`}</span>
          <span class="${t.envioGratis ? 'gratis' : ''}">${t.envioGratis ? 'Gratis' : formatearPrecio(t.envio)}</span>
        </div>
        <div class="resumen__total"><span>Total</span><span>${formatearPrecio(t.total)}</span></div>
      </div>

      <button type="button" class="boton boton--principal" data-ir-al-pago>Finalizar pedido</button>
      <p class="carrito__aviso">El pago llega en la siguiente fase del proyecto.</p>`;
  }

  /**
   * Repinta conservando el foco.
   *
   * El panel se vuelve a dibujar entero en cada cambio, lo que es simple y
   * robusto pero destruye el nodo que tuviera el foco. Para quien usa
   * teclado eso significa que al pulsar "+" el foco salta al principio del
   * documento y hay que volver a tabular hasta el carrito — suficiente para
   * hacer la tienda inservible sin ratón.
   *
   * Se anota qué elemento estaba enfocado por su atributo `data-`, que
   * sobrevive al repintado porque describe la acción y no la instancia, y
   * se le devuelve el foco al elemento equivalente del panel nuevo.
   */
  function conFocoPreservado(dibujar) {
    const activo = document.activeElement;
    const marca = activo && panel.contains(activo)
      ? ['mas', 'menos', 'quitar', 'ciudad'].find((k) => activo.hasAttribute(`data-${k}`))
      : null;

    dibujar();

    if (!marca) return;
    const destino = panel.querySelector(`[data-${marca}]`);
    // Si el botón reaparece deshabilitado (bajaste a una unidad), el foco va
    // a su hermano en lugar de perderse en el vacío.
    if (destino && !destino.disabled) destino.focus();
    else panel.querySelector(`[data-${marca === 'menos' ? 'mas' : 'menos'}]`)?.focus();
  }

  function pintar() {
    conFocoPreservado(() => {
      if (estaVacio()) pintarVacio();
      else pintarLineas();
    });
    actualizarContadores();
    anunciar();
  }

  /**
   * Anuncio para lectores de pantalla.
   *
   * Va en una región que no se repinta nunca. Poner el `aria-live` dentro
   * del contenido que se regenera no funciona: al sustituirse el nodo, la
   * región es nueva y muchos lectores no la anuncian.
   */
  function anunciar() {
    const region = panel.querySelector('[data-anuncio]');
    if (!region) return;
    const n = unidades();
    const t = totales();
    region.textContent = n === 0
      ? 'La bandeja está vacía.'
      : `${n} ${n === 1 ? 'unidad' : 'unidades'}. Total ${formatearPrecio(t.total)}.`;
  }

  function actualizarContadores() {
    const n = unidades();
    document.querySelectorAll('[data-cuenta-carrito]').forEach((el) => {
      el.textContent = String(n);
      el.dataset.vacio = n === 0 ? 'true' : 'false';
    });
  }

  /* --- Acciones ---------------------------------------------------------------
     Delegación en el contenedor: el contenido se vuelve a pintar entero en
     cada cambio, así que enganchar oyentes a cada botón dejaría un rastro
     de escuchas muertas.                                                   */

  cuerpo.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;

    const linea = obtenerLineas()[0];
    if (b.dataset.mas && linea) fijarCantidad(b.dataset.mas, linea.cantidad + 1);
    else if (b.dataset.menos && linea) fijarCantidad(b.dataset.menos, linea.cantidad - 1);
    else if (b.dataset.quitar) quitar(b.dataset.quitar);
  });

  cuerpo.addEventListener('change', (e) => {
    if (e.target.matches('[data-ciudad]')) fijarCiudad(e.target.value);
  });

  pie.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ir-al-pago]')) return;
    // Marcador de la Fase 4. Mejor decirlo que simular un pago que no
    // existe: una tienda que finge cobrar es peor que una que avisa.
    const aviso = pie.querySelector('.carrito__aviso');
    if (aviso) {
      aviso.textContent = 'El checkout con Wompi llega en la Fase 4 del proyecto.';
      aviso.style.color = 'var(--caoba-hondo)';
    }
  });

  /* --- Enlace con el estado ---------------------------------------------------- */

  alCambiar(({ motivo }) => {
    recienAgregado = motivo === 'agregar';
    pintar();
    if (motivo === 'agregar') abrir(document.querySelector('[data-abrir-carrito]'));
  });

  panel.setAttribute('inert', '');
  pintar();

  return { abrir, cerrar };
}
