/**
 * El catálogo, del lado del servidor.
 *
 * Estos números están repetidos a propósito. En `src/datos/catalogo.js` viven
 * los mismos, y duplicar datos normalmente es un error — aquí es el punto.
 *
 * El navegador puede mentir. Cualquiera con la consola abierta puede pedir un
 * frasco a mil pesos si el precio viaja desde el cliente, así que el servidor
 * no acepta precios: acepta identificadores y cantidades, y vuelve a calcular
 * todo desde esta copia, que la clienta no puede tocar. Un catálogo
 * compartido por import no serviría: si el servidor leyera el mismo archivo
 * que el navegador, seguiría confiando en algo que el navegador puede
 * reemplazar.
 *
 * Para que las dos copias no se separen en silencio, `npm run verificar`
 * compara las cifras y falla la construcción si dejan de coincidir. Ese
 * script es el que hace que esta duplicación sea segura en vez de una bomba
 * de relojería.
 */

export const PRODUCTOS: Record<string, {
  nombre: string;
  formato: string;
  precio: number;
}> = {
  'fae-skin-100': {
    nombre: 'FAE SKIN',
    formato: '100 ml',
    precio: 89900,
  },
};

/** Nadie necesita doce frascos de bruma facial. */
export const MAX_UNIDADES = 6;

export const ENVIOS: Record<string, { nombre: string; tarifa: number }> = {
  bogota:       { nombre: 'Bogotá',        tarifa: 12900 },
  medellin:     { nombre: 'Medellín',      tarifa: 12900 },
  cali:         { nombre: 'Cali',          tarifa: 12900 },
  barranquilla: { nombre: 'Barranquilla',  tarifa: 14900 },
  cartagena:    { nombre: 'Cartagena',     tarifa: 14900 },
  bucaramanga:  { nombre: 'Bucaramanga',   tarifa: 14900 },
  otras:        { nombre: 'Otra ciudad de Colombia', tarifa: 18900 },
};

export const ENVIO_GRATIS_DESDE = 150000;

export type LineaPedida = { id: string; cantidad: number };

export type Cuenta = {
  lineas: Array<{
    producto_id: string;
    nombre: string;
    formato: string;
    precio_unitario: number;
    cantidad: number;
  }>;
  subtotal: number;
  envio: number;
  total: number;
  ciudad: string;
};

/**
 * Recalcula el pedido entero desde cero.
 *
 * Devuelve `{ error }` en vez de lanzar porque todos los fallos posibles aquí
 * son culpa del dato que llegó, no del servidor: merecen un 400 con un motivo
 * legible, no un 500.
 */
export function calcularPedido(
  lineasPedidas: unknown,
  ciudadPedida: unknown,
): { error: string } | { cuenta: Cuenta } {
  if (!Array.isArray(lineasPedidas) || lineasPedidas.length === 0) {
    return { error: 'El carrito llegó vacío.' };
  }
  if (typeof ciudadPedida !== 'string' || !(ciudadPedida in ENVIOS)) {
    return { error: 'La ciudad de envío no es una de las que atendemos.' };
  }

  const lineas: Cuenta['lineas'] = [];
  const vistos = new Set<string>();

  for (const cruda of lineasPedidas) {
    const id = (cruda as LineaPedida)?.id;
    const cantidad = (cruda as LineaPedida)?.cantidad;

    if (typeof id !== 'string' || !(id in PRODUCTOS)) {
      return { error: 'Hay un producto que no existe en el catálogo.' };
    }
    // Sin esto, mandar la misma línea diez veces multiplicaría el tope.
    if (vistos.has(id)) {
      return { error: 'El mismo producto llegó repetido.' };
    }
    vistos.add(id);

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES) {
      return { error: `La cantidad tiene que ser un número entre 1 y ${MAX_UNIDADES}.` };
    }

    const producto = PRODUCTOS[id];
    lineas.push({
      producto_id: id,
      nombre: producto.nombre,
      formato: producto.formato,
      // El precio sale de aquí, nunca de lo que mandó el navegador.
      precio_unitario: producto.precio,
      cantidad,
    });
  }

  const subtotal = lineas.reduce((n, l) => n + l.precio_unitario * l.cantidad, 0);
  const envio = subtotal >= ENVIO_GRATIS_DESDE ? 0 : ENVIOS[ciudadPedida].tarifa;

  return {
    cuenta: { lineas, subtotal, envio, total: subtotal + envio, ciudad: ciudadPedida },
  };
}

/** SHA-256 en hexadecimal. Es lo que pide Wompi para la firma. */
export async function sha256Hex(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(resumen))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
