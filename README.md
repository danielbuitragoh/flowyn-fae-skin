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

**El carrito es una bandeja, no una lista.** Añadir el frasco tiene que sentirse como recibir algo, no como rellenar una fila de una tabla: por eso el producto va grande sobre un lecho nude en arco, la línea se asienta desde arriba en vez de aparecer de golpe, y el resumen respira. El panel es un diálogo modal de verdad —atrapa el foco, se cierra con Escape, devuelve el foco al botón que lo abrió, bloquea el scroll de detrás— y al repintarse conserva el foco del teclado, porque si no, pulsar "+" te expulsaba al principio del documento y la tienda quedaba inservible sin ratón.

**El precio vive en un solo sitio.** El catálogo, las tarifas y el umbral de envío gratis están en `src/datos/`, y tanto la ficha como el carrito los leen de ahí. Si el precio estuviera escrito en el HTML y calculado otra vez en el panel, tarde o temprano dejarían de coincidir — y en una tienda eso no es un detalle estético.

**Lo que es dato de marca y lo que es decisión mía está separado.** El precio (COP $89.900), el posicionamiento y los cinco pilares de valor salen literalmente del Marketing MIX. Las tarifas de envío, los plazos y el umbral de envío gratis no aparecen en ningún documento —el manual sólo promete "envíos seguros y rápidos" y sitúa al público en "ciudades principales de Colombia", sin nombrarlas ni poner cifras—, así que los definí para el proyecto y están marcados como tales en el código. Un hueco identificado vale más que un dato inventado que parezca oficial.

**El frasco del hero: la foto, con profundidad.** El manual describe el envase como "vidrio translúcido con reflejos iridiscentes", y esa cualidad pedía 3D. Modelé el frasco por código a partir del perfil medido sobre el canal alfa del packshot —de ahí salen su proporción real, 2.45 por 1, la sección aplanada y la torsión del eje— pero no llegó al nivel del producto: lo que hace bello a ese envase son las nervaduras de vidrio refractando la luz, no su silueta, y aproximar eso con fórmulas siempre daba algo parecido pero peor.

Así que el hero sirve la fotografía y le da dimensión tratando la escena como capas a distinta distancia: velo, halo, frasco y destellos se desplazan en proporción a su profundidad al mover el puntero, y el frasco gira unos grados hacia el lado al que se inclina. El seguimiento interpola en cada fotograma en lugar de saltar al cursor — un objeto con masa no se teletransporta, y ese retraso es lo que separa la sensación de peso de la de temblor. El modelo 3D sigue en el repositorio tras `?forzar3d=1`, a la espera del archivo original del envase o de una secuencia de giro renderizada.

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
| `src/datos/catalogo.js` | Producto, precio, tarifas de envío y umbral de envío gratis |
| `src/modulos/carrito.js` | Estado del carrito y cálculo de totales. No toca el DOM |
| `src/modulos/carrito-ui.js` | El panel: pinta el estado y traduce las acciones de la clienta |
| `src/modulos/` | El resto, por responsabilidad: revelado, atmósfera, marca, navegación, ritual, profundidad |
| `public/assets/` | Logotipo y isotipo vectorizados, packshots y fotografía de campaña |
| `scripts/verificar-contraste.mjs` | Mide la paleta contra WCAG AA y falla si algo no cumple |

El estado del carrito y su interfaz están deliberadamente separados. Hoy la persistencia es `localStorage`, suficiente para que el carrito sobreviva a un refresco; en la Fase 3 pasa a Supabase para que sobreviva también a cambiar de dispositivo. Ese cambio debería tocar de dónde salen los datos, no lo que la tienda hace con ellos.

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
- [x] **Fase 1** — Secciones de producto, ritual, fórmula y aroma
- [x] **Fase 2** — Ficha de compra, carrito y cálculo de envío por ciudad
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
