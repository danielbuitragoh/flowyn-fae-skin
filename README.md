<div align="center">

# flowyn · FAE SKIN

**Landing page y tienda de una bruma facial de tratamiento.**

*Ethereal Beauty in Motion*

🎨 **Dirección creativa:** Gabriela Chávez Castellano · 💻 **Desarrollo:** Daniel Buitrago

</div>

---

## Qué es

Una página de producto único para **FAE SKIN — Ethereal Skin Mist**, la bruma facial de 100 ml de la marca flowyn. No es un catálogo: es una sola historia que empieza en la identidad de la marca y termina en el carrito.

La marca es un proyecto de Gabriela Chávez —nombre, identidad visual, posicionamiento, campaña y desarrollo de producto son suyos—. Mi parte es traducir ese universo a una experiencia web que se sostenga técnicamente: catálogo, carrito, autenticación y checkout, sin servidor de pago.

El material de partida son tres documentos de marca: Marketing MIX, Objetivos SMART y Desarrollo del Producto. Todo lo que dice esta web —el precio, los claims, los ingredientes, la pirámide olfativa, el recorrido de uso— sale de ahí. No inventé copy de relleno.

## Lo que más me interesa que se mire

**El frasco es un modelo 3D, no una foto.** El manual describe el envase como "vidrio translúcido con reflejos iridiscentes". Una fotografía congela una única incidencia de luz, y el iridiscente sólo se entiende cuando el objeto gira y los reflejos se desplazan por la superficie. El frasco del hero es geometría generada por código —un sólido de revolución con estrías retorcidas— con vidrio refractivo e iridiscencia física, y se puede arrastrar para girarlo.

El perfil no está dibujado a ojo: se midió sobre el canal alfa del packshot, tomando el semiancho fila a fila. De ahí salen la proporción real del envase (2.45 de alto por 1 de ancho) y el hombro casi recto del tercio superior, que es lo que lo hace reconocible. Describirlo así pesa unos cientos de bytes en lugar de los megas de una malla exportada, y se ajusta editando números.

Hay dos acabados para ese mismo vidrio. Con GPU, refracción real: la luz atraviesa el frasco y arrastra el fondo consigo. Sin GPU —rasterizado por software, donde la refracción o sale plana o corre a cinco fotogramas por segundo— se usa un nácar translúcido que conserva la iridiscencia y se dibuja en una sola pasada. Y si el equipo no da ni para eso, o el visitante pidió menos movimiento, se queda la fotografía. three.js viaja en su propio fragmento diferido, así que la página es usable mucho antes de que llegue: el 3D es una mejora, nunca un requisito para ver el producto.

**La paleta no se tocó, se separó.** El manual de marca es monocromo cálido: crema, nude, cobre, caoba. Precioso en muestras grandes, pero medí los pares y tres fallaban WCAG AA en texto pequeño — el cobre de las etiquetas daba 3.01:1 sobre crema, cuando el mínimo es 4.5:1. La salida fácil habría sido oscurecer la marca. En vez de eso, los tonos originales se quedan para superficies, filetes y acentos, y para texto hay variantes más profundas del mismo color. Un verificador corre en cada push y falla la construcción si alguien rompe el equilibrio.

**El frasco flota, y eso no es un capricho.** El manual repite una imagen: *"una nube dulce flotando en el aire"*. Si el packshot estuviera apoyado sobre una superficie con su sombra debajo, la promesa de la marca se rompería en el primer segundo. Por eso el frasco deriva muy despacio, la luz nace detrás de él, y lo único que hay abajo es la memoria de un reflejo.

**El logotipo es vectorial, no una imagen.** Lo extraje de los documentos originales y lo vectoricé, así que conserva la ligadura de la `fl` y el descendente largo de la `y` — los dos rasgos que ninguna fuente de sistema reproduce. Va en línea como SVG y se tiñe con `currentColor`, de modo que el mismo archivo sirve en caoba sobre crema y en crema sobre caoba.

**Las fuentes las servimos nosotros.** Cormorant Garamond y Jost van autoalojadas en lugar de pedirlas al CDN de Google: una petición menos a un tercero, ningún dato del visitante saliendo fuera, y el texto no parpadea si ese CDN va lento.

**Nada aparece de golpe.** El desplazamiento del revelado es corto a propósito. Largo se lee como "animación web"; corto se lee como bruma asentándose. Y quien pida menos movimiento en su sistema recibe menos movimiento: la identidad de la marca es la calma, así que apagar las animaciones no le quita nada esencial.

## Cómo está armado

| Pieza | Qué es |
|---|---|
| `src/estilos/tokens.css` | Paleta, tipografía, ritmo y movimiento. Fuente única de verdad |
| `src/estilos/` | Base, navegación y una hoja por sección |
| `src/modulos/` | JavaScript por responsabilidad: revelado, atmósfera, marca, navegación |
| `public/assets/` | Logotipo y isotipo vectorizados, packshots y fotografía de campaña |
| `scripts/verificar-contraste.mjs` | Mide la paleta contra WCAG AA y falla si algo no cumple |

## Correrlo

```bash
npm install
npm run dev        # servidor de desarrollo
npm run verificar  # contraste + construcción
npm run build      # genera dist/
```

## Estado

Este repositorio está en construcción. Lo que ya funciona y lo que falta:

- [x] **Fase 0** — Activos de marca, sistema de diseño, verificador de contraste, hero
- [x] **Fase 1** — Secciones de producto, ritual, fórmula y aroma, y frasco en 3D
- [ ] **Fase 2** — Carrito y cálculo de envío por ciudad
- [ ] **Fase 3** — Autenticación con Google
- [ ] **Fase 4** — Checkout con firma del pago en servidor
- [ ] **Fase 5** — Accesibilidad, responsive y despliegue

## Sobre los pagos

Cuando llegue el checkout irá contra el **entorno de pruebas de Wompi**, no contra producción. El motivo es simple: flowyn es una marca de proyecto, no una sociedad con NIT, y no puede ni debe recibir dinero real. El flujo es idéntico al de producción y se puede recorrer entero con las tarjetas de prueba que Wompi publica.

La firma de integridad se calculará en una función de servidor, no en el navegador. Es la diferencia entre tener un checkout y entender por qué un checkout se firma del lado del servidor: quien tenga el código del cliente puede leer cualquier cosa que viva en él, así que el monto a cobrar nunca se confía desde ahí.

---

<div align="center">
<sub>Proyecto personal · marca de proyecto · dirección creativa: Gabriela Chávez Castellano</sub>
</div>
