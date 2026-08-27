/**
 * Crear un pedido y prepararlo para cerrarse por WhatsApp.
 *
 * Esta función existe por la misma razón que cuando hablaba con Wompi: **el
 * monto no se puede confiar desde el cliente**. El navegador aquí sólo manda
 * identificadores y cantidades. Todo lo demás —precios, envío, total,
 * referencia y el mensaje que se manda a WhatsApp— se calcula de este lado,
 * contra el catálogo del servidor.
 *
 * Ya no hay pasarela de pago: el pedido se guarda con estado `recibido` y se
 * devuelve un enlace `wa.me` con el pedido ya redactado, para que la clienta
 * sólo tenga que pulsar "Enviar". El pago y su confirmación quedan fuera de
 * este código — se coordinan por chat, como en cualquier tienda pequeña que
 * despacha ella misma.
 *
 * La tabla `pedidos` no tiene política de inserción a propósito: ni siquiera
 * la clienta autenticada puede escribir en ella desde el navegador. La única
 * llave que puede es la de servicio, que vive en las variables de entorno de
 * esta función y en ningún otro sitio.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { calcularPedido, validarEnvio, ENVIOS } from '../_compartido/catalogo.ts';
import { hayCorreo, enviarCorreo, correoParaLaClienta, correoParaLaTienda } from '../_compartido/correo.ts';

const cors = (origen: string | null) => ({
  // El sitio se sirve desde GitHub Pages y desde localhost en desarrollo. Se
  // refleja el origen que venga en lugar de abrir con `*` porque la petición
  // lleva la cabecera de autorización de la clienta.
  'Access-Control-Allow-Origin': origen ?? '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const responder = (cuerpo: unknown, estado: number, origen: string | null) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors(origen), 'Content-Type': 'application/json' },
  });

/**
 * Referencia única del pedido.
 *
 * Ya no la exige una pasarela, pero sigue sirviendo para que la clienta y
 * Dan hablen del mismo pedido por chat sin ambigüedad ("el FAE-M1A2B3"),
 * y para que el historial de la cuenta tenga algo corto que mostrar.
 */
function nuevaReferencia(): string {
  const tiempo = Date.now().toString(36).toUpperCase();
  const azar = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `FAE-${tiempo}-${azar}`;
}

const pesos = (n: number) => '$ ' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

/**
 * El mensaje que la clienta manda por WhatsApp.
 *
 * Se redacta aquí, del lado del servidor, con los mismos datos que se
 * guardaron en `pedidos` — no con lo que mandó el navegador. Así el texto
 * que Dan recibe en el chat siempre coincide con lo que hay en la base,
 * aunque alguien hubiera intentado maquillar el carrito antes de enviar.
 */
