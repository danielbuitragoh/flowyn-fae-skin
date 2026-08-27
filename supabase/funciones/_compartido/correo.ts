/**
 * El correo de confirmación.
 *
 * Ya no lo dispara un webhook de pago: se manda directo desde `crear-pedido`
 * apenas se guarda el pedido, porque ahora el pago se confirma por WhatsApp,
 * no por un aviso firmado de una pasarela.
 *
 * Va por SMTP de Gmail, y esa decisión merece explicación porque no es la
 * obvia. Lo normal sería Resend o Postmark, pero los dos —y Brevo, y
 * Mailgun— exigen un dominio propio verificado para poder escribirle a
 * cualquiera:
 *
 *   · Resend, desde `onboarding@resend.dev`, sólo puede escribirle a la
 *     dirección con la que te registraste. A cualquier otra devuelve 403.
 *   · Postmark prohíbe expresamente usar Gmail como remitente: lo considera
 *     suplantación, y tiene razón.
 *   · Brevo sí te deja poner un Gmail, y ahí está el peligro: los correos
 *     salen, no rebotan, y no llegan. Fallo silencioso. Para un pedido
 *     pagado eso es lo peor que puede pasar.
 *   · SendGrid retiró su plan gratuito en mayo de 2025.
 *   · El correo propio de Supabase manda dos por hora y sólo a miembros del
 *     proyecto. Su documentación dice literalmente que no es para producción.
 *
 * Gmail funciona donde los demás fallan por una razón concreta: el remitente
 * ES una dirección de Google enviada por servidores de Google, así que SPF y
 * DKIM están alineados de nacimiento. No hay nada que suplantar.
 *
 * Es una solución de arranque, no la definitiva. Un correo de confirmación
 * que llega desde una @gmail contradice el posicionamiento de la marca, y a
 * medio plazo toca un dominio propio (unos 10 USD al año). Por eso todo el
 * envío pasa por `enviarCorreo()`: el día que exista el dominio, se cambia
 * el cuerpo de esa función y nada más.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

export type Correo = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
};

export function hayCorreo(): boolean {
  return Boolean(Deno.env.get('CORREO_USUARIO') && Deno.env.get('CORREO_CLAVE'));
}

/**
 * Manda un correo. Nunca lanza.
 *
 * Que falle el correo no puede tumbar la creación del pedido: si esta
 * función lanzara, `crear-pedido` fallaría por un problema que no es culpa
 * de la clienta y que no le impide cerrar su pedido por WhatsApp. Crear el
 * pedido es lo importante; el aviso por correo es deseable. Se devuelve si
 * salió o no para poder registrarlo.
 */
export async function enviarCorreo(correo: Correo): Promise<{ ok: boolean; error?: string }> {
  const usuario = Deno.env.get('CORREO_USUARIO');
  const clave = Deno.env.get('CORREO_CLAVE');
  if (!usuario || !clave) return { ok: false, error: 'sin_configurar' };

  let cliente: SMTPClient | null = null;
  try {
    cliente = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        // 465 con TLS implícito. Supabase documentó durante un tiempo que los
        // puertos de salida 25, 465 y 587 estaban bloqueados en Edge
        // Functions; era un error de su documentación y lo corrigieron.
        port: 465,
        tls: true,
        auth: { username: usuario, password: clave },
      },
    });

    await cliente.send({
      from: `flowyn <${usuario}>`,
      to: correo.para,
      subject: correo.asunto,
      content: correo.texto,
      html: correo.html,
    });
    return { ok: true };
  } catch (e) {
    // El fallo típico aquí es `535 5.7.8 Username and Password not accepted`:
    // significa que se puso la contraseña normal de la cuenta en vez de una
    // contraseña de aplicación, que es lo que pide Gmail cuando hay 2FA.
    console.error('[flowyn] No se pudo enviar el correo.', e);
    return { ok: false, error: String(e) };
  } finally {
    try { await cliente?.close(); } catch { /* ya estaba cerrado */ }
  }
}

