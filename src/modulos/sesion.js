/**
 * Sesión de la clienta.
 *
 * Un solo sitio sabe si hay alguien dentro y quién es. Lo demás se entera
 * suscribiéndose. Es el mismo patrón que el carrito —estado por un lado,
 * pantalla por otro— y por la misma razón: si dos módulos preguntan a
 * Supabase por su cuenta, tarde o temprano muestran cosas distintas.
 *
 * El perfil (nombre, avatar, ciudad) vive en la tabla `perfiles`, no en el
 * token. El token dice quién eres; la tabla, cómo quieres que te traten.
 */

import { nube, hayNube, urlDeRegreso } from '../servicios/nube.js';

const estado = {
  listo: false,     // ¿ya sabemos si hay sesión o no?
  usuario: null,    // el de auth.users
  perfil: null,     // el de public.perfiles
};

const oyentes = new Set();

function avisar() {
  for (const o of oyentes) o({ ...estado });
}

/* --- Lectura ----------------------------------------------------------- */

export const hayCuentas = hayNube;
export const estaListo = () => estado.listo;
export const usuario = () => estado.usuario;
export const perfil = () => estado.perfil;
export const haySesion = () => Boolean(estado.usuario);

/** El nombre que se le muestra. Nunca el correo entero. */
export function nombreVisible() {
  const n = estado.perfil?.nombre
    || estado.usuario?.user_metadata?.full_name
    || estado.usuario?.user_metadata?.name;
  if (n) return String(n).split(' ')[0];
  const correo = estado.usuario?.email;
  return correo ? correo.split('@')[0] : 'Mi cuenta';
}

export function avatar() {
  return estado.perfil?.avatar_url || estado.usuario?.user_metadata?.avatar_url || null;
}

export function alCambiarSesion(oyente) {
  oyentes.add(oyente);
  if (estado.listo) oyente({ ...estado });
  return () => oyentes.delete(oyente);
}

/* --- Perfil ------------------------------------------------------------- */

async function cargarPerfil(cliente, id) {
  // `maybeSingle` en vez de `single`: la fila la crea un disparador en el
  // momento del registro, y en el primer inicio de sesión la consulta puede
  // llegar un instante antes. Que no haya perfil todavía no es un error.
  const { data, error } = await cliente
    .from('perfiles')
    .select('nombre, avatar_url, ciudad_envio')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn('[flowyn] No se pudo leer el perfil.', error.message);
    return null;
  }
  return data;
}

// La ciudad de envío no se guarda aquí aunque `perfiles` tenga la columna.
// Vive en `carritos`, que es donde el carrito la lee y la escribe. Guardarla
// en dos sitios significaría tener que decidir cuál gana el día que no
// coincidan, y esa es una pregunta que es mejor no crearse.

/* --- Entrar y salir ------------------------------------------------------ */

export async function entrarConGoogle() {
  const cliente = await nube();
  if (!cliente) return { error: new Error('Sin conexión con la cuenta.') };

  return cliente.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: urlDeRegreso(),
      queryParams: {
        // Que Google recuerde la elección en lugar de preguntar la cuenta
        // cada vez, pero sin saltarse la pantalla de consentimiento la
        // primera vez.
        prompt: 'select_account',
      },
    },
  });
}

export async function salir() {
  const cliente = await nube();
  if (!cliente) return;
  await cliente.auth.signOut();
}

/* --- Arranque ------------------------------------------------------------ */

export async function iniciarSesionModulo() {
  if (!hayNube()) {
    estado.listo = true;
    avisar();
    return;
  }

  const cliente = await nube();
  if (!cliente) {
    estado.listo = true;
    avisar();
    return;
  }

  // `onAuthStateChange` dispara también con la sesión ya guardada al
  // suscribirse, así que no hace falta un `getSession` aparte: bastaría con
  // esperar. Pero el evento inicial puede tardar, y hasta entonces la nav
  // no sabe qué dibujar. Se pide una vez y luego se escucha.
  const { data: { session } } = await cliente.auth.getSession();
  await aplicar(cliente, session);

  cliente.auth.onAuthStateChange((evento, sesion) => {
    // TOKEN_REFRESHED no cambia quién eres; repintar la interfaz por eso
    // sólo produce parpadeos.
    if (evento === 'TOKEN_REFRESHED') return;
    aplicar(cliente, sesion);
  });
}

async function aplicar(cliente, sesion) {
  const anterior = estado.usuario?.id ?? null;
  estado.usuario = sesion?.user ?? null;
  estado.perfil = estado.usuario && estado.usuario.id !== anterior
    ? await cargarPerfil(cliente, estado.usuario.id)
    : (estado.usuario ? estado.perfil : null);
  estado.listo = true;
  avisar();
}
