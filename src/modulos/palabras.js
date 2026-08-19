/**
 * El titular del hero, palabra por palabra.
 *
 * La idea viene de una página de referencia que Dan encontró: en vez de que
 * el titular entre como un bloque, cada palabra se materializa por su cuenta
 * con un desenfoque que se va. Encaja mejor aquí que en el original — la
 * marca se llama "niebla", y esto es literalmente una frase condensándose.
 *
 * Lo que NO se hace: partir el texto por letras. Una letra suelta no es
 * ninguna unidad de lectura, y romper las palabras rompe también cómo lo
 * anuncia un lector de pantalla. Se parte por palabras, y el texto completo
 * se conserva en un `aria-label` para que quien escuche la página oiga una
 * frase y no una lista de trozos.
 *
 * El escalonado es corto (70 ms) a propósito. Más lento se lee como un
 * teletipo, y un titular que tarda dos segundos en poder leerse es un
 * titular que estorba.
 */

const RETARDO = 70;   // ms entre palabra y palabra
const BASE = 340;     // ms antes de la primera, para que no pise a la entrada

export function iniciarPalabras() {
  const objetivos = document.querySelectorAll('[data-palabras]');
  if (!objetivos.length) return;

  // Con movimiento reducido no se toca el marcado siquiera: el titular se
  // queda como vino del HTML.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const el of objetivos) {
    const texto = el.textContent.trim().replace(/\s+/g, ' ');
    if (!texto) continue;

    // La frase entera queda para quien escucha; los trozos son sólo pintura.
    el.setAttribute('aria-label', texto);

    el.textContent = '';
    texto.split(' ').forEach((palabra, i) => {
      const span = document.createElement('span');
      span.className = 'palabra';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--retardo-palabra', `${BASE + i * RETARDO}ms`);
      span.textContent = palabra;
      el.append(span, document.createTextNode(' '));
    });

    el.dataset.palabrasListo = 'true';
  }
}
