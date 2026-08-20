/**
 * Crear un pedido y firmar el cobro.
 *
 * Esta función existe por una sola razón, y es la que justifica que la Fase 4
 * no se pudiera hacer sólo con JavaScript en el navegador: **el monto a
 * cobrar no se puede confiar desde el cliente**. Wompi pide una firma de
 * integridad que mezcla la referencia, el monto y un secreto; si ese secreto
 * viajara al navegador para poder firmar allí, cualquiera podría leerlo con
 * la consola abierta y firmar un cobro de mil pesos por un frasco de 89.900.
 *
 * Por eso el navegador aquí sólo manda identificadores y cantidades. Todo lo
 * demás —precios, envío, total, referencia y firma— se calcula de este lado,
 * contra el catálogo del servidor.
 *
 * La tabla `pedidos` no tiene política de inserción a propósito: ni siquiera
 * la clienta autenticada puede escribir en ella desde el navegador. La única
 * llave que puede es la de servicio, que vive en las variables de entorno de
 * esta función y en ningún otro sitio.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { calcularPedido, sha256Hex, validarEnvio, ENVIOS } from '../_compartido/catalogo.ts';

const CHECKOUT = 'https://checkout.wompi.co/p/';
const MONEDA = 'COP';

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
 * Wompi no deja repetir una referencia jamás, ni siquiera para reintentar un
 * pago fallido, así que no puede derivarse del contenido del carrito: lleva
 * tiempo y azar. El prefijo es para reconocerla de un vistazo en el panel de
 * Wompi cuando haya varias marcas en la misma cuenta.
 */
function nuevaReferencia(): string {
  const tiempo = Date.now().toString(36).toUpperCase();
  const azar = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `FAE-${tiempo}-${azar}`;
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
  const WOMPI_PUBLICA = Deno.env.get('WOMPI_LLAVE_PUBLICA');
  const WOMPI_INTEGRIDAD = Deno.env.get('WOMPI_SECRETO_INTEGRIDAD');
  const URL_REGRESO = Deno.env.get('URL_REGRESO');

  if (!URL_SUPABASE || !LLAVE_SERVICIO) {
    return responder({ error: 'El servidor no está configurado.' }, 500, origen);
  }
  // Sin llaves de Wompi la tienda no puede cobrar. Se dice claro en lugar de
  // fallar con un 500 opaco: es el estado normal hasta que alguien las pone.
  if (!WOMPI_PUBLICA || !WOMPI_INTEGRIDAD) {
    return responder(
      { error: 'Los pagos todavía no están configurados en este entorno.', codigo: 'sin_pagos' },
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
      { error: 'Hay que entrar en la cuenta antes de pagar.', codigo: 'sin_sesion' },
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
  // llegue un pedido pagado con la dirección en blanco, que es un pedido que
  // no se puede despachar y que sólo se descubre cuando ya cobraste.
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
      estado: 'pendiente',
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

  // --- Firmar el cobro -----------------------------------------------------
  // Wompi trabaja en centavos. Los precios del catálogo están en pesos
  // enteros, así que se multiplican aquí y en un solo sitio.
  const centavos = cuenta.total * 100;
  const firma = await sha256Hex(`${referencia}${centavos}${MONEDA}${WOMPI_INTEGRIDAD}`);

  const parametros = new URLSearchParams({
    'public-key': WOMPI_PUBLICA,
    'currency': MONEDA,
    'amount-in-cents': String(centavos),
    'reference': referencia,
    'signature:integrity': firma,
  });
  if (URL_REGRESO) parametros.set('redirect-url', `${URL_REGRESO}?ref=${referencia}`);

  // Se le pasan a Wompi los datos que ya tenemos para que su checkout aparezca
  // relleno. No es cosmético: sin esto la clienta escribe su nombre, su
  // teléfono y su dirección dos veces seguidas —una aquí y otra allí— y ese
  // segundo formulario en blanco es donde se cae la mitad de los carritos.
  parametros.set('customer-data:email', user.email ?? '');
  parametros.set('customer-data:full-name', envio.destinatario);
  parametros.set('customer-data:phone-number', envio.telefono);
  parametros.set('customer-data:phone-number-prefix', '+57');
  parametros.set('shipping-address:address-line-1', envio.direccion);
  if (envio.complemento) parametros.set('shipping-address:address-line-2', envio.complemento);
  // `cuenta.ciudad` es el identificador ('bogota'), no lo que hay que
  // enseñarle a nadie. Y con "otra ciudad" el nombre del catálogo no sirve
  // como destino, así que vale lo que escribió la clienta.
  const esOtra = cuenta.ciudad === 'otras';
  const ciudadVisible = esOtra ? envio.departamento : ENVIOS[cuenta.ciudad].nombre;
  parametros.set('shipping-address:city', ciudadVisible);
  parametros.set('shipping-address:region', envio.departamento || ciudadVisible);
  parametros.set('shipping-address:country', 'CO');
  parametros.set('shipping-address:phone-number', envio.telefono);
  parametros.set('shipping-address:name', envio.destinatario);
  // Si la clienta paga por PSE hace falta su documento. En vez de pedírselo a
  // todo el mundo por si acaso, lo pide el checkout de Wompi sólo a quien
  // elige ese método.
  parametros.set('collect-customer-legal-id', 'true');

  return responder({
    referencia,
    total: cuenta.total,
    url: `${CHECKOUT}?${parametros.toString()}`,
  }, 200, origen);
});
