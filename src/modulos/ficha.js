/**
 * Ficha de compra de la sección "Comprar".
 *
 * Mantiene su propio selector de cantidad, separado del carrito. Es
 * deliberado: aquí se decide cuántas unidades añadir, y sólo al pulsar el
 * botón esa decisión llega al carrito. Si el selector escribiera
 * directamente en el estado, cada toque en "+" abriría el panel y la
 * clienta perdería de vista la página.
 */

import { PRODUCTO, MAX_UNIDADES, ENVIO_GRATIS_DESDE, formatearPrecio } from '../datos/catalogo.js';
import { agregar } from './carrito.js';

export function montarFicha() {
  const seccion = document.querySelector('#comprar');
  if (!seccion) return;

  // El precio y los pilares salen del catálogo, no del HTML: así el
  // documento no puede desmentir al carrito si mañana cambia el precio.
  const precio = seccion.querySelector('[data-precio]');
  if (precio) precio.textContent = formatearPrecio(PRODUCTO.precio);

  const nota = seccion.querySelector('.ficha__nota');
  if (nota) {
    nota.textContent =
      `Envío gratis desde ${formatearPrecio(ENVIO_GRATIS_DESDE)}. Entrega en toda Colombia.`;
  }

  const valor = seccion.querySelector('[data-valor]');
  if (valor) {
    valor.innerHTML = PRODUCTO.valor
      .map(([titulo, texto]) => `<li><strong>${titulo}</strong><span>${texto}</span></li>`)
      .join('');
  }

  const menos = seccion.querySelector('[data-ficha-menos]');
  const mas = seccion.querySelector('[data-ficha-mas]');
  const salida = seccion.querySelector('[data-ficha-cantidad]');
  const boton = seccion.querySelector('[data-agregar]');

  let cantidad = 1;

  const refrescar = () => {
    if (salida) salida.textContent = String(cantidad);
    if (menos) menos.disabled = cantidad <= 1;
    if (mas) mas.disabled = cantidad >= MAX_UNIDADES;
  };

  menos?.addEventListener('click', () => {
    cantidad = Math.max(1, cantidad - 1);
    refrescar();
  });

  mas?.addEventListener('click', () => {
    cantidad = Math.min(MAX_UNIDADES, cantidad + 1);
    refrescar();
  });

  boton?.addEventListener('click', () => {
    agregar(cantidad);
    // Vuelve a uno: la siguiente vez que alguien pulse "añadir" querrá
    // decidir de nuevo, no arrastrar la cantidad anterior.
    cantidad = 1;
    refrescar();
  });

  refrescar();
}
