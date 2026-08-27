/**
 * Verificador de contraste WCAG 2.1 AA.
 *
 * Nació de un problema real en La Mesa: la paleta de una marca se diseña
 * mirando muestras grandes de color, pero en la web ese mismo tono acaba
 * en texto de 13 px, donde deja de ser legible. Medirlo a ojo no funciona,
 * y una vez que la paleta está repartida por veinte archivos, una
 * regresión pasa desapercibida.
 *
 * Este script lee los tokens directamente del CSS —no de una copia que se
 * desactualiza— y falla la construcción si algún par cae por debajo del
 * mínimo. La paleta de Flowyn es especialmente delicada en esto: es
 * monocroma y cálida, así que los tonos vecinos se parecen mucho entre sí
 * y es fácil elegir un par bonito pero ilegible.
 *
 * Uso:  node scripts/verificar-contraste.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RUTA_TOKENS = resolve(AQUI, '../src/estilos/tokens.css');

/* -- Lectura de tokens ----------------------------------------------------- */

function leerTokens(ruta) {
  const css = readFileSync(ruta, 'utf8');
  const tokens = {};
  for (const [, nombre, valor] of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[nombre] = valor;
  }
  return tokens;
}

/* -- Cálculo de contraste (WCAG 2.1) --------------------------------------- */

function aRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* -- Pares que el sitio usa de verdad --------------------------------------
   Sólo tiene sentido medir combinaciones que existen en pantalla. Añadir
   pares hipotéticos infla el informe y esconde los fallos que importan.  */

const PARES = [
  // texto,        fondo,          mínimo, dónde aparece
  ['taupe',        'crema',        4.5, 'Cuerpo sobre fondo base'],
  ['taupe',        'crema-calida', 4.5, 'Cuerpo sobre fondo cálido'],
  ['taupe',        'nude',         4.5, 'Cuerpo sobre tarjeta'],
  ['caoba',        'crema',        4.5, 'Titulares sobre fondo base'],
  ['caoba',        'nude',         4.5, 'Titulares sobre tarjeta'],
  ['caoba-hondo',  'crema',        4.5, 'Texto de énfasis'],
  ['caoba-hondo',  'nude',         4.5, 'Texto de énfasis sobre tarjeta'],
  ['crema',        'caoba',        4.5, 'Botón principal (texto sobre relleno)'],
  ['crema',        'caoba-hondo',  4.5, 'Botón principal en hover'],
  // Las etiquetas van en versales de 11 px: son texto pequeño, así que
  // se les exige el mismo 4.5 que al cuerpo, no la excepción de 3:1.
  ['cobre-texto',  'crema',        4.5, 'Etiquetas de sección'],
  ['cobre-texto',  'nude',         4.5, 'Etiquetas sobre tarjeta'],
  ['cobre-texto',  'crema-calida', 4.5, 'Etiquetas sobre fondo cálido'],
  ['taupe-texto',  'crema',        4.5, 'Texto secundario'],
  ['taupe-texto',  'nude',         4.5, 'Texto secundario sobre tarjeta'],
  // Bordes que comunican algo (campos de formulario, foco): WCAG 1.4.11
  // pide 3:1 para componentes de interfaz.
  ['borde-ui',     'crema',        3.0, 'Bordes de campos y foco'],
  ['borde-ui',     'nude',         3.0, 'Bordes sobre tarjeta'],

  // Estado de pedido. Único color fuera de la paleta: se mide igual.
  ['verde-ok',     'nude',         4.5, 'Estado «Confirmado» en el historial'],
];

/* -- Exentos y por qué -----------------------------------------------------
   Estos tonos NO se miden, y conviene dejar escrito el motivo para que
   nadie los "arregle" más adelante y le quite a la marca su carácter:

   --rosa-borde   Filetes decorativos de 1 px. No delimitan un control ni
                  comunican estado; si desaparecieran, no se perdería
                  información. WCAG 1.4.11 aplica a componentes de interfaz
                  y objetos gráficos con significado, no a ornamento.
   --oro-rosa     Color del logotipo y de los destellos. Los logotipos están
                  explícitamente exentos del requisito de contraste, y los
                  destellos son decoración pura.
   --blush        Velos de seda del fondo. Ornamento.
   --taupe-claro  Se conserva por compatibilidad, pero no debe usarse en
                  texto: para eso está --taupe-texto.                     */

/* -- Ejecución -------------------------------------------------------------- */

const tokens = leerTokens(RUTA_TOKENS);
let fallos = 0;

console.log('\n  FLOWYN · contraste WCAG 2.1 AA');
console.log(`  ${PARES.length} pares · tokens leídos de src/estilos/tokens.css\n`);

for (const [frente, fondo, minimo, donde] of PARES) {
  const hexFrente = tokens[frente];
  const hexFondo = tokens[fondo];

  if (!hexFrente || !hexFondo) {
    console.log(`  ✗  token ausente: --${!hexFrente ? frente : fondo}`);
    fallos += 1;
    continue;
  }

  const ratio = contraste(hexFrente, hexFondo);
  const pasa = ratio >= minimo;
  if (!pasa) fallos += 1;

  const marca = pasa ? '✓' : '✗';
  const valor = `${ratio.toFixed(2)}:1`.padStart(7);
  const par = `${frente} / ${fondo}`.padEnd(30);
  console.log(`  ${marca}  ${par} ${valor}  (mín. ${minimo})  ${donde}`);
}

console.log('');

if (fallos > 0) {
  console.error(`  ${fallos} par(es) por debajo del mínimo.\n`);
  console.error('  No cambies la paleta de la marca para arreglarlo: separa los usos.');
  console.error('  El tono original se queda para superficies y acentos, y para texto');
  console.error('  se usa una variante más profunda del mismo color.\n');
  process.exit(1);
}

console.log('  Todos los pares cumplen AA.\n');