function mensajeWhatsApp(params: {
  referencia: string;
  lineas: Array<{ nombre: string; formato: string; cantidad: number; precio_unitario: number }>;
  envio: number;
  envioGratis: boolean;
  total: number;
  ciudadNombre: string;
  datos: { destinatario: string; telefono: string; direccion: string; complemento: string; barrio: string; departamento: string; indicaciones: string };
}): string {
  const { referencia, lineas, envio, envioGratis, total, ciudadNombre, datos } = params;

  const filas = lineas
    .map((l) => `• ${l.nombre} ${l.formato}${l.cantidad > 1 ? ` ×${l.cantidad}` : ''} — ${pesos(l.precio_unitario * l.cantidad)}`)
    .join('\n');

  const destino = [datos.direccion, datos.complemento, datos.barrio, [ciudadNombre, datos.departamento].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ');

  return [
    `Hola, quiero confirmar mi pedido *${referencia}* de FAE SKIN:`,
    '',
    filas,
    `Envío (${ciudadNombre}): ${envioGratis ? 'Gratis' : pesos(envio)}`,
    `*Total: ${pesos(total)}*`,
    '',
    'Datos de envío:',
    datos.destinatario,
    destino,
    `Tel. ${datos.telefono}`,
    datos.indicaciones ? `Cómo llegar: ${datos.indicaciones}` : '',
  ].filter(Boolean).join('\n');
}

Deno.serve(async (peticion) => {
  const origen = peticion.headers.get('Origin');

  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: cors(origen) });
  if (peticion.method !== 'POST') {
    return responder({ error: 'Method not allowed' }, 405, origen);
  }

  // --- Configuración -------------------------------------------------------
  const URL_SUPABASE = Deno.env.get('SUPABASE_URL');
  const LLAVE_SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const WHATSAPP_NUMERO = Deno.env.get('WHATSAPP_NUMERO');

  if (!URL_SUPABASE || !LLAVE_SERVICIO) {
    return responder({ error: 'El servidor no está configurado.' }, 500, origen);
  }
  // Sin el número de WhatsApp no hay a dónde mandar el pedido. Se dice claro
  // en lugar de fallar con un 500 opaco: es el estado normal hasta que Dan
  // lo configure como secreto de esta función.
  if (!WHATSAPP_NUMERO) {
    return responder(
      { error: 'Los pedidos por WhatsApp todavía no están configurados en este entorno.', codigo: 'sin_pedidos' },
      503, origen,
    );
  }

  // --- Quién pide ----------------------------------------------------------
  // Se verifica el token contra Supabase en vez de leerlo: un JWT sin
  // verificar es un papelito que dice quién eres, escrito por ti.
  const autorizacion = peticion.headers.get('Authorization') ?? '';
  const comoClienta = createClient(URL_SUPABASE, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: autorizacion } },
  });
  const { data: { user }, error: errorUsuario } = await comoClienta.auth.getUser();

  if (errorUsuario || !user) {
    return responder(
      { error: 'Hay que entrar en la cuenta antes de pedir.', codigo: 'sin_sesion' },
      401, origen,
    );
  }

  // --- Qué pide ------------------------------------------------------------
  let cuerpo: { lineas?: unknown; ciudad?: unknown; envio?: unknown };
  try {
    cuerpo = await peticion.json();
  } catch {
    return responder({ error: 'El cuerpo de la petición no es JSON.' }, 400, origen);
  }

  const calculo = calcularPedido(cuerpo.lineas, cuerpo.ciudad);
  if ('error' in calculo) return responder({ error: calculo.error }, 400, origen);
  const { cuenta } = calculo;

  // Los datos de envío se validan aquí y no sólo en el formulario. El
  // formulario es una cortesía para quien escribe; esto es lo que impide que
  // llegue un pedido con la dirección en blanco, que es un pedido que no se
  // puede despachar y que sólo se descubre cuando ya se está coordinando el
  // envío por WhatsApp.
  const revision = validarEnvio(cuerpo.envio, cuenta.ciudad);
  if ('error' in revision) {
    return responder({ error: revision.error, codigo: 'envio_invalido' }, 400, origen);
  }
  const { envio } = revision;

  // --- Guardar el pedido ---------------------------------------------------
  const servidor = createClient(URL_SUPABASE, LLAVE_SERVICIO, {
    auth: { persistSession: false },
  });

  const referencia = nuevaReferencia();

  const { data: pedido, error: errorPedido } = await servidor
    .from('pedidos')
    .insert({
      usuario_id: user.id,
      referencia,
      estado: 'recibido',
      subtotal: cuenta.subtotal,
      envio: cuenta.envio,
      total: cuenta.total,
      ciudad: cuenta.ciudad,
      destinatario: envio.destinatario,
      telefono:     envio.telefono,
      departamento: envio.departamento,
      direccion:    envio.direccion,
      complemento:  envio.complemento || null,
      barrio:       envio.barrio || null,
      indicaciones: envio.indicaciones || null,
    })
    .select('id, referencia')
    .single();

  if (errorPedido || !pedido) {
    console.error('[flowyn] No se pudo crear el pedido.', errorPedido);
    return responder({ error: 'No se pudo registrar el pedido.' }, 500, origen);
  }

  const { error: errorLineas } = await servidor
    .from('lineas_pedido')
    .insert(cuenta.lineas.map((l) => ({ pedido_id: pedido.id, ...l })));

  if (errorLineas) {
    // Un pedido sin líneas es un pedido que nadie puede leer ni despachar.
    // Mejor borrarlo que dejar basura a medias en la tabla.
    console.error('[flowyn] No se pudieron guardar las líneas.', errorLineas);
    await servidor.from('pedidos').delete().eq('id', pedido.id);
    return responder({ error: 'No se pudo registrar el pedido.' }, 500, origen);
  }

  // --- Aviso por correo, si está configurado --------------------------------
  // Ya no depende de un webhook: se manda aquí mismo, apenas el pedido queda
  // guardado. Si falla, no debe tumbar la respuesta — la clienta ya tiene su
  // pedido registrado y su enlace de WhatsApp; el correo es un aviso extra.
  const ciudadVisible = cuenta.ciudad === 'otras' ? envio.departamento : ENVIOS[cuenta.ciudad].nombre;
  if (hayCorreo()) {
    try {
      const datosCorreo = {
        referencia,
        total: cuenta.total,
        subtotal: cuenta.subtotal,
        envio: cuenta.envio,
        destinatario: envio.destinatario,
        telefono: envio.telefono,
        direccion: envio.direccion,
        complemento: envio.complemento || null,
        barrio: envio.barrio || null,
        ciudad: ciudadVisible,
        ciudad_id: cuenta.ciudad,
        departamento: envio.departamento || null,
        indicaciones: envio.indicaciones || null,
        lineas: cuenta.lineas.map((l) => ({
          nombre: l.nombre, formato: l.formato, cantidad: l.cantidad, precio_unitario: l.precio_unitario,
        })),
      };
      if (user.email) {
        const carta = correoParaLaClienta(datosCorreo);
        enviarCorreo({ ...carta, para: user.email }).then((salida) => {
          if (!salida.ok) console.error('[flowyn] Correo a la clienta fallido:', referencia, salida.error);
        });
      }
      const aviso = Deno.env.get('CORREO_AVISO') ?? Deno.env.get('CORREO_USUARIO');
      if (aviso) {
        const carta = correoParaLaTienda(datosCorreo);
        enviarCorreo({ ...carta, para: aviso }).then((salida) => {
          if (!salida.ok) console.error('[flowyn] Aviso a la tienda fallido:', referencia, salida.error);
        });
      }
    } catch (e) {
      console.error('[flowyn] El aviso por correo falló entero.', e);
    }
  }

  // --- El enlace de WhatsApp -------------------------------------------------
  const mensaje = mensajeWhatsApp({
    referencia,
    lineas: cuenta.lineas,
    envio: cuenta.envio,
    envioGratis: cuenta.envio === 0,
    total: cuenta.total,
    ciudadNombre: ciudadVisible,
    datos: envio,
  });

  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;

  return responder({ referencia, total: cuenta.total, url }, 200, origen);
});
