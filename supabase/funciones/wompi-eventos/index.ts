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
import {
  hayCorreo, enviarCorreo, correoParaLaClienta, correoParaLaTienda,
} from '../_compartido/correo.ts';
import { ENVIOS, sha256Hex } from '../_compartido/catalogo.ts';

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
  // `.select()` para saber si esta llamada fue la que cambió el estado. Sin
  // eso no se puede distinguir "acabo de aprobar el pedido" de "ya estaba
  // aprobado y esto es el tercer reintento de Wompi", y la clienta recibiría
  // el mismo correo de confirmación tres veces.
  const { data: cambiados, error } = await servidor
    .from('pedidos')
    .update({ estado })
    .eq('referencia', referencia)
    .neq('estado', 'aprobado')
    .select('id');

  if (error) {
    // Se devuelve 500 a propósito: así Wompi reintenta más tarde en lugar de
    // dar el aviso por entregado y dejar el pedido colgado en "pendiente".
    console.error('[flowyn] No se pudo actualizar el pedido.', error);
    return new Response('Error al guardar', { status: 500 });
  }

  // El correo va después de guardar y nunca antes: primero que el pedido esté
  // aprobado en la base, y luego el aviso. Si se cayera el correo, se pierde
  // un aviso; si se cayera el guardado, se pierde el pedido.
  if (estado === 'aprobado' && cambiados && cambiados.length > 0) {
    await avisarDelPedido(servidor, referencia);
  }

  return new Response('ok', { status: 200 });
});

/** Cuánto tarda cada zona. Es lo que va en el correo como plazo prometido. */
const PLAZOS: Record<string, string> = {
  bogota: '2 a 4 días hábiles',
  medellin: '2 a 4 días hábiles',
  cali: '2 a 4 días hábiles',
  barranquilla: '3 a 5 días hábiles',
  cartagena: '3 a 5 días hábiles',
  bucaramanga: '3 a 5 días hábiles',
  otras: '4 a 7 días hábiles',
};

/**
 * Avisa por correo de que el pedido está pagado.
 *
 * Se mandan dos: uno a la clienta y otro a la tienda. El de la tienda no es
 * redundante — mientras el despacho sea manual, un pedido que nadie ve es un
 * pedido que no sale.
 *
 * Nada de esto puede hacer fallar el webhook. Si el correo no sale, el pedido
 * sigue pagado y aprobado en la base, que es lo que importa; se registra el
 * fallo y ya. Devolverle un error a Wompi por un problema de correo haría que
 * reintentara el evento entero.
 */
async function avisarDelPedido(servidor: ReturnType<typeof createClient>, referencia: string) {
  if (!hayCorreo()) {
    console.warn('[flowyn] Pedido aprobado pero el correo no está configurado:', referencia);
    return;
  }

  try {
    const { data: pedido, error } = await servidor
      .from('pedidos')
      .select('*, lineas_pedido(nombre, formato, cantidad, precio_unitario)')
      .eq('referencia', referencia)
      .single();

    if (error || !pedido) {
      console.error('[flowyn] No se pudo leer el pedido para el correo.', error);
      return;
    }

    // El correo de la clienta no está en `pedidos`: está en su cuenta.
    const { data: cuenta } = await servidor.auth.admin.getUserById(pedido.usuario_id);
    const destino = cuenta?.user?.email;

    const datos = {
      referencia: pedido.referencia,
      total: pedido.total,
      subtotal: pedido.subtotal,
      envio: pedido.envio,
      destinatario: pedido.destinatario,
      telefono: pedido.telefono,
      direccion: pedido.direccion,
      complemento: pedido.complemento,
      barrio: pedido.barrio,
      ciudad: ENVIOS[pedido.ciudad]?.nombre ?? pedido.ciudad,
      departamento: pedido.departamento,
      indicaciones: pedido.indicaciones,
      lineas: pedido.lineas_pedido ?? [],
    };

    const plazo = PLAZOS[pedido.ciudad] ?? '4 a 7 días hábiles';

    if (destino) {
      const carta = correoParaLaClienta(datos, plazo);
      const salida = await enviarCorreo({ ...carta, para: destino });
      if (!salida.ok) console.error('[flowyn] Correo a la clienta fallido:', referencia, salida.error);
    }

    const aviso = Deno.env.get('CORREO_AVISO') ?? Deno.env.get('CORREO_USUARIO');
    if (aviso) {
      const carta = correoParaLaTienda(datos);
      const salida = await enviarCorreo({ ...carta, para: aviso });
      if (!salida.ok) console.error('[flowyn] Aviso a la tienda fallido:', referencia, salida.error);
    }
  } catch (e) {
    console.error('[flowyn] El aviso por correo falló entero.', e);
  }
}
