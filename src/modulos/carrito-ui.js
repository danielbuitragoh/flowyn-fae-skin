/**
 * Panel del carrito.
 *
 * Traduce el estado a pantalla y las acciones de la clienta a llamadas al
 * estado. No calcula precios ni decide tarifas: eso vive en `carrito.js`,
 * para que exista una sola respuesta a "cuánto cuesta esto".
 *
 * El panel es un diálogo modal de verdad, no una capa bonita: atrapa el
 * foco mientras está abierto, se cierra con Escape, devuelve el foco al
 * botón que lo abrió y bloquea el scroll de la página. Ese comportamiento
 * vive en `modal.js`, compartido con el panel de cuenta.
 */

import isotipo from '/assets/isotipo-gota.svg?raw';
import { PRODUCTO, MAX_UNIDADES, ENVIOS, ENVIO_GRATIS_DESDE, formatearPrecio } from '../datos/catalogo.js';
import {
  obtenerLineas, obtenerCiudad, totales, unidades, estaVacio,
  fijarCantidad, quitar, fijarCiudad, alCambiar,
} from './carrito.js';
import { crearModal, conFocoPreservado } from './modal.js';
import { irAPagar } from '../servicios/pago.js';
import { leerEnvio, guardarEnvio, revisarEnvio } from './envio-datos.js';

