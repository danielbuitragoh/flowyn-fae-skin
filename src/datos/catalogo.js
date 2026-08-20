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
  // La miniatura y no el packshot: en el carrito esta imagen se pinta a 80 px
  // y estaba descargando un PNG de 1 MB para hacerlo. La miniatura pesa 26 KB.
  imagen: `${import.meta.env.BASE_URL}assets/frasco-miniatura.webp`,
  alt: 'Frasco de FAE SKIN, bruma facial de 100 ml en vidrio opalescente',
  // Los cinco pilares de valor del Marketing MIX, con el dato real detrás
  // de cada uno.
  //
  // Los titulares son los de Gabriela y no se tocan. Lo que cambia es la
  // segunda línea: "Ingredientes de calidad", "Diseño premium y
  // diferenciador", "Estético, elegante y funcional"… son adjetivos que
  // cualquier marca de cualquier categoría podría firmar sin cambiar una
  // coma, y en una ficha de producto —donde alguien está decidiendo si
  // gasta 89.900 pesos— no responden a ninguna pregunta. Las HIG lo dicen
  // en una línea: claridad antes que ingenio, y fuera las palabras que no
  // hacen falta.
  //
  // No hay nada inventado aquí. Los activos salen del panel de fórmula, las
  // medidas y los acabados del despiece técnico que envió Gabriela, y el
  // aroma de la pirámide olfativa. Son los mismos datos que ya están en la
  // página; lo único nuevo es que ahora también están donde se compra.
  valor: [
    ['Formulación', 'Ácido hialurónico, pantenol, niacinamida y ectoína'],
    ['Packaging', 'Vidrio opalino iridiscente, atomizador y tapa en oro rosa'],
    ['Diseño', '17,5 × 5,8 cm · base ovalada, estable sobre el lavamanos'],
    ['Experiencia', 'Bruma ultrafina · aroma Ethereal Cotton, de baja intensidad'],
    ['Portabilidad', '100 ml — el máximo que se puede subir al avión en cabina'],
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
