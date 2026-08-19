/**
 * Receptor de eventos de Wompi.
 *
 * Cuando una transacción cambia de estado, Wompi avisa aquí. Éste es el único
 * sitio donde un pedido pasa de "pendiente" a "aprobado", y es deliberado:
 * la página de regreso NO sirve para eso. A la clienta la devuelve el
 * navegador, y un navegador puede visitar cualquier URL — si el estado se
 * marcara desde ahí, bastaría con abrir la dirección de regreso a mano para
 * darse un pedido por pagado. Lo que llega por aquí viene de Wompi y trae
 * firma.
 *
 * La verificación no es opcional: sin ella este endpoint es un botón público
 * para aprobar pedidos ajenos. Se compara el checksum que manda Wompi con el
 * que calculamos nosotros usando el secreto de eventos, que sólo conocen
 * Wompi y este servidor.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sha256Hex } from '../_compartido/catalogo.ts';

/** Wompi habla de estados de transacción; la tabla habla de estados de pedido. */
const ESTADOS: Record<string, string> = {
  APPROVED: 'aprobado',
  DECLINED: 'rechazado',
  ERROR: 'rechazado',
  VOIDED: 'anulado',
  PENDING: 'pendiente',
};

/** Lee `a.b.c` dentro del objeto del evento, que es como vienen las propiedades firmadas. */
function porRuta(objeto: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>(
    (nodo, clave) => (nodo == null ? undefined : (nodo as Record<string, unknown>)[clave]),
    objeto,
  );
}

/**
 * Comparación en tiempo constante.
 *
 * Con `===` el tiempo de respuesta depende de cuántos caracteres coinciden, y
 * eso deja adivinar el checksum byte a byte a base de medir. Es un ataque
 * remoto poco práctico, pero la defensa cuesta cuatro líneas.
 */
function igualSinFiltrarTiempo(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const SECRETO_EVENTOS = Deno.env.get('WOMPI_SECRETO_EVENTOS');
  const URL_SUPABASE = Deno.env.get('SUPABASE_URL');
  const LLAVE_SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SECRETO_EVENTOS || !URL_SUPABASE || !LLAVE_SERVICIO) {
    console.error('[flowyn] Faltan variables de entorno para recibir eventos.');
    return new Response('No configurado', { status: 500 });
  }

  let evento: {
    event?: string;
    data?: { transaction?: { id?: string; status?: string; reference?: string } };
    timestamp?: number;
    signature?: { checksum?: string; properties?: string[] };
  };
  try {
    evento = await peticion.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  const propiedades = evento.signature?.properties;
  const checksumRecibido = evento.signature?.checksum;

  if (!Array.isArray(propiedades) || !checksumRecibido || evento.timestamp == null) {
    return new Response('Evento sin firma', { status: 400 });
  }

  // El orden lo manda Wompi en `properties`; concatenamos exactamente en ése,
  // luego el timestamp y al final el secreto.
  const concatenado =
    propiedades.map((ruta) => String(porRuta(evento, ruta) ?? '')).join('') +
    String(evento.timestamp) +
    SECRETO_EVENTOS;

  const checksumCalculado = await sha256Hex(concatenado);

  if (!igualSinFiltrarTiempo(checksumCalculado.toLowerCase(), checksumRecibido.toLowerCase())) {
    console.warn('[flowyn] Evento con firma que no cuadra. Se descarta.');
    return new Response('Firma inválida', { status: 401 });
  }

  const transaccion = evento.data?.transaction;
  const referencia = transaccion?.reference;
  const estadoWompi = transaccion?.status;

  if (!referencia || !estadoWompi) return new Response('ok', { status: 200 });

  const estado = ESTADOS[estadoWompi];
  if (!estado) {
    console.warn(`[flowyn] Estado desconocido de Wompi: ${estadoWompi}`);
    return new Response('ok', { status: 200 });
  }

  const servidor = createClient(URL_SUPABASE, LLAVE_SERVICIO, {
    auth: { persistSession: false },
  });

  // `neq('estado', 'aprobado')` es la red de seguridad contra los reintentos:
  // Wompi reenvía un evento hasta tres veces si no recibe un 200, y también
  // pueden llegar desordenados. Un pedido ya aprobado no vuelve atrás.
  const { error } = await servidor
    .from('pedidos')
    .update({ estado })
    .eq('referencia', referencia)
    .neq('estado', 'aprobado');

  if (error) {
    // Se devuelve 500 a propósito: así Wompi reintenta más tarde en lugar de
    // dar el aviso por entregado y dejar el pedido colgado en "pendiente".
    console.error('[flowyn] No se pudo actualizar el pedido.', error);
    return new Response('Error al guardar', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
