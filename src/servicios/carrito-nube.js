/**
 * El carrito, guardado en la cuenta.
 *
 * Implementa el mismo contrato que el almacén local de `carrito.js`:
 * `leer()` y `escribir(datos)`. Nada más. Esa es toda la superficie que el
 * carrito necesita conocer de la nube.
 *
 * No hay `usuario_id` en las escrituras porque lo pone la política RLS —
 * mejor dicho, porque la política exige que coincida con `auth.uid()`, así
 * que el valor tiene que ir, pero no puede ser otro que el propio. Va
 * explícito para que `upsert` sepa sobre qué fila trabaja.
 */

import { nube } from './nube.js';

export function almacenNube(usuarioId) {
  return {
    nombre: 'nube',

    async leer() {
      const cliente = await nube();
      if (!cliente) return null;

      const { data, error } = await cliente
        .from('carritos')
        .select('lineas, ciudad')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (error) {
        console.warn('[flowyn] No se pudo leer el carrito de la cuenta.', error.message);
        return null;
      }
      return data;
    },

    async escribir({ lineas, ciudad }) {
      const cliente = await nube();
      if (!cliente) return;

      const { error } = await cliente
        .from('carritos')
        .upsert(
          { usuario_id: usuarioId, lineas, ciudad },
          { onConflict: 'usuario_id' },
        );

      if (error) {
        console.warn('[flowyn] No se pudo guardar el carrito en la cuenta.', error.message);
      }
    },
  };
}

/**
 * Pedidos de la clienta, con sus líneas.
 *
 * Una sola consulta con junta anidada en lugar de una por pedido: el
 * historial es una pantalla, no debería costar N viajes a la base.
 *
 * Devuelve `{ ok, pedidos }` en lugar de una lista a secas porque "no
 * tienes pedidos" y "no he podido preguntarlo" son cosas distintas y la
 * pantalla tiene que poder decir cuál de las dos es. Con una lista vacía
 * para ambos casos, un fallo de red se le enseñaría a la clienta como un
 * historial en blanco — que es mentir con la interfaz.
 *
 * El corte a los 8 segundos existe por lo mismo: una consulta colgada
 * dejaría "Buscando tus pedidos…" para siempre, y una espera infinita es
 * la peor forma de fallar, porque nunca llega a parecer un fallo.
 */
export async function misPedidos() {
  const cliente = await nube();
  if (!cliente) return { ok: false, pedidos: [] };

  const { data, error } = await cliente
    .from('pedidos')
    .select(`
      id, referencia, estado, subtotal, envio, total, ciudad, creado_en,
      lineas:lineas_pedido ( nombre, formato, precio_unitario, cantidad )
    `)
    .order('creado_en', { ascending: false })
    .limit(20)
    .abortSignal(AbortSignal.timeout(8000));

  if (error) {
    console.warn('[flowyn] No se pudo leer el historial.', error.message);
    return { ok: false, pedidos: [] };
  }
  return { ok: true, pedidos: data ?? [] };
}
