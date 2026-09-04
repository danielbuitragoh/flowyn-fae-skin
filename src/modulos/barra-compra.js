/**
 * La barra de compra que acompaña al scroll.
 *
 * El problema que resuelve es medible: antes de esto la página tenía 9.954 px
 * de alto y un solo botón de compra, situado en el píxel 9.530 — el 96 % del
 * recorrido. Quien se convencía viendo la fórmula tenía que seguir bajando
 * media página para poder pagar. Un producto con un solo precio y una sola
 * unidad de venta no debería pedir eso.
 *
 * Cuándo aparece: cuando el visitante ha pasado la sección de producto, es
 * decir, cuando ya sabe qué es y cuánto cuesta. Antes sería vender sin haber
 * contado nada; después es recordar dónde está la puerta.
 *
 * Cuándo desaparece: cuando la ficha de compra entra en pantalla. Tener el
 * mismo botón dos veces a la vista es ruido, y además obliga a la clienta a
 * decidir cuál de los dos es el bueno.
 *
 * Por qué NO usa IntersectionObserver, que era lo natural aquí: el
 * observador sólo avisa cuando el valor de `isIntersecting` cambia. Al
 * cargar, la sección de producto está por debajo del pliegue y el observador
 * entrega `false`. Si el visitante salta de golpe hasta más abajo —un enlace
 * con ancla, la tecla Fin, restaurar la posición al recargar— la sección
 * pasa a estar por encima de la ventana, que también es `false`: mismo
 * valor, ninguna notificación, y la barra no aparecía nunca. Es el mismo
 * fallo que tuvo el centinela de la barra de navegación, y se comprobó
 * saltando directamente al píxel 3.600.
 *
 * La alternativa es leer dos rectángulos, y sólo en los fotogramas en los
 * que de verdad hubo scroll. Eso es barato de verdad: dos lecturas de
 * geometría, sin escrituras, con el trabajo agrupado en un `requestAnimation
 * Frame` para no forzar recálculos a mitad de fotograma.
 */

import { agregar } from './carrito.js';
import { PRODUCTO, formatearPrecio } from '../datos/catalogo.js';

export function iniciarBarraCompra() {
  const barra = document.querySelector('[data-barra-compra]');
  const producto = document.querySelector('#producto');
  const ficha = document.querySelector('#comprar');
  if (!barra || !producto || !ficha) return;

  barra.querySelector('[data-barra-agregar]')
    ?.addEventListener('click', () => agregar(1));

  // Formato y precio salen del catálogo igual que en la ficha. Estaban
  // escritos a mano en el HTML y ningún módulo los repintaba: subir el
  // precio en `catalogo.js` dejaba esta barra —que es justo donde se pulsa
  // "añadir"— anunciando el precio viejo mientras el carrito cobraba el
  // nuevo.
  const precio = barra.querySelector('[data-barra-precio]');
  if (precio) {
    precio.textContent =
      `${PRODUCTO.formato} · ${formatearPrecio(PRODUCTO.precio)} ${PRODUCTO.moneda}`;
  }

  barra.dataset.visible = 'false';
  let pedido = false;
  // El estado que queremos, separado del que ya está pintado. Hacen falta los
  // dos: entre "hay que enseñarla" y "ya se está enseñando" pasan un par de
  // fotogramas, y sin esta variable cada evento de scroll de ese hueco
  // volvería a entrar a la rama de entrada y apilaría animaciones.
  let queremosVerla = false;

  function decidir() {
    pedido = false;

    const finDelProducto = producto.getBoundingClientRect().bottom;
    const inicioDeLaFicha = ficha.getBoundingClientRect().top;

    const debeVerse = finDelProducto <= 0 && inicioDeLaFicha > window.innerHeight;
    if (debeVerse === queremosVerla) return;
    queremosVerla = debeVerse;

    if (debeVerse) {
      // El orden importa. Un elemento con `hidden` está en `display:none`, y
      // desde ahí no hay transición posible: si se le pone el estado final
      // en el mismo fotograma en que se le quita el `hidden`, el navegador
      // calcula un solo estilo y la barra aparece de golpe. Se le quita el
      // `hidden`, se deja pasar un fotograma para que exista con su estado
      // inicial, y sólo entonces se le pide que entre.
      barra.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (queremosVerla) barra.dataset.visible = 'true';
      }));
    } else {
      barra.dataset.visible = 'false';
      // Se espera a que termine la salida para esconderla del todo. El
      // `hidden` final no es cosmético: sin él la barra sigue siendo
      // alcanzable con el tabulador aunque esté fuera de pantalla.
      const espera = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 340;
      setTimeout(() => {
        if (!queremosVerla) barra.hidden = true;
      }, espera);
    }
  }

  function alDesplazar() {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(decidir);
  }

  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alDesplazar, { passive: true });
  decidir();
}
