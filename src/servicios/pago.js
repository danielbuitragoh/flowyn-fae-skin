/**
 * Confirmar el pedido.
 *
 * Todo lo que hace este archivo es pedirle al servidor que cree el pedido y
 * devolver el enlace de WhatsApp donde se cierra. Deliberadamente no calcula
 * nada: si el navegador pudiera decir cuánto se cobra, el mensaje que llega
 * a WhatsApp no valdría de nada. El total que se ve en el panel es
 * informativo; el que aparece en el mensaje final lo decide
 * `supabase/funciones/crear-pedido`.
 *
 * Tampoco se manda el precio, ni el subtotal, ni el coste del envío. Sólo qué
 * producto y cuántos, la ciudad, y los datos de a dónde llevarlo. Cuanto
 * menos viaje desde aquí, menos hay que desconfiar allí.
 */

import { nube, hayNube } from './nube.js';

/**
 * Crea el pedido y devuelve el enlace de WhatsApp donde se confirma.
 *
 * Devuelve `{ ok, url, referencia, total }` o `{ ok: false, motivo, mensaje }`.
 * `motivo` está pensado para que la interfaz decida qué hacer —mandar a
 * entrar, por ejemplo— sin tener que leer el texto del mensaje.
 */
export async function confirmarPedido({ lineas, ciudad, envio }) {
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
        // con una dirección que no sirve.
        envio,
      },
    });

    if (error) {
      // `functions.invoke` mete el cuerpo del error dentro de la respuesta;
      // sin leerlo, un 503 "todavía no hay WhatsApp configurado" y un 500 de
      // verdad se le enseñarían igual a la clienta.
      const detalle = await leerError(error);
      return {
        ok: false,
        motivo: detalle?.codigo ?? 'fallo',
        mensaje: detalle?.error ?? 'No se pudo registrar el pedido. Inténtalo otra vez.',
      };
    }

    if (!data?.url) {
      return { ok: false, motivo: 'fallo', mensaje: 'El servidor no devolvió el enlace de WhatsApp.' };
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
