/**
 * La vuelta de la pasarela de pago.
 *
 * Wompi devuelve a la clienta a la portada con `?ref=` en la dirección. Este
 * módulo lo detecta, busca ese pedido y le cuenta cómo quedó.
 *
 * Lo que NO hace, y es lo importante: no da nada por pagado. El estado del
 * pedido lo escribe el aviso firmado que Wompi manda al servidor, nunca esta
 * página — un navegador puede visitar cualquier dirección, así que si el
 * "aprobado" se decidiera aquí bastaría con escribir la URL a mano para
 * regalarse un pedido. Aquí sólo se lee lo que ya haya en la base.
 *
 * De ahí que consulte varias veces: el aviso de Wompi y el regreso de la
 * clienta son dos viajes distintos por internet y no siempre llega antes el
 * que debería. En lugar de enseñar "pendiente" y quedarse tan tranquilo,
 * vuelve a preguntar unas cuantas veces mientras la clienta lee.
 */

import { crearModal } from './modal.js';
import { estadoDelPedido } from '../servicios/pago.js';
import { hayNube } from '../servicios/nube.js';
import { formatearPrecio } from '../datos/catalogo.js';
import { vaciar } from './carrito.js';

const ESPERAS = [0, 1500, 3000, 5000, 8000];   // ms entre consultas

const TEXTOS = {
  aprobado: {
    titulo: 'Tu pedido está confirmado',
    cuerpo: 'Recibimos tu pago. Te escribiremos al correo de tu cuenta con el seguimiento del envío.',
  },
  pendiente: {
    titulo: 'Tu pago se está confirmando',
    cuerpo: 'Algunos medios de pago tardan unos minutos. Puedes cerrar esta ventana: el pedido queda guardado en tu cuenta y ahí verás cuando cambie.',
  },
  rechazado: {
    titulo: 'El pago no se completó',
    cuerpo: 'El banco no autorizó la transacción y no se te cobró nada. Puedes intentarlo otra vez con otro medio de pago.',
  },
  anulado: {
    titulo: 'El pago se anuló',
    cuerpo: 'La transacción se canceló y no se te cobró nada.',
  },
};

export function iniciarRegreso() {
  const panel = document.querySelector('[data-regreso]');
  const velo = document.querySelector('[data-velo-regreso]');
  const cuerpo = panel?.querySelector('[data-regreso-cuerpo]');
  if (!panel || !cuerpo) return;

  const parametros = new URLSearchParams(window.location.search);
  // La referencia viene en la dirección, pero si Wompi la recortara o la
  // clienta llegara por otro camino, queda la que guardamos al salir.
  let referencia = parametros.get('ref');
  if (!referencia) {
    try { referencia = sessionStorage.getItem('flowyn:pedido'); } catch { /* modo privado */ }
    // Sin `?ref` no hay regreso que mostrar: la guardada sola no basta, o el
    // panel saltaría en cada visita posterior de la misma pestaña.
    if (!parametros.has('ref')) referencia = null;
  }
  if (!referencia || !hayNube()) return;

  // La dirección se limpia antes de nada: si la clienta recarga o comparte el
  // enlace, no debería reaparecer una confirmación de un pedido viejo.
  const limpia = new URL(window.location.href);
  limpia.searchParams.delete('ref');
  limpia.searchParams.delete('id');
  window.history.replaceState({}, '', limpia);
  try { sessionStorage.removeItem('flowyn:pedido'); } catch { /* modo privado */ }

  const { abrir } = crearModal({ panel, velo });

  cuerpo.innerHTML = `
    <p class="regreso__etiqueta">Tu pedido</p>
    <h2 class="regreso__titulo" id="regreso-titulo">Buscando tu pedido…</h2>
    <p class="regreso__texto">Un momento.</p>`;
  abrir();

  consultar(referencia, cuerpo);
}

async function consultar(referencia, cuerpo) {
  let pedido = null;

  for (const espera of ESPERAS) {
    if (espera) await new Promise((r) => setTimeout(r, espera));
    pedido = await estadoDelPedido(referencia);
    // Se deja de preguntar en cuanto el estado ya no puede cambiar solo.
    if (pedido && pedido.estado !== 'pendiente') break;
    if (pedido) pintar(cuerpo, pedido, true);
  }

  if (!pedido) {
    cuerpo.innerHTML = `
      <p class="regreso__etiqueta">Tu pedido</p>
      <h2 class="regreso__titulo" id="regreso-titulo">No encontramos ese pedido</h2>
      <p class="regreso__texto">
        La referencia <strong>${referencia}</strong> no aparece en tu cuenta.
        Si te cobraron, escríbenos con esa referencia y lo revisamos.
      </p>`;
    return;
  }

  pintar(cuerpo, pedido, false);

  // La bandeja se vacía sólo cuando el pedido está pagado de verdad. Vaciarla
  // al volver, sin más, le borraría el carrito a quien canceló el pago y
  // quiere reintentar.
  if (pedido.estado === 'aprobado') vaciar();
}

function pintar(cuerpo, pedido, buscando) {
  const t = TEXTOS[pedido.estado] ?? TEXTOS.pendiente;
  cuerpo.innerHTML = `
    <p class="regreso__etiqueta">Tu pedido</p>
    <h2 class="regreso__titulo" id="regreso-titulo">${t.titulo}</h2>
    <p class="regreso__texto">${t.cuerpo}</p>

    <dl class="regreso__datos">
      <div><dt>Referencia</dt><dd>${pedido.referencia}</dd></div>
      <div><dt>Total</dt><dd>${formatearPrecio(pedido.total)}</dd></div>
      <div><dt>Estado</dt><dd data-estado="${pedido.estado}">${
        pedido.estado === 'aprobado' ? 'Pagado'
          : pedido.estado === 'pendiente' ? (buscando ? 'Confirmando…' : 'Pendiente de pago')
          : pedido.estado === 'rechazado' ? 'Rechazado' : 'Anulado'
      }</dd></div>
    </dl>

    <button type="button" class="boton boton--principal" data-cerrar>
      ${pedido.estado === 'aprobado' ? 'Seguir viendo' : 'Volver a la tienda'}
    </button>`;
}