export function montarCarrito() {
  const panel = document.querySelector('[data-carrito]');
  const velo = document.querySelector('[data-velo-carrito]');
  if (!panel || !velo) return;

  const cuerpo = panel.querySelector('[data-carrito-cuerpo]');
  const pie = panel.querySelector('[data-carrito-pie]');
  const iso = panel.querySelector('[data-carrito-iso]');
  if (iso) iso.innerHTML = isotipo;

  let recienAgregado = false;
  // El panel tiene dos pasos: la bandeja y los datos de envío. Se hace en dos
  // y no todo junto porque siete campos en la primera pantalla del carrito
  // convierten "mira lo que llevas" en "rellena un formulario", y eso se
  // paga en carritos abandonados. Se piden cuando ya hay una decisión.
  let paso = 'bandeja';
  let datos = leerEnvio();
  let fallos = {};

  const { abrir, cerrar } = crearModal({ panel, velo });

  document.querySelectorAll('[data-abrir-carrito]').forEach((b) => {
    b.addEventListener('click', () => abrir(b));
  });

  /* --- Pintado --------------------------------------------------------------- */

  function pintarVacio() {
    cuerpo.innerHTML = `
      <div class="carrito__vacio">
        <img src="${PRODUCTO.imagen}" alt="" aria-hidden="true" />
        <strong>Tu bandeja está lista</strong>
        <p>Cuando añadas FAE SKIN aparecerá aquí, con su envío y su total.</p>
      </div>`;
    pie.hidden = true;
  }

  function pintarLineas() {
    const lineas = obtenerLineas();

    cuerpo.innerHTML = lineas.map((l) => `
      <article class="linea${recienAgregado ? ' linea--nueva' : ''}">
        <div class="linea__foto">
          <img src="${l.producto.imagen}" alt="" aria-hidden="true" />
        </div>
        <div>
          <p class="linea__nombre">${l.producto.nombre}</p>
          <p class="linea__meta">${l.producto.descriptor} · ${l.producto.formato}</p>

          <div class="cantidad">
            <button type="button" data-menos="${l.id}"
                    aria-label="Quitar una unidad"${l.cantidad <= 1 ? ' disabled' : ''}>−</button>
            <!-- Sin aria-live: el anuncio lo da la región estable del pie.
                 Dos regiones vivas describiendo el mismo cambio hacen que
                 el lector lo lea dos veces. -->
            <output aria-label="Unidades">${l.cantidad}</output>
            <button type="button" data-mas="${l.id}"
                    aria-label="Añadir una unidad"${l.cantidad >= MAX_UNIDADES ? ' disabled' : ''}>+</button>
          </div>

          <div class="linea__pie">
            <span class="linea__precio">${formatearPrecio(l.producto.precio * l.cantidad)}</span>
            <button type="button" class="linea__quitar" data-quitar="${l.id}">Quitar</button>
          </div>
        </div>
      </article>
    `).join('') + pintarEnvio();

    pie.hidden = false;
    pintarResumen();
    recienAgregado = false;
  }

  function pintarEnvio() {
    const t = totales();
    const ciudad = obtenerCiudad();
    const avance = Math.min(100, (t.subtotal / ENVIO_GRATIS_DESDE) * 100);

    const opciones = ENVIOS.map((e) =>
      `<option value="${e.id}"${e.id === ciudad ? ' selected' : ''}>${e.nombre}</option>`).join('');

    const mensaje = t.envioGratis
      ? '<p><strong>Tu envío es gratis.</strong></p>'
      : `<p>Te faltan <strong>${formatearPrecio(t.faltaParaGratis)}</strong> para el envío gratis.</p>`;

    return `
      <div class="envio">
        <label class="envio__etiqueta" for="envio-ciudad">Ciudad de envío</label>
        <select id="envio-ciudad" data-ciudad>${opciones}</select>
        <p class="envio__plazo">Entrega estimada: ${t.zona.dias}.</p>

        <div class="progreso">
          <div class="progreso__pista">
            <div class="progreso__barra" style="--avance:${avance.toFixed(1)}%"></div>
          </div>
          ${mensaje}
        </div>
      </div>`;
  }


  /** Un campo del formulario de envío. */
  function campo(id, etiqueta, opciones = {}) {
    const { tipo = 'text', pista = '', ayuda = '', modo = '', auto = '', obligatorio = false } = opciones;
    const malo = fallos[id];
    return `
      <p class="campo${malo ? ' campo--malo' : ''}">
        <label for="envio-${id}">${etiqueta}${obligatorio ? '' : ' <em>(opcional)</em>'}</label>
        <input id="envio-${id}" name="${id}" type="${tipo}"
               ${modo ? `inputmode="${modo}"` : ''} ${auto ? `autocomplete="${auto}"` : ''}
               value="${(datos[id] || '').replace(/"/g, '&quot;')}"
               placeholder="${pista}"
               ${malo ? `aria-invalid="true" aria-describedby="envio-${id}-error"` : ''} />
        ${malo
          ? `<span class="campo__error" id="envio-${id}-error">${malo}</span>`
          : (ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : '')}
      </p>`;
  }

  /**
   * Los campos van en el cuerpo del panel y los botones en el pie.
   *
   * La primera versión metió el formulario entero en el pie, que es lo que
   * ya sostenía el resumen y el botón de pagar. El pie no hace scroll —es la
   * franja fija de abajo—, así que con siete campos dentro "Ir a pagar"
   * quedaba por debajo del borde de la pantalla y no había forma de llegar
   * a él: la tienda entera se volvía inservible en cuanto alguien intentaba
   * comprar. Se detectó porque la prueba no consiguió pulsar el botón.
   *
   * Partido así, además, el total y el botón quedan siempre a la vista
   * mientras se rellena, que es como se comporta cualquier checkout serio.
   */
  function pintarFormulario() {
    const esOtra = obtenerCiudad() === 'otras';
    cuerpo.innerHTML = `
      <form class="envio-datos" id="form-envio" data-form-envio novalidate>
        <p class="envio-datos__titulo">¿A dónde lo enviamos?</p>

        ${campo('destinatario', 'Quién recibe', {
          pista: 'Nombre y apellido', auto: 'name', obligatorio: true })}
        ${campo('telefono', 'Celular', {
          tipo: 'tel', modo: 'numeric', pista: '300 123 4567', auto: 'tel-national',
          ayuda: 'Para avisarte cuando el mensajero esté abajo.', obligatorio: true })}
        ${esOtra ? campo('departamento', 'Municipio y departamento', {
          pista: 'Manizales, Caldas', obligatorio: true }) : ''}
        ${campo('direccion', 'Dirección', {
          pista: 'Calle 45 # 12-34', auto: 'street-address', obligatorio: true })}
        ${campo('complemento', 'Apartamento, torre o interior', {
          pista: 'Apto 501, Torre B' })}
        ${campo('barrio', 'Barrio', { pista: 'Chapinero Alto',
          ayuda: 'No lo pide la transportadora, pero es lo que usa el mensajero.' })}
        ${campo('indicaciones', 'Cómo llegar', { pista: 'Portería azul, timbre 3' })}
      </form>`;

    const t = totales();
    pie.innerHTML = `
      <div class="resumen">
        <div><span>Envío${t.envioGratis ? '' : ` · ${t.zona.nombre}`}</span>
             <span class="${t.envioGratis ? 'gratis' : ''}">${t.envioGratis ? 'Gratis' : formatearPrecio(t.envio)}</span></div>
        <div class="resumen__total"><span>Total</span><span>${formatearPrecio(t.total)}</span></div>
      </div>

      <div class="envio-datos__acciones">
        <button type="button" class="boton boton--fantasma" data-volver-bandeja>Volver</button>
        <button type="submit" form="form-envio" class="boton boton--principal" data-ir-al-pago>Ir a pagar</button>
      </div>

      <p class="carrito__aviso" data-malo="false" aria-live="polite">
        Pago seguro con Wompi. El total se calcula en el servidor.
      </p>
      <p class="envio-datos__legal">
        Entrega en el plazo indicado. Tienes cinco días hábiles desde que lo
        recibes para retractarte, y devolvemos el dinero en máximo quince días
        calendario.
      </p>`;
  }

  /** Lee el formulario tal y como está escrito ahora mismo. */
  function recogerFormulario() {
    const form = panel.querySelector('[data-form-envio]');
    if (!form) return datos;
    const leidos = { ...datos };
    for (const input of form.querySelectorAll('input[name]')) {
      leidos[input.name] = input.value;
    }
    return leidos;
  }

  function pintarResumen() {
    const t = totales();
    pie.innerHTML = `
      <div class="resumen">
        <div><span>Subtotal</span><span>${formatearPrecio(t.subtotal)}</span></div>
        <div>
          <span>Envío${t.envioGratis ? '' : ` · ${t.zona.nombre}`}</span>
          <span class="${t.envioGratis ? 'gratis' : ''}">${t.envioGratis ? 'Gratis' : formatearPrecio(t.envio)}</span>
        </div>
        <div class="resumen__total"><span>Total</span><span>${formatearPrecio(t.total)}</span></div>
      </div>

      <button type="button" class="boton boton--principal" data-continuar>Continuar</button>
      <p class="carrito__aviso" data-malo="false" aria-live="polite">
        Siguiente paso: a dónde te lo enviamos.
      </p>`;
  }

  function pintar() {
    // Si el botón reaparece deshabilitado (bajaste a una unidad), el foco va
    // a su hermano en lugar de perderse en el vacío.
    conFocoPreservado(
      panel,
      ['mas', 'menos', 'quitar', 'ciudad'],
      () => { if (estaVacio()) pintarVacio(); else pintarLineas(); },
      { menos: 'mas', mas: 'menos', quitar: 'mas' },
    );
    if (paso === 'envio' && !estaVacio()) pintarFormulario();
    actualizarContadores();
    anunciar();
  }

  /**
   * Anuncio para lectores de pantalla.
   *
   * Va en una región que no se repinta nunca. Poner el `aria-live` dentro
   * del contenido que se regenera no funciona: al sustituirse el nodo, la
   * región es nueva y muchos lectores no la anuncian.
   */
  function anunciar() {
    const region = panel.querySelector('[data-anuncio]');
    if (!region) return;
    const n = unidades();
    const t = totales();
    region.textContent = n === 0
      ? 'La bandeja está vacía.'
      : `${n} ${n === 1 ? 'unidad' : 'unidades'}. Total ${formatearPrecio(t.total)}.`;
  }

  function actualizarContadores() {
    const n = unidades();
    document.querySelectorAll('[data-cuenta-carrito]').forEach((el) => {
      el.textContent = String(n);
      el.dataset.vacio = n === 0 ? 'true' : 'false';
    });
  }

  /* --- Acciones ---------------------------------------------------------------
     Delegación en el contenedor: el contenido se vuelve a pintar entero en
     cada cambio, así que enganchar oyentes a cada botón dejaría un rastro
     de escuchas muertas.                                                   */

  cuerpo.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;

    const linea = obtenerLineas()[0];
    if (b.dataset.mas && linea) fijarCantidad(b.dataset.mas, linea.cantidad + 1);
    else if (b.dataset.menos && linea) fijarCantidad(b.dataset.menos, linea.cantidad - 1);
    else if (b.dataset.quitar) quitar(b.dataset.quitar);
  });

  cuerpo.addEventListener('change', (e) => {
    if (!e.target.matches('[data-ciudad]')) return;
    fijarCiudad(e.target.value);
    // Cambiar de ciudad cambia qué campos hacen falta: con "otra ciudad"
    // aparece el del municipio. Si el formulario está abierto, se repinta.
    if (paso === 'envio') pintarFormulario();
  });

  // Paso 1 -> paso 2. El foco entra al primer campo: quien navega con teclado
  // acaba de pulsar un botón que cambió todo el pie del panel, y dejarle el
  // foco en un botón que ya no existe lo manda al principio del documento.
  pie.addEventListener('click', (e) => {
    if (e.target.closest('[data-continuar]')) {
      paso = 'envio';
      fallos = {};
      pintarFormulario();
      cuerpo.querySelector('input')?.focus();
    }
    if (e.target.closest('[data-volver-bandeja]')) {
      // Lo escrito no se tira por volver atrás a mirar el total.
      datos = recogerFormulario();
      guardarEnvio(datos);
      paso = 'bandeja';
      pintarLineas();
      pintarResumen();
      pie.querySelector('[data-continuar]')?.focus();
    }
  });

  panel.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-form-envio]')) return;
    e.preventDefault();
    const boton = pie.querySelector('[data-ir-al-pago]');
    if (!boton) return;

    datos = recogerFormulario();
    guardarEnvio(datos);

    // Se revisa aquí antes de crear nada. El servidor lo vuelve a revisar —lo
    // que llega del navegador es una propuesta— pero enterarte de que falta
    // el número de la casa después de que la página te haya mandado a la
    // pasarela es una experiencia pésima.
    const habiaFallos = Object.keys(fallos).length > 0;
    fallos = revisarEnvio(datos, obtenerCiudad());
    if (Object.keys(fallos).length) {
      pintarFormulario();
      cuerpo.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    // Si en el intento anterior había errores, hay que repintar aunque ahora
    // esté todo bien: si no, los mensajes en rojo del intento anterior siguen
    // en pantalla junto a campos que la clienta ya corrigió, y parece que la
    // página no se ha enterado.
    if (habiaFallos) pintarFormulario();

    const aviso = pie.querySelector('.carrito__aviso');
    const decir = (texto, malo = false) => {
      if (!aviso) return;
      aviso.textContent = texto;
      aviso.dataset.malo = malo ? 'true' : 'false';
    };

    // El botón se bloquea mientras dura la petición. Sin esto, dos clics
    // seguidos crean dos pedidos con dos referencias distintas y la clienta
    // acaba pagando el que no era.
    boton.disabled = true;
    const textoOriginal = boton.textContent;
    boton.textContent = 'Preparando el pago…';
    decir('Estamos creando tu pedido.');

    const resultado = await irAPagar({
      lineas: obtenerLineas(), ciudad: obtenerCiudad(), envio: datos,
    });

    if (resultado.ok) {
      // La referencia se guarda antes de salir: al volver de Wompi la página
      // se carga de cero y es lo único que queda para saber qué pedido era.
      try { sessionStorage.setItem('flowyn:pedido', resultado.referencia); } catch { /* modo privado */ }
      decir('Te llevamos a la pasarela de pago…');
      window.location.assign(resultado.url);
      return;
    }

    boton.disabled = false;
    boton.textContent = textoOriginal;

    if (resultado.motivo === 'envio_invalido') {
      decir(resultado.mensaje, true);
      return;
    }

    if (resultado.motivo === 'sin_sesion') {
      decir('Entra en tu cuenta para poder guardar el pedido.', true);
      // La puerta se abre sola en vez de sólo decir dónde está.
      cerrar();
      document.querySelector('[data-abrir-cuenta]')?.click();
      return;
    }

    decir(resultado.mensaje, true);
  });

  /* --- Enlace con el estado ---------------------------------------------------- */

  alCambiar(({ motivo }) => {
    recienAgregado = motivo === 'agregar';
    pintar();
    // Sólo se abre solo cuando la clienta acaba de añadir algo. Entrar con
    // Google también cambia el carrito (se fusiona con el de la cuenta),
    // pero abrirle el panel en la cara al volver de Google sería una
    // interrupción, no una confirmación.
    if (motivo === 'agregar') abrir(document.querySelector('[data-abrir-carrito]'));
  });

  pintar();

  return { abrir, cerrar };
}
