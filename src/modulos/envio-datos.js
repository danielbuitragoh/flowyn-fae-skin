/**
 * Los datos de envío.
 *
 * Hasta ahora el pedido sólo guardaba la ciudad. Con eso se puede cobrar,
 * pero no se puede despachar: para que una transportadora colombiana recoja
 * el paquete hacen falta el nombre de quien recibe, una dirección completa,
 * la ciudad y un celular al que llamar cuando el mensajero esté abajo. Sin
 * esos campos, cada pedido pagado obligaba a escribirle a la clienta para
 * preguntarle a dónde se lo mandamos.
 *
 * Qué NO se pide, y es una decisión, no un olvido:
 *
 *   · Código postal. En Colombia es opcional y casi nadie se lo sabe. Es
 *     fricción a cambio de un dato que la transportadora ignora.
 *
 *   · Cédula. Se le exige al remitente —nosotros—, no a quien recibe, y sólo
 *     hace falta para pagar por PSE. En ese caso la pide el checkout de
 *     Wompi a quien elige ese método, en vez de pedírsela a todo el mundo.
 *
 * La dirección va en un campo de texto libre y no troceada en "Calle" /
 * "Carrera" con números aparte. La nomenclatura colombiana parece regular y
 * no lo es: hay Diagonales, Transversales, Avenidas, sufijos Bis, Sur y
 * Este, y cada municipio la acomodó a la trama que ya tenía. Un formulario
 * estructurado se rompe con la primera dirección de Medellín o con la
 * primera vereda, y deja a esa clienta sin poder comprar.
 */

const CLAVE = 'flowyn.envio.v1';

const VACIO = {
  destinatario: '', telefono: '', departamento: '',
  direccion: '', complemento: '', barrio: '', indicaciones: '',
};

/** Se guarda en el navegador para que quien vuelva no lo reescriba todo. */
export function leerEnvio() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...VACIO };
    const d = JSON.parse(crudo);
    if (!d || typeof d !== 'object') return { ...VACIO };
    const limpio = { ...VACIO };
    for (const k of Object.keys(VACIO)) {
      if (typeof d[k] === 'string') limpio[k] = d[k];
    }
    return limpio;
  } catch {
    return { ...VACIO };
  }
}

export function guardarEnvio(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...VACIO, ...datos }));
  } catch { /* modo privado o cuota llena: no vale la pena romper la compra */ }
}

/**
 * Las mismas reglas que corren en el servidor.
 *
 * Duplicarlas aquí no es desconfiar del servidor: es que enterarse de que
 * falta el número de la casa **después** de que la página te mande a Wompi
 * es una experiencia pésima. El servidor sigue teniendo la última palabra —
 * lo que llega del navegador es una propuesta— pero el formulario avisa
 * antes, junto al campo, que es donde se puede arreglar.
 */
export function revisarEnvio(d, ciudadId) {
  const fallos = {};

  if (!d.destinatario || d.destinatario.trim().length < 3) {
    fallos.destinatario = 'Escribe el nombre de quien recibe.';
  }

  // Se aceptan espacios, guiones y el +57 al escribir, y se quitan antes de
  // comparar: rechazar "310 555 1234" por el espacio es maltratar a quien lo
  // escribió bien. Todos los celulares colombianos empiezan por 3 y tienen
  // diez dígitos.
  const tel = (d.telefono || '').replace(/[\s()-]/g, '').replace(/^\+?57/, '');
  if (!/^3\d{9}$/.test(tel)) {
    fallos.telefono = 'Diez dígitos, empezando por 3.';
  }

  if (!d.direccion || d.direccion.trim().length < 6) {
    fallos.direccion = 'La dirección completa, con número.';
  }

  if (ciudadId === 'otras' && (!d.departamento || d.departamento.trim().length < 3)) {
    fallos.departamento = 'Dinos el municipio y el departamento.';
  }

  return fallos;
}
