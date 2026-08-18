/**
 * Inserta el logotipo como SVG en línea.
 *
 * Va en línea y no como <img> para poder teñirlo con currentColor: el mismo
 * archivo sirve en caoba sobre crema y en crema sobre caoba, sin duplicar
 * activos ni arriesgar que las dos versiones se desincronicen.
 *
 * El trazado viene de vectorizar el logotipo original de la marca, así que
 * conserva la ligadura de la "fl" y el descendente largo de la "y", que son
 * justo los rasgos que una fuente de sistema no puede reproducir.
 */
import logoFlowyn from '/assets/logo-flowyn.svg?raw';

export function montarLogo(destino) {
  if (!destino) return;
  destino.innerHTML = logoFlowyn;
  const svg = destino.querySelector('svg');
  if (svg) {
    svg.setAttribute('class', 'hero__logo-svg');
    svg.style.width = '100%';
    svg.style.height = 'auto';
  }
}
