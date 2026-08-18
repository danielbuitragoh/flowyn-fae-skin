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

    if (id) conectarAlmacen(almacenNube(id));
    else desconectarAlmacen();
  });
}