const pesos = (n: number) =>
  '$ ' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export type DatosPedido = {
  referencia: string;
  total: number;
  subtotal: number;
  envio: number;
  destinatario: string | null;
  telefono: string | null;
  direccion: string | null;
  complemento: string | null;
  barrio: string | null;
  /** Nombre visible de la ciudad ("Bogotá"), para mostrar en el correo. */
  ciudad: string;
  /** Identificador de la ciudad en el catálogo ("bogota"), para buscar el plazo. */
  ciudad_id: string;
  departamento: string | null;
  indicaciones: string | null;
  lineas: Array<{ nombre: string; formato: string; cantidad: number; precio_unitario: number }>;
};

/**
 * Cuánto tarda cada zona. Es lo que va en el correo como plazo prometido.
 * Duplica el mismo dato que ya está en `src/datos/catalogo.js` (campo
 * `dias`) por la razón de siempre: el servidor no importa el archivo del
 * cliente. Aquí sólo se usa para redactar el correo, no para cobrar nada,
 * así que no hace falta que `npm run verificar` la compare entre copias.
 */
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
 * El correo para la clienta.
 *
 * Tablas con anchos fijos y estilos en línea, no la hoja de estilos de la
 * página: los clientes de correo llevan veinte años de retraso respecto a los
 * navegadores y no entienden ni grid ni variables CSS. La paleta sí es la de
 * la marca, para que el correo no parezca de otra empresa.
 *
 * El contenido no es sólo cortesía. La Ley 2439 de 2024 obliga a informar del
 * plazo de entrega —si no se especifica, el máximo legal son 30 días
 * calendario—, del derecho de retracto de cinco días hábiles y de la
 * devolución del dinero en quince días calendario. Va aquí porque es el
 * documento que la clienta conserva.
 */
