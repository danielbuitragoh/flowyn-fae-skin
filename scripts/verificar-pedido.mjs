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
 *    olvida del otro, la tienda enseñaría un precio y el pedido que llega
 *    por WhatsApp diría otro. Aquí se comparan y la construcción falla si no
 *    coinciden.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVIDOR_TS = 'supabase/funciones/_compartido/catalogo.ts';
const CLIENTE_JS = 'src/datos/catalogo.js';

/* --- Cargar el módulo del servidor (es TypeScript) ------------------------ */
const temporal = mkdtempSync(join(tmpdir(), 'flowyn-'));

/* En Windows el ejecutable que npm deja en `.bin` es un `.cmd`, no el
   binario a secas: `execFileSync` no resuelve esa extensión sola y el script
   moría con ENOENT antes de comprobar nada. El proyecto se desarrolla en
   Windows y se verifica en Linux (Actions), así que la ruta se decide según
   la plataforma en vez de asumir una de las dos. */
const BIN = process.platform === 'win32'
  ? 'node_modules/.bin/esbuild.cmd'
  : 'node_modules/.bin/esbuild';

/* El catálogo del cliente usa `import.meta.env.BASE_URL`, que sólo existe
   dentro de Vite. Los dos se pasan por esbuild: el del servidor porque es
   TypeScript, y el del cliente para sustituir esa variable por algo que
   Node entienda. Aquí no se prueban rutas de imágenes, sólo cifras. */
function cargar(entrada, nombre, define = []) {
  const salida = join(temporal, nombre);
  execFileSync(BIN, [
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

/* --- 4. Los datos de envío ---------------------------------------------------
   Un pedido pagado con la dirección en blanco es un pedido que no se puede
   despachar, y eso sólo se descubre cuando ya cobraste. Estas comprobaciones
   son al validador de envío lo que las de arriba son al de precios.        */
console.log('\n  Datos de envío');

const bueno = {
  destinatario: 'Gabriela Chávez',
  telefono: '3105551234',
  direccion: 'Calle 45 # 12-34',
  complemento: 'Apto 501',
  barrio: 'Chapinero Alto',
  indicaciones: 'Portería azul',
};
const con = (cambios) => ({ ...bueno, ...cambios });
const acepta = (nombre, datos, ciudad = 'bogota') => {
  const r = servidor.validarEnvio(datos, ciudad);
  afirmar(nombre, !('error' in r), 'error' in r ? r.error : '');
  return r;
};
const rechaza = (nombre, datos, ciudad = 'bogota') => {
  const r = servidor.validarEnvio(datos, ciudad);
  afirmar(nombre, 'error' in r, 'lo aceptó');
};

const completo = acepta('Unos datos completos pasan', bueno);

// El departamento NO se acepta del navegador para las ciudades que conocemos:
// si llegara "Bogotá" con departamento "Amazonas", el paquete se despacharía
// mal por un dato que teníamos correcto.
afirmar('El departamento lo pone el servidor, no el navegador',
  !('error' in completo) && completo.envio.departamento === 'Bogotá D.C.',
  !('error' in completo) ? completo.envio.departamento : '');
const inyectado = servidor.validarEnvio(con({ departamento: 'Amazonas' }), 'medellin');
afirmar('Un departamento inyectado se ignora',
  !('error' in inyectado) && inyectado.envio.departamento === 'Antioquia',
  !('error' in inyectado) ? inyectado.envio.departamento : '');

// El teléfono se normaliza en vez de rechazarse por cómo se escribió.
for (const [escrito, esperado] of [
  ['310 555 1234', '3105551234'],
  ['+57 310 555 1234', '3105551234'],
  ['310-555-1234', '3105551234'],
]) {
  const r = servidor.validarEnvio(con({ telefono: escrito }), 'cali');
  afirmar(`"${escrito}" se normaliza a ${esperado}`,
    !('error' in r) && r.envio.telefono === esperado,
    'error' in r ? r.error : r.envio.telefono);
}

rechaza('Sin nombre de quien recibe', con({ destinatario: '' }));
rechaza('Nombre de dos letras', con({ destinatario: 'Ab' }));
rechaza('Teléfono fijo, no celular', con({ telefono: '6012345678' }));
rechaza('Teléfono de nueve dígitos', con({ telefono: '310555123' }));
rechaza('Teléfono con letras', con({ telefono: '31055512ab' }));
rechaza('Dirección vacía', con({ direccion: '' }));
rechaza('Dirección demasiado corta', con({ direccion: 'Cll 1' }));
rechaza('Datos que no son un objeto', 'Calle 45');
rechaza('Datos nulos', null);
rechaza('"Otra ciudad" sin municipio', con({ departamento: '' }), 'otras');

const otra = servidor.validarEnvio(con({ departamento: 'Manizales, Caldas' }), 'otras');
afirmar('"Otra ciudad" sí acepta el municipio escrito a mano',
  !('error' in otra) && otra.envio.departamento === 'Manizales, Caldas',
  'error' in otra ? otra.error : otra.envio.departamento);

// Los campos largos se recortan en vez de reventar la restricción de la base.
const largo = servidor.validarEnvio(con({ direccion: 'C'.repeat(400) }), 'bogota');
afirmar('Una dirección larguísima se recorta a 160',
  !('error' in largo) && largo.envio.direccion.length === 160,
  'error' in largo ? largo.error : String(largo.envio.direccion.length));

/* --- Cierre ---------------------------------------------------------------- */
if (fallos) {
  console.log(`\n  ${fallos} comprobación(es) fallaron.\n`);
  process.exit(1);
}
console.log('\n  El servidor calcula bien y no se deja engañar.\n');
