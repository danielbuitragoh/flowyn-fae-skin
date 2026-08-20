/**
 * Ir a pagar.
 *
 * Todo lo que hace este archivo es pedirle al servidor que cree el pedido y
 * devolver la dirección a la que hay que llevar a la clienta. Deliberadamente
 * no calcula nada: si el navegador pudiera decir cuánto se cobra, la firma
 * del pago no valdría de nada. El total que se ve en el panel es informativo;
 * el que se cobra lo decide `supabase/funciones/crear-pedido`.
 *
 * Tampoco se manda el precio, ni el subtotal, ni el coste del envío. Sólo qué
 * producto y cuántos, la ciudad, y los datos de a dónde llevarlo. Cuanto
 * menos viaje desde aquí, menos hay que desconfiar allí.
 */

import { nube, hayNube } from './nube.js';

/** Dónde vuelve la clienta después de pagar. */
export function urlDeRegreso() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

/**
 * Crea el pedido y devuelve a dónde ir.
 *
 * Devuelve `{ ok, url, referencia }` o `{ ok: false, motivo, mensaje }`.
 * `motivo` está pensado para que la interfaz decida qué hacer —mandar a
 * entrar, por ejemplo— sin tener que leer el texto del mensaje.
 */
export async function irAPagar({ lineas, ciudad, envio }) {
  if (!hayNube()) {
    return { ok: false, motivo: 'sin_nube', mensaje: 'La tienda todavía no está conectada.' };
  }

  const cliente = await nube();
  if (!cliente) {
    return { ok: false, motivo: 'sin_nube', mensaje: 'La tienda todavía no está conectada.' };
  }

  // Se comprueba aquí antes de llamar para poder decir "entra primero" sin
  // gastar un viaje al servidor — pero el servidor lo vuelve a comprobar,
  // porque esta comprobación vive en un sitio que la clienta controla.
  const { data: { session } } = await cliente.auth.getSession();
  if (!session) {
    return {
      ok: false,
      motivo: 'sin_sesion',
      mensaje: 'Entra en tu cuenta para poder guardar el pedido.',
    };
  }

  try {
    const { data, error } = await cliente.functions.invoke('crear-pedido', {
      body: {
        lineas: lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })),
        ciudad,
        // A dónde se manda. Lo valida el servidor otra vez: aquí se revisa
        // para poder avisar junto al campo, allí para que no entre un pedido
        // pagado con una dirección que no sirve.
        envio,
      },
    });

    if (error) {
      // `functions.invoke` mete el cuerpo del error dentro de la respuesta;
      // sin leerlo, un 503 "todavía no hay pagos" y un 500 de verdad se le
      // enseñarían igual a la clienta.
      const detalle = await leerError(error);
      return {
        ok: false,
        motivo: detalle?.codigo ?? 'fallo',
        mensaje: detalle?.error ?? 'No se pudo abrir el pago. Inténtalo otra vez.',
      };
    }

    if (!data?.url) {
      return { ok: false, motivo: 'fallo', mensaje: 'El servidor no devolvió el enlace de pago.' };
    }

    return { ok: true, url: data.url, referencia: data.referencia, total: data.total };
  } catch (e) {
    console.warn('[flowyn] Fallo al crear el pedido.', e);
    return { ok: false, motivo: 'red', mensaje: 'No hay conexión. Inténtalo en un momento.' };
  }
}

async function leerError(error) {
  try {
    return await error.context.json();
  } catch {
    return null;
  }
}

/**
 * Estado de un pedido por su referencia.
 *
 * Se usa al volver de Wompi. El estado real lo escribe el aviso que Wompi
 * manda al servidor, no esta consulta: aquí sólo se lee lo que ya haya.
 */
export async function estadoDelPedido(referencia) {
  const cliente = await nube();
  if (!cliente) return null;

  const { data, error } = await cliente
    .from('pedidos')
    .select('referencia, estado, total, ciudad, creado_en')
    .eq('referencia', referencia)
    .maybeSingle();

  if (error) {
    console.warn('[flowyn] No se pudo leer el pedido.', error.message);
    return null;
  }
  return data;
}
