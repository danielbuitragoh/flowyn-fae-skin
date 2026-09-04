/**
 * Panel de cuenta.
 *
 * Dos estados y nada más: fuera y dentro. Fuera explica qué gana la clienta
 * al entrar antes de pedirle nada — un botón de Google sin motivo es una
 * puerta cerrada con un cartel de "identifícate". Dentro enseña quién es y
 * qué ha pedido.
 *
 * El historial se pide sólo al abrir el panel estando dentro, no al cargar
 * la página. Es una consulta que la mayoría de las visitas no necesita.
 */

import isotipo from '/assets/isotipo-gota.svg?raw';
import { crearModal } from './modal.js';
import {
  hayCuentas, haySesion, usuario, nombreVisible, avatar,
  entrarConGoogle, salir, alCambiarSesion,
} from './sesion.js';
import { misPedidos } from '../servicios/carrito-nube.js';
import { formatearPrecio, envioPorId } from '../datos/catalogo.js';

/* El logotipo de Google va en línea y con sus colores oficiales: sus
   condiciones de marca no permiten recolorearlo ni reconstruirlo, así que
   es la única mancha de color ajena a la paleta en todo el sitio. */
const G_GOOGLE = `
<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false">
  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
</svg>`;

const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

const ESTADOS = {
  recibido: 'Recibido · por confirmar',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa antes de meter algo en una plantilla `innerHTML`.
 *
 * El nombre, el correo y la URL de la foto los pone Google, no nosotros, y un
 * nombre de perfil puede llevar cualquier carácter. Sin esto, un `<` o unas
 * comillas en el nombre parten el marcado del panel en el primer repintado
 * después de entrar — justo cuando la clienta acaba de confiarnos su cuenta.
 */
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * El nombre visible de la ciudad a partir del identificador que guarda el
 * pedido: en la base queda `'bogota'` o `'otras'`, y a la clienta leerse
 * "otras" en su propio historial no le dice nada.
 *
 * `envioPorId` cae a la primera ciudad del catálogo cuando el id no existe,
 * así que se comprueba que devolvió la que se pidió: para un pedido viejo de
 * una ciudad que ya no esté en el catálogo, enseñar el dato crudo es más
 * honesto que enseñar Bogotá.
 */
function nombreCiudad(id) {
  const envio = envioPorId(id);
  return envio?.id === id ? envio.nombre : id;
}

export function montarCuenta() {
  const panel = document.querySelector('[data-cuenta]');
  const velo = document.querySelector('[data-velo-cuenta]');
  const boton = document.querySelector('[data-abrir-cuenta]');
  if (!panel || !boton) return;

  // Sin credenciales no hay cuenta que ofrecer. El botón se queda oculto en
  // lugar de aparecer y fallar: prometer una puerta que no abre es peor que
  // no tener puerta.
  if (!hayCuentas()) return;

  const cuerpo = panel.querySelector('[data-cuenta-cuerpo]');
  const iso = panel.querySelector('[data-cuenta-iso]');
  if (iso) iso.innerHTML = isotipo;

  let pedidos = null;      // null = todavía no se ha preguntado
  let cargando = false;
  let falloAlCargar = false;

  const { abrir, cerrar } = crearModal({
    panel,
    velo,
    alAbrir: () => { if (haySesion() && pedidos === null) pedirPedidos(); },
  });

  boton.addEventListener('click', () => abrir(boton));

  /* --- Pintado ---------------------------------------------------------- */

  function pintarFuera() {
    cuerpo.innerHTML = `
      <div class="cuenta__invitacion">
        <p class="cuenta__lema">Guarda tu bandeja donde quiera que estés.</p>
        <p>
          Con tu cuenta, lo que añadas aquí te espera en el teléfono, y cada
          pedido queda guardado con su fecha y su estado.
        </p>

        <button type="button" class="boton-google" data-entrar>
          ${G_GOOGLE}<span>Continuar con Google</span>
        </button>

        <p class="cuenta__letra-chica">
          Sólo recibimos tu nombre, tu correo y tu foto de perfil. No pedimos
          contraseña porque no guardamos ninguna.
        </p>
      </div>`;
  }

  function pintarDentro() {
    const u = usuario();
    const foto = avatar();

    cuerpo.innerHTML = `
      <div class="cuenta__identidad">
        ${foto
          ? `<img class="cuenta__foto" src="${esc(foto)}" alt="" referrerpolicy="no-referrer" />`
          : `<span class="cuenta__foto cuenta__foto--inicial" aria-hidden="true">${esc(nombreVisible().charAt(0).toUpperCase())}</span>`}
        <div>
          <p class="cuenta__nombre">Hola, ${esc(nombreVisible())}</p>
          <p class="cuenta__correo">${esc(u?.email ?? '')}</p>
        </div>
      </div>

      <section class="cuenta__pedidos" aria-labelledby="cuenta-pedidos">
        <h3 id="cuenta-pedidos">Tus pedidos</h3>
        ${pintarPedidos()}
      </section>

      <button type="button" class="boton boton--fantasma cuenta__salir" data-salir>Cerrar sesión</button>`;
  }

  function pintarPedidos() {
    if (cargando) return '<p class="cuenta__vacio">Buscando tus pedidos…</p>';

    // "No tienes pedidos" y "no he podido preguntarlo" no se dicen igual.
    if (falloAlCargar) {
      return `<p class="cuenta__vacio">
        No he podido consultar tus pedidos ahora mismo.
        <button type="button" class="cuenta__reintentar" data-reintentar>Reintentar</button>
      </p>`;
    }

    if (!pedidos?.length) {
      return `<p class="cuenta__vacio">
        Todavía no hay ninguno. Cuando hagas tu primer pedido aparecerá aquí
        con su referencia y su estado.
      </p>`;
    }

    return `<ul class="pedidos">${pedidos.map((p) => `
      <li class="pedido">
        <div class="pedido__fila">
          <span class="pedido__ref">${p.referencia}</span>
          <span class="pedido__estado" data-estado="${p.estado}">${ESTADOS[p.estado] ?? p.estado}</span>
        </div>
        <p class="pedido__meta">
          ${FECHA.format(new Date(p.creado_en))} ·
          ${(p.lineas ?? []).reduce((n, l) => n + l.cantidad, 0)} ud ·
          ${esc(nombreCiudad(p.ciudad))}
        </p>
        <p class="pedido__total">${formatearPrecio(p.total)}</p>
      </li>`).join('')}</ul>`;
  }

  function pintar() {
    if (haySesion()) pintarDentro(); else pintarFuera();
  }

  async function cargarPedidos() {
    cargando = true;
    falloAlCargar = false;
    pintar();

    const { ok, pedidos: lista } = await misPedidos();
    pedidos = ok ? lista : null;
    falloAlCargar = !ok;
    cargando = false;
    pintar();
  }

  /* Las dos llamadas que no esperan el resultado pasan por aquí. Un rechazo
     sin atrapar dejaría `cargando` en true y el panel congelado para siempre
     en "Buscando tus pedidos…", que es la peor forma de fallar: nunca llega a
     parecer un fallo. Se degrada al mensaje de reintentar, que sí lo parece. */
  function pedirPedidos() {
    cargarPedidos().catch((e) => {
      console.warn('[flowyn] No se pudo cargar el historial.', e);
      cargando = false;
      falloAlCargar = true;
      pintar();
    });
  }

  /* --- Acciones --------------------------------------------------------- */

  cuerpo.addEventListener('click', async (e) => {
    const entrar = e.target.closest('[data-entrar]');
    if (entrar) {
      entrar.disabled = true;
      entrar.querySelector('span').textContent = 'Abriendo Google…';
      const { error } = await entrarConGoogle();
      if (error) {
        entrar.disabled = false;
        entrar.querySelector('span').textContent = 'Continuar con Google';
        anunciar('No se pudo abrir Google. Inténtalo otra vez.');
      }
      return;
    }

    if (e.target.closest('[data-reintentar]')) { pedirPedidos(); return; }

    if (e.target.closest('[data-salir]')) {
      await salir();
      cerrar();
    }
  });

  function anunciar(texto) {
    const region = panel.querySelector('[data-cuenta-anuncio]');
    if (region) region.textContent = texto;
  }

  /* --- Enlace con la sesión --------------------------------------------- */

  alCambiarSesion(({ listo }) => {
    if (!listo) return;

    boton.hidden = false;
    const etiqueta = boton.querySelector('[data-cuenta-etiqueta]');
    const marco = boton.querySelector('[data-cuenta-avatar]');

    if (haySesion()) {
      if (etiqueta) etiqueta.textContent = nombreVisible();
      boton.setAttribute('aria-label', `Tu cuenta — ${nombreVisible()}`);
      const foto = avatar();
      if (marco) {
        marco.innerHTML = foto
          ? `<img src="${esc(foto)}" alt="" referrerpolicy="no-referrer" />`
          : esc(nombreVisible().charAt(0).toUpperCase());
        marco.hidden = false;
      }
    } else {
      if (etiqueta) etiqueta.textContent = 'Entrar';
      boton.setAttribute('aria-label', 'Entrar en tu cuenta');
      if (marco) { marco.innerHTML = ''; marco.hidden = true; }
      pedidos = null;   // el historial es de quien ya se fue
    }

    pintar();
  });

  pintar();
}