export function correoParaLaClienta(p: DatosPedido): Correo {
  const plazo = PLAZOS[p.ciudad_id] ?? '4 a 7 días hábiles';

  const filas = p.lineas.map((l) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #DDCBC3;color:#6E655E;font-size:15px">
        ${l.nombre} · ${l.formato}${l.cantidad > 1 ? ` × ${l.cantidad}` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #DDCBC3;text-align:right;color:#8B5A4B;font-size:15px">
        ${pesos(l.precio_unitario * l.cantidad)}
      </td>
    </tr>`).join('');

  const destino = [
    p.direccion,
    p.complemento,
    p.barrio,
    [p.ciudad, p.departamento].filter(Boolean).join(', '),
  ].filter(Boolean).join('<br />');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#FAF5F2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5F2;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#FFFFFF;border:1px solid #DDCBC3;border-radius:18px;padding:36px">

    <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#7F655C;padding-bottom:18px">
      flowyn
    </td></tr>

    <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.3;color:#8B5A4B;padding-bottom:10px">
      Gracias, ${p.destinatario ?? ''}.
    </td></tr>

    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6E655E;padding-bottom:26px">
      Recibimos tu pedido. Te escribimos por WhatsApp para confirmar el pago y
      coordinar el envío — si no te ha llegado el mensaje, escríbenos tú con
      la referencia de abajo.
    </td></tr>

    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7F655C;padding-bottom:6px">
      Pedido ${p.referencia}
    </td></tr>

    <tr><td style="padding-bottom:24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="font-family:Helvetica,Arial,sans-serif;border-collapse:collapse">
        ${filas}
        <tr>
          <td style="padding:10px 0;color:#6E655E;font-size:14px">Envío · ${p.ciudad}</td>
          <td style="padding:10px 0;text-align:right;color:#6E655E;font-size:14px">
            ${p.envio === 0 ? 'Gratis' : pesos(p.envio)}
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0 0;font-family:Georgia,serif;font-size:17px;color:#8B5A4B">Total</td>
          <td style="padding:14px 0 0;text-align:right;font-family:Georgia,serif;font-size:19px;color:#8B5A4B">
            ${pesos(p.total)}
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7F655C;padding-bottom:8px">
      A dónde va
    </td></tr>
    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6E655E;padding-bottom:6px">
      ${destino}
    </td></tr>
    ${p.indicaciones ? `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#8A837B;padding-bottom:6px">${p.indicaciones}</td></tr>` : ''}
    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#6E655E;padding-bottom:26px">
      Tel. ${p.telefono ?? ''}
    </td></tr>

    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6E655E;padding-bottom:22px;border-top:1px solid #DDCBC3;padding-top:22px">
      <strong style="color:#8B5A4B;font-weight:normal">Entrega estimada:</strong> ${plazo}.
    </td></tr>

    <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:#8A837B">
      Tienes cinco días hábiles desde que recibes el pedido para retractarte. Si lo
      haces, devolvemos el dinero en un máximo de quince días calendario; el costo
      del transporte de devolución corre por tu cuenta y el producto debe volver en
      las mismas condiciones en que lo recibiste.
      <br /><br />
      ¿Alguna duda? Responde a este correo.
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;

  const texto = [
    `Gracias, ${p.destinatario ?? ''}.`,
    '',
    `Recibimos tu pedido ${p.referencia}. Te escribimos por WhatsApp para confirmar el pago y coordinar el envío.`,
    '',
    ...p.lineas.map((l) => `- ${l.nombre} ${l.formato}${l.cantidad > 1 ? ` x${l.cantidad}` : ''}  ${pesos(l.precio_unitario * l.cantidad)}`),
    `Envío (${p.ciudad}): ${p.envio === 0 ? 'Gratis' : pesos(p.envio)}`,
    `Total: ${pesos(p.total)}`,
    '',
    'A dónde va:',
    [p.direccion, p.complemento, p.barrio, p.ciudad, p.departamento].filter(Boolean).join(', '),
    `Tel. ${p.telefono ?? ''}`,
    '',
    `Entrega estimada: ${plazo}.`,
    '',
    'Tienes cinco días hábiles desde que lo recibes para retractarte, y',
    'devolvemos el dinero en máximo quince días calendario.',
  ].join('\n');

  return { para: '', asunto: `Recibimos tu pedido ${p.referencia}`, html, texto };
}

/**
 * El aviso para Dan.
 *
 * Existe porque mientras el despacho sea manual, un pedido que nadie ve es un
 * pedido que no sale. Lleva todo lo que hace falta para rellenar la guía de
 * la transportadora sin tener que abrir la base de datos.
 */
export function correoParaLaTienda(p: DatosPedido): Correo {
  const filas = [
    ['Referencia', p.referencia],
    ['Total', pesos(p.total)],
    ['Recibe', p.destinatario ?? '—'],
    ['Celular', p.telefono ?? '—'],
    ['Dirección', [p.direccion, p.complemento].filter(Boolean).join(' · ') || '—'],
    ['Barrio', p.barrio || '—'],
    ['Ciudad', [p.ciudad, p.departamento].filter(Boolean).join(', ')],
    ['Cómo llegar', p.indicaciones || '—'],
    ['Unidades', p.lineas.map((l) => `${l.nombre} ×${l.cantidad}`).join(', ')],
  ];

  const html = `<!doctype html><html lang="es"><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF5F2;padding:24px">
  <h1 style="font-size:18px;color:#8B5A4B">Pedido nuevo · ${p.referencia}</h1>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#6E655E">
    ${filas.map(([k, v]) => `<tr>
      <td style="border-bottom:1px solid #DDCBC3;color:#7F655C;white-space:nowrap">${k}</td>
      <td style="border-bottom:1px solid #DDCBC3;color:#8B5A4B">${v}</td></tr>`).join('')}
  </table>
</body></html>`;

  const texto = filas.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { para: '', asunto: `Pedido nuevo · ${p.referencia} · ${pesos(p.total)}`, html, texto };
}
