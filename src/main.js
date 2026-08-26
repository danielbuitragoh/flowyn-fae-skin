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
import { montarFrasco3D } from './modulos/frasco3d.js';
import { iniciarProfundidad } from './modulos/profundidad.js';
import { iniciarRegreso } from './modulos/regreso.js';
import { iniciarPestanas } from './modulos/pestanas.js';
import { iniciarPalabras } from './modulos/palabras.js';
import { iniciarBarraCompra } from './modulos/barra-compra.js';
import { montarCarrito } from './modulos/carrito-ui.js';
import { montarFicha } from './modulos/ficha.js';
import { montarCuenta } from './modulos/cuenta-ui.js';
import { iniciarSesionModulo } from './modulos/sesion.js';
import { sincronizarCarritoConSesion } from './modulos/sincronizar-carrito.js';

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
  // Va después de montar carrito y cuenta: si la clienta vuelve de pagar,
  // este módulo necesita que el carrito ya exista para poder vaciarlo.
  iniciarRegreso();
  iniciarSesionModulo();

  iniciarPestanas();
  iniciarPalabras();
  // Después de montar el carrito: la barra añade unidades y necesita que
  // el estado del carrito ya exista.
  iniciarBarraCompra();
  iniciarRevelado();

  // El 3D se monta aparte y sin bloquear: three.js viaja en su propio
  // fragmento, así que la página ya es usable mucho antes de que llegue.
  montarFrasco3D(document.querySelector('[data-frasco-3d]'))
    .then((instancia) => {
      if (!instancia) return;
      const producto = document.querySelector('.hero__producto');
      if (producto) producto.dataset.modo = '3d';
      const pista = document.querySelector('[data-pista-3d]');
      if (pista) pista.hidden = false;
    })
    .catch(() => { /* sin 3D nos quedamos con el packshot: nada que avisar */ });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}
