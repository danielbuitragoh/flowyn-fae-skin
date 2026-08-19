/**
 * Catálogo y reglas comerciales.
 *
 * Separar estos datos del código de la tienda tiene un motivo práctico: son
 * lo primero que cambia cuando el negocio cambia, y no debería hacer falta
 * leer la lógica del carrito para subir el precio o añadir una ciudad.
 *
 * PROCEDENCIA DE LOS DATOS — importa distinguirlo:
 *
 *   · El producto, el precio y los pilares de valor salen literalmente del
 *     Marketing MIX de la marca.
 *
 *   · Las tarifas de envío, los plazos y el umbral de envío gratis NO están
 *     en ningún documento. El manual sólo promete "envíos seguros y
 *     rápidos" y sitúa al público en "ciudades principales de Colombia",
 *     sin nombrarlas ni poner cifras. Lo de abajo son decisiones tomadas
 *     para el proyecto, con valores plausibles para mensajería nacional
 *     colombiana. Están marcadas como tales para que nadie las confunda con
 *     política oficial de la marca.
 */

/* --- Producto -------------------------------------------------------------- */

export const PRODUCTO = {
  id: 'fae-skin-100',
  marca: 'flowyn',
  nombre: 'FAE SKIN',
  descriptor: 'Ethereal Skin Mist',
  formato: '100 ml',
  // Marketing MIX, diapositiva "THE VALUE".
  precio: 89900,
  moneda: 'COP',
  posicionamiento: 'Skincare premium accesible',
  // `BASE_URL` en vez de una ruta fija: en el hero esto lo resuelve Vite
  // solo porque procesa el `src` del HTML, pero aquí es una cadena dentro
  // de un archivo de datos, y sin el prefijo del repositorio la miniatura
  // del carrito se rompe en GitHub Pages aunque funcione en local.
  imagen: `${import.meta.env.BASE_URL}assets/packshot-frasco-recortado.png`,
  alt: 'Frasco de FAE SKIN, bruma facial de 100 ml en vidrio opalescente',
  // Cinco pilares de valor, literales del documento.
  valor: [
    ['Formulación', 'Ingredientes de calidad'],
    ['Packaging', 'Diseño premium y diferenciador'],
    ['Diseño', 'Estético, elegante y funcional'],
    ['Experiencia', 'Sensorial, fresca y placentera'],
    ['Portabilidad', 'Fácil de llevar y usar a diario'],
  ],
};

/** Nadie necesita doce frascos de bruma facial. El tope evita pedidos
 *  absurdos por un dedo torpe sobre el botón de sumar. */
export const MAX_UNIDADES = 6;

/* --- Envío ----------------------------------------------------------------
   DECISIÓN DE PROYECTO, no dato de marca. Ver nota de cabecera.           */

export const ENVIOS = [
  { id: 'bogota',       nombre: 'Bogotá',        tarifa: 12900, dias: '2 a 4 días hábiles' },
  { id: 'medellin',     nombre: 'Medellín',      tarifa: 12900, dias: '2 a 4 días hábiles' },
  { id: 'cali',         nombre: 'Cali',          tarifa: 12900, dias: '2 a 4 días hábiles' },
  { id: 'barranquilla', nombre: 'Barranquilla',  tarifa: 14900, dias: '3 a 5 días hábiles' },
  { id: 'cartagena',    nombre: 'Cartagena',     tarifa: 14900, dias: '3 a 5 días hábiles' },
  { id: 'bucaramanga',  nombre: 'Bucaramanga',   tarifa: 14900, dias: '3 a 5 días hábiles' },
  { id: 'otras',        nombre: 'Otra ciudad de Colombia', tarifa: 18900, dias: '4 a 7 días hábiles' },
];

/**
 * Umbral de envío gratis.
 *
 * Puesto justo por encima de un frasco y por debajo de dos: con el producto
 * a 89.900, dos unidades suman 179.800 y cruzan el umbral. Es la palanca
 * honesta para el objetivo de ticket promedio que fija el documento de
 * objetivos, sin recurrir a cuentas atrás ni a falsa escasez, que
 * contradirían el tono de la marca.
 */
export const ENVIO_GRATIS_DESDE = 150000;

/* --- Utilidades ------------------------------------------------------------ */

const formateador = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** "$ 89.900" — sin decimales, que en pesos colombianos sobran. */
export function formatearPrecio(valor) {
  return formateador.format(valor);
}

export function envioPorId(id) {
  return ENVIOS.find((e) => e.id === id) ?? ENVIOS[0];
}
