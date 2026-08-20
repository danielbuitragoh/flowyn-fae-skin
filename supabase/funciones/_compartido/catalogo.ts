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

/* ==========================================================================
   DATOS DE ENVÍO
   Se validan en el servidor por la misma razón que los precios: lo que llega
   del navegador es una propuesta, no un hecho. Un pedido con la dirección en
   blanco o con un teléfono de cuatro dígitos es un pedido que no se puede
   despachar, y descubrirlo después de cobrar es peor que rechazarlo antes.
   ========================================================================== */

/** El departamento de cada ciudad que atendemos. Wompi lo pide como `region`. */
export const DEPARTAMENTOS: Record<string, string> = {
  bogota:       'Bogotá D.C.',
  medellin:     'Antioquia',
  cali:         'Valle del Cauca',
  barranquilla: 'Atlántico',
  cartagena:    'Bolívar',
  bucaramanga:  'Santander',
  otras:        '',   // lo escribe la clienta; ver `validarEnvio`
};

export type Envio = {
  destinatario: string;
  telefono: string;
  departamento: string;
  direccion: string;
  complemento: string;
  barrio: string;
  indicaciones: string;
};

const limpiar = (v: unknown, tope: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, tope) : '';

/**
 * Valida y normaliza los datos de envío.
 *
 * El teléfono se compara contra `^3\d{9}$`: en Colombia todos los celulares
 * empiezan por 3 y tienen diez dígitos. Se aceptan espacios y guiones al
 * escribirlo y se quitan aquí, porque rechazar "310 555 1234" por el espacio
 * es maltratar a quien lo escribió bien.
 *
 * No se pide código postal —es opcional en Colombia y casi nadie lo sabe— ni
 * cédula del destinatario: la exigen del remitente, y para PSE la pide el
 * propio checkout de Wompi.
 */
export function validarEnvio(bruto: unknown, ciudadId: string):
  { envio: Envio } | { error: string } {

  if (!bruto || typeof bruto !== 'object') {
    return { error: 'Faltan los datos de envío.' };
  }
  const d = bruto as Record<string, unknown>;

  const destinatario = limpiar(d.destinatario, 90);
  if (destinatario.length < 3) {
    return { error: 'Escribe el nombre de quien recibe el pedido.' };
  }

  const telefono = limpiar(d.telefono, 24).replace(/[\s()-]/g, '').replace(/^\+?57/, '');
  if (!/^3\d{9}$/.test(telefono)) {
    return { error: 'El celular debe tener diez dígitos y empezar por 3.' };
  }

  const direccion = limpiar(d.direccion, 160);
  if (direccion.length < 6) {
    return { error: 'Escribe la dirección completa, con número.' };
  }

  // Para las seis ciudades con tarifa propia el departamento lo sabemos
  // nosotros y no se acepta el que mande el navegador: si viniera "Bogotá" con
  // departamento "Amazonas", el paquete se despacharía mal por un dato que
  // teníamos correcto. Sólo "otra ciudad" lo escribe la clienta, porque ahí
  // somos nosotros los que no lo sabemos.
  let departamento = DEPARTAMENTOS[ciudadId] ?? '';
  if (ciudadId === 'otras') {
    departamento = limpiar(d.departamento, 60);
    if (departamento.length < 3) {
      return { error: 'Dinos el departamento y el municipio.' };
    }
  }

  return {
    envio: {
      destinatario,
      telefono,
      departamento,
      direccion,
      complemento: limpiar(d.complemento, 80),
      barrio: limpiar(d.barrio, 80),
      indicaciones: limpiar(d.indicaciones, 160),
    },
  };
}
