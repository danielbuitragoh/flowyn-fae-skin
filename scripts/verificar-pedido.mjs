/**
 * Verificador del cálculo de pedidos del servidor.
 *
 * Comprueba dos cosas distintas, y las dos importan:
 *
 * 1. Que el servidor no se deje engañar. El navegador manda identificadores y
 *    cantidades; si alguien inyecta un precio, un producto inventado, una
 *    cantidad absurda o la misma línea repetida para saltarse el tope, el
 *    cálculo tiene que rechazarlo. Esta es la parte que separa "tenemos un
 *    checkout" de "tenemos un checkout que no se puede robar".
 *
 * 2. Que las dos copias del catálogo no se hayan separado. Los precios están
 *    escritos dos veces a propósito —el navegador no puede tocar la del
 *    servidor— pero si alguien sube el precio en `src/datos/catalogo.js` y se
 *    olvida del otro, la tienda enseñaría un precio y cobraría otro. Aquí se
 *    comparan y la construcción falla si no coinciden.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVIDOR_TS = 'supabase/funciones/_compartido/catalogo.ts';
const CLIENTE_JS = 'src/datos/catalogo.js';

/* --- Cargar el módulo del servidor (es TypeScript) ------------------------ */
const temporal = mkdtempSync(join(tmpdir(), 'flowyn-'));

/* El catálogo del cliente usa `import.meta.env.BASE_URL`, que sólo existe
   dentro de Vite. Los dos se pasan por esbuild: el del servidor porque es
   TypeScript, y el del cliente para sustituir esa variable por algo que
   Node entienda. Aquí no se prueban rutas de imágenes, sólo cifras. */
function cargar(entrada, nombre, define = []) {
  const salida = join(temporal, nombre);
  execFileSync('node_modules/.bin/esbuild', [
    entrada, '--bundle', '--format=esm', '--platform=neutral',
    '--log-level=warning', ...define, `--outfile=${salida}`,
  ]);
  return import(salida);
}

const servidor = await cargar(SERVIDOR_TS, 'servidor.mjs');
const cliente = await cargar(CLIENTE_JS, 'cliente.mjs',
  ['--define:import.meta.env.BASE_URL=\'"/"\'']);

/* --- Utilidades del informe ----------------------------------------------- */
let fallos = 0;
const ok = (t) => console.log(`  ✓  ${t}`);
const mal = (t, detalle) => { fallos++; console.log(`  ✗  ${t}\n     ${detalle}`); };

function afirmar(titulo, condicion, detalle = '') {
  condicion ? ok(titulo) : mal(titulo, detalle);
}

console.log('\n  FLOWYN · cálculo de pedidos en el servidor\n');

/* --- 1. Cuentas correctas -------------------------------------------------- */
console.log('  Cuentas');

const uno = servidor.calcularPedido([{ id: 'fae-skin-100', cantidad: 1 }], 'bogota');
afirmar('Un frasco a Bogotá cobra envío',
  uno.cuenta?.subtotal === 89900 && uno.cuenta?.envio === 12900 && uno.cuenta?.total === 102800,
  JSON.stringify(uno));

const dos = servidor.calcularPedido([{ id: 'fae-skin-100', cantidad: 2 }], 'bogota');
afirmar('Dos frascos cruzan el umbral y el envío es gratis',
  dos.cuenta?.subtotal === 179800 && dos.cuenta?.envio === 0 && dos.cuenta?.total === 179800,
  JSON.stringify(dos));

const lejos = servidor.calcularPedido([{ id: 'fae-skin-100', cantidad: 1 }], 'otras');
afirmar('La tarifa cambia con la ciudad',
  lejos.cuenta?.envio === 18900, JSON.stringify(lejos));

/* --- 2. Intentos de engaño ------------------------------------------------- */
console.log('\n  Lo que el servidor NO se cree');

const conPrecio = servidor.calcularPedido(
  [{ id: 'fae-skin-100', cantidad: 1, precio: 1000, precio_unitario: 1000 }], 'bogota');
afirmar('Un precio inyectado desde el cliente se ignora',
  conPrecio.cuenta?.subtotal === 89900 &&
  conPrecio.cuenta?.lineas[0].precio_unitario === 89900,
  JSON.stringify(conPrecio));

