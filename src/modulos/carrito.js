/**
 * Estado del carrito.
 *
 * Este módulo no toca el DOM. Guarda qué hay en el carrito, calcula los
 * totales y avisa a quien esté escuchando. La interfaz vive aparte, y esa
 * separación es la que permitirá más adelante mover la persistencia a
 * Supabase sin reescribir el panel: cambia de dónde salen los datos, no lo
 * que hace la tienda con ellos.
 *
 * El almacén es intercambiable. Sin sesión es `localStorage`: suficiente
 * para que el carrito sobreviva a un refresco o a cerrar la pestaña. Con
 * sesión pasa a ser la tabla `carritos` de Supabase, y entonces sobrevive
 * también a cambiar de dispositivo. El resto del módulo no se entera de
 * cuál de los dos está activo, que era justamente el objetivo.
 */

import { PRODUCTO, MAX_UNIDADES, ENVIOS, ENVIO_GRATIS_DESDE, envioPorId } from '../datos/catalogo.js';

const CLAVE = 'flowyn.carrito.v1';

/* --- Estado ---------------------------------------------------------------- */

const estado = {
  lineas: [],           // [{ id, cantidad }]
  ciudad: ENVIOS[0].id,
};

const oyentes = new Set();

/* --- Saneado ----------------------------------------------------------------
   Toda lectura pasa por aquí, venga del navegador o de la base. El
   contenido de localStorage lo edita cualquiera desde la consola, y la fila
   de `carritos` la escribe la propia clienta, así que ninguno de los dos es
   una fuente confiable: si viene algo raro, se descarta en silencio y la
   tienda arranca vacía en lugar de romperse.

   El precio no se guarda nunca. Sale del catálogo cada vez que se calcula
   un total, y así un carrito manipulado no puede abaratar nada.        */

function sanearLineas(lineas) {
  if (!Array.isArray(lineas)) return [];
  return lineas
    .filter((l) => l && l.id === PRODUCTO.id)
    .map((l) => ({
      id: PRODUCTO.id,
      cantidad: Math.min(Math.max(Math.floor(Number(l.cantidad) || 0), 1), MAX_UNIDADES),
    }))
    .slice(0, 1);   // catálogo de un solo producto, por ahora
}

function sanearCiudad(ciudad, porDefecto = estado.ciudad) {
  return ENVIOS.some((e) => e.id === ciudad) ? ciudad : porDefecto;
}

/* --- Almacenes ---------------------------------------------------------------
   Un almacén es un objeto con `leer()` y `escribir(datos)`. El local es
   síncrono por dentro pero se expone como asíncrono para que los dos tengan
   la misma forma y el resto del módulo no distinga cuál está puesto.    */

const ALMACEN_LOCAL = {
  nombre: 'local',
  async leer() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;   // datos corruptos: mejor empezar limpio
    }
  },
  async escribir(datos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch {
      // Modo privado o cuota llena. El carrito sigue funcionando en memoria
      // durante la visita; sólo se pierde al cerrar. No es motivo para
      // interrumpir a nadie con un aviso.
    }
  },
};

let almacen = ALMACEN_LOCAL;

function guardar() {
  // Sin `await`: la clienta no debería esperar a la red para ver subir un
  // contador. Si la escritura falla, el estado en memoria ya es correcto y
  // el siguiente cambio lo reintenta.
  almacen.escribir({ lineas: estado.lineas, ciudad: estado.ciudad })
    ?.catch?.((e) => console.warn('[flowyn] No se pudo guardar el carrito.', e));
}

function cargarSincrono() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return;
    const datos = JSON.parse(crudo);
    estado.lineas = sanearLineas(datos?.lineas);
    estado.ciudad = sanearCiudad(datos?.ciudad);
  } catch {
    // Datos corruptos: mejor empezar limpio que arrastrar un error.
  }
}

/**
 * Cambia de almacén, fusionando lo que ya había.
 *
 * Ocurre al entrar con Google. Hay dos carritos posibles y ninguno se puede
 * tirar sin más: el de esta pestaña (alguien añadió el frasco y luego
 * decidió crear cuenta) y el de la nube (alguien lo añadió ayer desde el
 * móvil). Vaciar cualquiera de los dos se siente como una pérdida, así que
 * se queda la cantidad mayor — el gesto más reciente de la clienta, sea
 * cual sea, sobrevive.
 *
 * La ciudad la manda la nube si la tiene: es una preferencia guardada a
 * propósito, mientras que la local puede ser sólo el valor por defecto.
 */
