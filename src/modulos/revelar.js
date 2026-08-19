/**
 * Revelado progresivo al entrar en pantalla.
 *
 * Usamos IntersectionObserver en vez de escuchar el scroll porque el
 * navegador ya sabe cuándo un elemento cruza el viewport: pedírselo a él
 * evita cálculos en cada fotograma y mantiene el scroll fluido en móvil,
 * que es donde la marca va a jugarse la primera impresión.
 *
 * Una vez revelado, dejamos de observar el elemento: la animación es un
 * saludo, no un efecto que deba repetirse cada vez que se pasa por encima.
 */
export function iniciarRevelado(raiz = document) {
  const objetivos = raiz.querySelectorAll('.revelar');
  if (!objetivos.length) return;

  // Sin soporte, mostramos todo: nunca dejamos contenido invisible por una
  // capacidad ausente del navegador.
  if (!('IntersectionObserver' in window)) {
    objetivos.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        // Además de "está entrando", cuenta "ya quedó arriba". Si alguien
        // llega por un enlace de anclaje o baja de un tirón, los elementos
        // que el viewport se saltó no llegan a intersecar nunca — y con
        // sólo `isIntersecting` se quedaban en opacidad cero para siempre,
        // invisibles al volver a subir.
        const yaPaso = entrada.boundingClientRect.bottom <= 0;
        if (!entrada.isIntersecting && !yaPaso) continue;
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      }
    },
    // El margen inferior negativo hace que el elemento se revele cuando ya
    // entró de verdad en el campo de lectura, no al asomar un píxel.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  objetivos.forEach((el) => observador.observe(el));
}
