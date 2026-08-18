/**
 * Estado del carrito.
 *
 * Este módulo no toca el DOM. Guarda qué hay en el carrito, calcula los
 * totales y avisa a quien esté escuchando. La interfaz vive aparte, y esa
 * separación es la que permitirá más adelante mover la persistencia a
 * Supabase sin reescribir el panel: cambia de dónde salen los datos, no lo
 * que hace la tienda con ellos.
 *
 * De momento el almacén es `localStorage`. Es suficiente para que el
 * carrito sobreviva a un refresco o a cerrar la pestaña, que es lo que la
 * clienta espera. Lo que no sobrevive es cambiar de dispositivo — de ahí
 * que la Fase 3 traiga cuenta de usuario.
 */

import { PRODUCTO, MAX_UNIDADES, ENVIOS, ENVIO_GRATIS_DESDE, envioPorId } from '../datos/catalogo.js';

const CLAVE = 'flowyn.carrito.v1';

/* --- Estado ---------------------------------------------------------------- */

const estado = {
  lineas: [],           // [{ id, cantidad }]
  ciudad: ENVIOS[0].id,
};

const oyentes = new Set();

/* --- Persistencia -----------------------------------------------------------
   Toda lectura pasa por un saneado. El contenido de localStorage es
   editable por cualquiera desde la consola del navegador, así que se trata
   como entrada no confiable: si viene algo raro, se descarta en silencio y
   la tienda arranca vacía en lugar de romperse.                          */

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return;
    const datos = JSON.parse(crudo);

    if (Array.isArray(datos?.lineas)) {
      estado.lineas = datos.lineas
        .filter((l) => l && l.id === PRODUCTO.id)
        .map((l) => ({
          id: PRODUCTO.id,
          cantidad: Math.min(Math.max(Math.floor(Number(l.cantidad) || 0), 1), MAX_UNIDADES),
        }))
        .slice(0, 1);   // catálogo de un solo producto, por ahora
    }

    if (ENVIOS.some((e) => e.id === datos?.ciudad)) estado.ciudad = datos.ciudad;
  } catch {
    // Datos corruptos: mejor empezar limpio que arrastrar un error.
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Modo privado o cuota llena. El carrito sigue funcionando en memoria
    // durante la visita; sólo se pierde al cerrar. No es motivo para
    // interrumpir a nadie con un aviso.
  }
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

cargar();