export async function conectarAlmacen(nuevo) {
  const remoto = await nuevo.leer().catch(() => null);

  const lineasRemotas = sanearLineas(remoto?.lineas);
  const cantidadLocal = estado.lineas[0]?.cantidad ?? 0;
  const cantidadRemota = lineasRemotas[0]?.cantidad ?? 0;
  const mayor = Math.max(cantidadLocal, cantidadRemota);

  estado.lineas = mayor > 0 ? [{ id: PRODUCTO.id, cantidad: mayor }] : [];
  estado.ciudad = sanearCiudad(remoto?.ciudad, estado.ciudad);

  almacen = nuevo;
  avisar('almacen');   // guarda ya fusionado en el destino y repinta
}

/**
 * Vuelve al navegador. Ocurre al cerrar sesión.
 *
 * El carrito se vacía a propósito. Dejarlo puesto significaría que la
 * siguiente persona que abra ese ordenador encuentra la compra de otra, y
 * "cerrar sesión" tiene que querer decir lo que dice.
 */
export function desconectarAlmacen() {
  almacen = ALMACEN_LOCAL;
  estado.lineas = [];
  estado.ciudad = ENVIOS[0].id;
  avisar('salir');
}

/* --- Lectura --------------------------------------------------------------- */

export function obtenerLineas() {
  return estado.lineas.map((l) => ({ ...l, producto: PRODUCTO }));
}

export function obtenerCiudad() {
  return estado.ciudad;
}

export function unidades() {
  return estado.lineas.reduce((n, l) => n + l.cantidad, 0);
}

export function estaVacio() {
  return unidades() === 0;
}

/**
 * Totales del pedido.
 *
 * El envío se calcula aquí y no en el componente para que exista una única
 * respuesta a "cuánto cuesta esto": si la cifra se calculara en el panel y
 * otra vez en el checkout, tarde o temprano dejarían de coincidir.
 */
export function totales() {
  const subtotal = estado.lineas.reduce((s, l) => s + PRODUCTO.precio * l.cantidad, 0);
  const zona = envioPorId(estado.ciudad);

  const gratis = subtotal >= ENVIO_GRATIS_DESDE;
  const envio = estaVacio() || gratis ? 0 : zona.tarifa;

  return {
    subtotal,
    envio,
    envioGratis: gratis && !estaVacio(),
    faltaParaGratis: Math.max(ENVIO_GRATIS_DESDE - subtotal, 0),
    zona,
    total: subtotal + envio,
  };
}

/* --- Escritura ------------------------------------------------------------- */

function avisar(motivo) {
  guardar();
  for (const oyente of oyentes) oyente({ motivo, unidades: unidades() });
}

export function agregar(cantidad = 1) {
  const n = Math.max(Math.floor(Number(cantidad) || 1), 1);
  const linea = estado.lineas.find((l) => l.id === PRODUCTO.id);

  if (linea) {
    linea.cantidad = Math.min(linea.cantidad + n, MAX_UNIDADES);
  } else {
    estado.lineas.push({ id: PRODUCTO.id, cantidad: Math.min(n, MAX_UNIDADES) });
  }

  avisar('agregar');
}

export function fijarCantidad(id, cantidad) {
  const n = Math.floor(Number(cantidad) || 0);
  if (n <= 0) return quitar(id);

  const linea = estado.lineas.find((l) => l.id === id);
  if (!linea) return;

  linea.cantidad = Math.min(n, MAX_UNIDADES);
  avisar('cantidad');
}

export function quitar(id) {
  estado.lineas = estado.lineas.filter((l) => l.id !== id);
  avisar('quitar');
}

export function fijarCiudad(id) {
  if (!ENVIOS.some((e) => e.id === id)) return;
  estado.ciudad = id;
  avisar('ciudad');
}

/** Devuelve la función para dejar de escuchar, que es lo que evita fugas
 *  cuando un componente desaparece. */
export function alCambiar(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

cargarSincrono();
