/**
 * Iconografía de línea.
 *
 * Los documentos de marca usan siempre el mismo tratamiento: trazo de 1 px,
 * sin relleno, dentro de un círculo de borde fino. Definirlos aquí como
 * cadenas —y no como archivos sueltos— tiene dos ventajas: heredan el color
 * del contexto con `currentColor`, y el grosor del trazo queda en un solo
 * sitio, así que no hay forma de que un icono acabe más grueso que sus
 * vecinos y rompa la delicadeza del conjunto.
 *
 * Todos comparten lienzo de 24×24 para que se alineen ópticamente sin
 * ajustes caso por caso.
 */

const envolver = (contenido) => `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">${contenido}</svg>`;

export const iconos = {
  /* --- Beneficios --------------------------------------------------------- */
  gota: envolver('<path d="M12 3.5c3.2 3.6 5.4 6.4 5.4 9.1A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4c0-2.7 2.2-5.5 5.4-9.1Z"/><path d="M9.6 13.1a2.4 2.4 0 0 0 2.4 2.4"/>'),

  frescura: envolver('<path d="M12 4v16M4 12h16"/><path d="M6.6 6.6 17.4 17.4M17.4 6.6 6.6 17.4"/><circle cx="12" cy="12" r="2.4"/>'),

  sol: envolver('<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/>'),

  reloj: envolver('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3 1.8"/>'),

  /* --- Anatomía del frasco ------------------------------------------------ */
  atomizador: envolver('<path d="M10 8.2h4v2.2a5 5 0 0 1 2 4v5.4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V14.4a5 5 0 0 1 2-4Z"/><path d="M10.4 5.4h3.2v2.8h-3.2z"/><path d="M17 4.4h.01M19 6.6h.01M18.4 2.6h.01"/>'),

  hoja: envolver('<path d="M19 4.6c0 7.6-4.3 12-9.6 12A4.4 4.4 0 0 1 5 12.2C5 7 9.9 4.6 19 4.6Z"/><path d="M5.6 19.4C7.9 14.2 11.6 10 16 7.6"/>'),

  prisma: envolver('<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8c-2.6 2.4-4 5.2-4 8.2s1.4 5.8 4 8.2c2.6-2.4 4-5.2 4-8.2s-1.4-5.8-4-8.2Z"/><path d="M4 12h16"/>'),

  frasco: envolver('<path d="M9.4 3.6h5.2v3.1a5.6 5.6 0 0 1 2.4 4.6v7.9a1.2 1.2 0 0 1-1.2 1.2H8.2A1.2 1.2 0 0 1 7 19.2v-7.9a5.6 5.6 0 0 1 2.4-4.6Z"/><path d="M7 14.2h10"/>'),

  /* --- Momentos de uso ---------------------------------------------------- */
  amanecer: envolver('<path d="M3.6 18h16.8"/><path d="M6.6 18a5.4 5.4 0 0 1 10.8 0"/><path d="M12 5v2.2M5.6 8.4l1.5 1.5M18.4 8.4l-1.5 1.5"/>'),
  maleta: envolver('<rect x="3.4" y="8" width="17.2" height="12" rx="1.8"/><path d="M9 8V5.6a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5.6V8"/><path d="M3.4 13.6h17.2"/>'),
  viento: envolver('<path d="M3.6 9h9.6a2.7 2.7 0 1 0-2.7-2.7"/><path d="M3.6 14h13a2.7 2.7 0 1 1-2.7 2.7"/><path d="M3.6 11.5h6.8"/>'),
  espejo: envolver('<ellipse cx="12" cy="9.6" rx="5.6" ry="6.4"/><path d="M12 16v4.4M9.2 20.4h5.6"/>'),
};

/** Devuelve un icono envuelto en el círculo de trazo fino del manual. */
export function iconoEnCirculo(nombre, clase = '') {
  const svg = iconos[nombre];
  if (!svg) return '';
  return `<span class="icono-circulo ${clase}">${svg}</span>`;
}

/** Sustituye cada `[data-icono="nombre"]` del documento por su SVG. */
export function montarIconos(raiz = document) {
  raiz.querySelectorAll('[data-icono]').forEach((el) => {
    const svg = iconos[el.dataset.icono];
    if (svg) el.innerHTML = svg;
  });
}
