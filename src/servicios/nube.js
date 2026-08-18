/**
 * Conexión con Supabase.
 *
 * Todo lo que habla con la nube pasa por aquí. El resto del código pregunta
 * `hayNube()` y, si la respuesta es no, sigue funcionando: el carrito se
 * guarda en el navegador, el botón de cuenta no aparece y la tienda se
 * comporta exactamente como antes de la Fase 3.
 *
 * Esa degradación no es un adorno. El repositorio es público y cualquiera
 * puede clonarlo sin tener llaves; si la ausencia de credenciales rompiera
 * la página, el proyecto sólo funcionaría en mi máquina.
 *
 * El cliente se crea la primera vez que alguien lo pide, no al cargar el
 * módulo: `@supabase/supabase-js` pesa, y quien sólo viene a mirar el
 * producto no tiene por qué descargarlo.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL;
const LLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** ¿Hay credenciales y tienen pinta de serlo? */
export function hayNube() {
  return Boolean(
    URL_BASE && LLAVE &&
    /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(URL_BASE.trim()) &&
    // El ejemplo de `.env.example` termina en "..." a propósito, para que
    // copiarlo sin rellenarlo no parezca una configuración válida.
    !LLAVE.trim().endsWith('...'),
  );
}

let promesa = null;

/**
 * Devuelve el cliente, o `null` si no hay credenciales.
 *
 * Siempre asíncrono, incluso cuando ya está creado, para que quien lo use
 * escriba una sola forma de llamada y no dos caminos distintos.
 */
export async function nube() {
  if (!hayNube()) return null;

  if (!promesa) {
    promesa = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(URL_BASE, LLAVE, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // La vuelta de Google trae el token en el fragmento de la URL.
          // Que lo recoja la librería y limpie la barra de direcciones.
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }))
      .catch((e) => {
        console.warn('[flowyn] No se pudo cargar el cliente de Supabase.', e);
        promesa = null;
        return null;
      });
  }

  return promesa;
}

/**
 * A dónde vuelve Google después de autenticar.
 *
 * Tiene que ser una URL absoluta y coincidir con la que se registre en
 * Supabase. `BASE_URL` la aporta Vite, así que sale bien tanto en local
 * (`/`) como en GitHub Pages (`/flowyn-fae-skin/`) sin escribirla dos veces.
 */
export function urlDeRegreso() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}