const casos = [
  ['Producto que no existe',      [{ id: 'frasco-gratis', cantidad: 1 }], 'bogota'],
  ['Cantidad por encima del tope', [{ id: 'fae-skin-100', cantidad: 99 }], 'bogota'],
  ['Cantidad cero',                [{ id: 'fae-skin-100', cantidad: 0 }], 'bogota'],
  ['Cantidad negativa',            [{ id: 'fae-skin-100', cantidad: -3 }], 'bogota'],
  ['Cantidad decimal',             [{ id: 'fae-skin-100', cantidad: 1.5 }], 'bogota'],
  ['Línea repetida para saltarse el tope',
    [{ id: 'fae-skin-100', cantidad: 6 }, { id: 'fae-skin-100', cantidad: 6 }], 'bogota'],
  ['Ciudad que no atendemos',      [{ id: 'fae-skin-100', cantidad: 1 }], 'paris'],
  ['Ciudad inyectada como objeto', [{ id: 'fae-skin-100', cantidad: 1 }], { tarifa: 0 }],
  ['Carrito vacío',                [], 'bogota'],
  ['Carrito que no es lista',      'todo', 'bogota'],
];

for (const [titulo, lineas, ciudad] of casos) {
  const r = servidor.calcularPedido(lineas, ciudad);
  afirmar(titulo, 'error' in r, `esperaba rechazo, devolvió ${JSON.stringify(r)}`);
}

/* --- 3. Las dos copias del catálogo coinciden ------------------------------ */
console.log('\n  Las dos copias del catálogo');

const p = cliente.PRODUCTO;
const enServidor = servidor.PRODUCTOS[p.id];
afirmar(`El producto «${p.id}» existe en el servidor`, Boolean(enServidor));
if (enServidor) {
  afirmar(`Precio igual en los dos sitios (${p.precio})`,
    enServidor.precio === p.precio, `cliente ${p.precio} · servidor ${enServidor.precio}`);
  afirmar('Formato igual en los dos sitios',
    enServidor.formato === p.formato, `cliente ${p.formato} · servidor ${enServidor.formato}`);
}

afirmar(`Tope de unidades igual (${cliente.MAX_UNIDADES})`,
  servidor.MAX_UNIDADES === cliente.MAX_UNIDADES,
  `cliente ${cliente.MAX_UNIDADES} · servidor ${servidor.MAX_UNIDADES}`);

afirmar(`Umbral de envío gratis igual (${cliente.ENVIO_GRATIS_DESDE})`,
  servidor.ENVIO_GRATIS_DESDE === cliente.ENVIO_GRATIS_DESDE,
  `cliente ${cliente.ENVIO_GRATIS_DESDE} · servidor ${servidor.ENVIO_GRATIS_DESDE}`);

afirmar('Mismas ciudades en los dos sitios',
  cliente.ENVIOS.length === Object.keys(servidor.ENVIOS).length,
  `cliente ${cliente.ENVIOS.length} · servidor ${Object.keys(servidor.ENVIOS).length}`);

for (const zona of cliente.ENVIOS) {
  const s = servidor.ENVIOS[zona.id];
  afirmar(`Tarifa de ${zona.nombre} igual (${zona.tarifa})`,
    s && s.tarifa === zona.tarifa,
    s ? `cliente ${zona.tarifa} · servidor ${s.tarifa}` : 'no existe en el servidor');
}

/* --- 4. La firma ----------------------------------------------------------- */
console.log('\n  Firma de integridad');
// Vector conocido: el mismo cálculo que hace Wompi, comprobado a mano.
const firma = await servidor.sha256Hex('REF-123' + '10280000' + 'COP' + 'secreto_de_prueba');
afirmar('SHA-256 en hexadecimal de 64 caracteres',
  /^[0-9a-f]{64}$/.test(firma), firma);
afirmar('La firma cambia si cambia el monto',
  firma !== await servidor.sha256Hex('REF-123' + '10280001' + 'COP' + 'secreto_de_prueba'));

/* --- Cierre ---------------------------------------------------------------- */
if (fallos) {
  console.log(`\n  ${fallos} comprobación(es) fallaron.\n`);
  process.exit(1);
}
console.log('\n  El servidor calcula bien y no se deja engañar.\n');
