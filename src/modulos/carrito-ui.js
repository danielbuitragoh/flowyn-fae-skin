/**
 * Panel del carrito.
 *
 * Traduce el estado a pantalla y las acciones de la clienta a llamadas al
 * estado. No calcula precios ni decide tarifas: eso vive en `carrito.js`,
 * para que exista una sola respuesta a "cuánto cuesta esto".
 *
 * El panel es un diálogo modal de verdad, no una capa bonita: atrapa el
 * foco mientras está abierto, se cierra con Escape, devuelve el foco al
 * botón que lo abrió y bloquea el scroll de la página. Ese comportamiento
 * vive en `modal.js`, compartido con el panel de cuenta.
 */

import isotipo from '/assets/isotipo-gota.svg?raw';
import { PRODUCTO, MAX_UNIDADES, ENVIOS, ENVIO_GRATIS_DESDE, formatearPrecio } from '../datos/catalogo.js';
import {
  obtenerLineas, obtenerCiudad, totales, unidades, estaVacio,
  fijarCantidad, quitar, fijarCiudad, alCambiar,
} from './carrito.js';
import { crearModal, conFocoPreservado } from './modal.js';
import { irAPagar } from '../servicios/pago.js';

export function montarCarrito() {
  const panel = document.querySelector('[data-carrito]');
  const velo = document.querySelector('[data-velo-carrito]');
  if (!panel || !velo) return;

  const cuerpo = panel.querySelector('[data-carrito-cuerpo]');
  const pie = panel.querySelector('[data-carrito-pie]');
  const iso = panel.querySelector('[data-carrito-iso]');
  if (iso) iso.innerHTML = isotipo;

  let recienAgregado = false;

  const { abrir, cerrar } = crearModal({ panel, velo });

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
      <p class="carrito__aviso" data-malo="false" aria-live="polite">
        Pago seguro con Wompi. El total se calcula en el servidor.
      </p>`;
  }

  function pintar() {
    // Si el botón reaparece deshabilitado (bajaste a una unidad), el foco va
    // a su hermano en lugar de perderse en el vacío.
    conFocoPreservado(
      panel,
      ['mas', 'menos', 'quitar', 'ciudad'],
      () => { if (estaVacio()) pintarVacio(); else pintarLineas(); },
      { menos: 'mas', mas: 'menos', quitar: 'mas' },
    );
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

  pie.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-ir-al-pago]');
    if (!boton) return;

    const aviso = pie.querySelector('.carrito__aviso');
    const decir = (texto, malo = false) => {
      if (!aviso) return;
      aviso.textContent = texto;
      aviso.dataset.malo = malo ? 'true' : 'false';
    };

    // El botón se bloquea mientras dura la petición. Sin esto, dos clics
    // seguidos crean dos pedidos con dos referencias distintas y la clienta
    // acaba pagando el que no era.
    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Preparando el pago…';
    decir('Estamos creando tu pedido.');

    const resultado = await irAPagar({ lineas: obtenerLineas(), ciudad: obtenerCiudad() });

    if (resultado.ok) {
      // La referencia se guarda antes de salir: al volver de Wompi la página
      // se carga de cero y es lo único que queda para saber qué pedido era.
      try { sessionStorage.setItem('flowyn:pedido', resultado.referencia); } catch { /* modo privado */ }
      decir('Te llevamos a la pasarela de pago…');
      window.location.assign(resultado.url);
      return;
    }

    boton.disabled = false;
    boton.textContent = textoOriginal;

    if (resultado.motivo === 'sin_sesion') {
      decir('Entra en tu cuenta para poder guardar el pedido.', true);
      // La puerta se abre sola en vez de sólo decir dónde está.
      cerrar();
      document.querySelector('[data-abrir-cuenta]')?.click();
      return;
    }

    decir(resultado.mensaje, true);
  });

  /* --- Enlace con el estado ---------------------------------------------------- */

  alCambiar(({ motivo }) => {
    recienAgregado = motivo === 'agregar';
    pintar();
    // Sólo se abre solo cuando la clienta acaba de añadir algo. Entrar con
    // Google también cambia el carrito (se fusiona con el de la cuenta),
    // pero abrirle el panel en la cara al volver de Google sería una
    // interrupción, no una confirmación.
    if (motivo === 'agregar') abrir(document.querySelector('[data-abrir-carrito]'));
  });

  pintar();

  return { abrir, cerrar };
}
