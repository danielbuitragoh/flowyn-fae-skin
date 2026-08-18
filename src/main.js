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

import { iniciarRevelado } from './modulos/revelar.js';
import { sembrarBruma, sembrarDestellos } from './modulos/atmosfera.js';
import { montarLogo } from './modulos/marca.js';
import { montarNav } from './modulos/nav.js';
import { montarIconos } from './modulos/iconos.js';
import { iniciarRitual } from './modulos/ritual.js';

function iniciar() {
  montarNav();
  montarIconos();
  montarLogo(document.querySelector('[data-logo]'));
  sembrarBruma(document.querySelector('[data-bruma]'));
  sembrarDestellos(document.querySelector('[data-destellos]'));
  iniciarRitual();
  iniciarRevelado();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}
