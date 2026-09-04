/**
 * Puente entre la sesión y el carrito.
 *
 * Ninguno de los dos módulos conoce al otro, y eso es intencionado: el
 * carrito sabe guardar en un almacén cualquiera, la sesión sabe quién
 * está dentro, y este archivo —el único que sabe las dos cosas— los
 * conecta. Si mañana la persistencia cambia de proveedor, se reescribe
 * esto y nada más.
 */

import { alCambiarSesion, usuario } from './sesion.js';
import { conectarAlmacen, desconectarAlmacen } from './carrito.js';
import { almacenNube } from '../servicios/carrito-nube.js';

export function sincronizarCarritoConSesion() {
  let conectadoA = null;
  // Testigo de generación: cada cambio de sesión invalida al anterior. Sirve
  // para que una conexión lenta que vuelve de la red sepa que su turno ya
  // pasó, en vez de pisar el estado de quien haya entrado —o salido—
  // mientras tanto.
  let generacion = 0;

  alCambiarSesion(({ listo }) => {
    if (!listo) return;

    const u = usuario();
    const id = u?.id ?? null;

    // Nada que hacer si el estado no ha cambiado de verdad. Sin esta
    // guarda, cada evento de la librería de auth dispararía otra fusión
    // del carrito, y fusionar dos veces con "la cantidad mayor gana" no
    // es idempotente en cuanto entra en juego una escritura a medias.
    if (id === conectadoA) return;
    conectadoA = id;
    const mia = ++generacion;

    if (id) {
      conectarAlmacen(almacenNube(id), () => mia === generacion).catch((e) => {
        console.warn('[flowyn] No se pudo conectar el carrito de la cuenta.', e);
        // Sin esto la sesión quedaría marcada como conectada pese a haber
        // fallado, y la guarda de arriba impediría cualquier reintento.
        if (mia === generacion) conectadoA = null;
      });
    } else {
      desconectarAlmacen();
    }
  });
}
