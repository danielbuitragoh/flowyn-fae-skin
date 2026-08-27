/* ==========================================================================
   FLOWYN · Punto de entrada
   ========================================================================== */

// Fuentes autoalojadas. Las servimos nosotros en lugar de pedirlas al CDN de
// Google: una petición menos a un tercero, nada de datos del visitante
// viajando fuera, y el texto no parpadea si ese CDN va lento.
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';

import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/nav.css';
import './estilos/hero.css';
import './estilos/secciones.css';
import './estilos/ritual.css';
import './estilos/formula.css';
import './estilos/comprar.css';
import './estilos/carrito.css';
import './estilos/cuenta.css';

import { iniciarRevelado } from './modulos/revelar.js';
import { sembrarBruma, sembrarDestellos } from './modulos/atmosfera.js';
import { montarLogo } from './modulos/marca.js';
import { montarNav } from './modulos/nav.js';
import { montarIconos } from './modulos/iconos.js';
import { iniciarRitual } from './modulos/ritual.js';
import { iniciarProfundidad } from './modulos/profundidad.js';
import { iniciarPestanas } from './modulos/pestanas.js';
import { iniciarPalabras } from './modulos/palabras.js';
import { iniciarBarraCompra } from './modulos/barra-compra.js';
import { montarCarrito } from './modulos/carrito-ui.js';
import { montarFicha } from './modulos/ficha.js';
import { montarCuenta } from './modulos/cuenta-ui.js';
import { iniciarSesionModulo } from './modulos/sesion.js';
import { sincronizarCarritoConSesion } from './modulos/sincronizar-carrito.js';
// `regreso.js` ya no aplica: sin pasarela de pago no hay a dónde "volver".
// El pedido se cierra abriendo WhatsApp en una pestaña nueva, no navegando
// fuera del sitio, así que no hace falta detectar un regreso.

function iniciar() {
  montarNav();
  montarIconos();
  montarLogo(document.querySelector('[data-logo]'));
  sembrarBruma(document.querySelector('[data-bruma]'));
  sembrarDestellos(document.querySelector('[data-destellos]'));
  iniciarRitual();
  iniciarProfundidad();

  // La tienda va antes que el revelado: el carrito tiene que pintar su
  // contenido guardado aunque el visitante no haya hecho scroll todavía.
  montarCarrito();
  montarFicha();

  // La cuenta se suscribe antes de que la sesión arranque, para no perderse
  // el primer aviso. Sin credenciales configuradas, `montarCuenta` se
  // retira sola y la tienda funciona igual que en la Fase 2.
  montarCuenta();
  sincronizarCarritoConSesion();
  iniciarSesionModulo();

  iniciarPestanas();
  iniciarPalabras();
  // Después de montar el carrito: la barra añade unidades y necesita que
  // el estado del carrito ya exista.
  iniciarBarraCompra();
  iniciarRevelado();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}
