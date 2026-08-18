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

**La tienda funciona sin credenciales.** El repositorio es público y
cualquiera puede clonarlo sin tener llaves de Supabase. Si eso rompiera la
página, el proyecto sólo funcionaría en mi máquina. Así que cuando no hay
credenciales el botón de cuenta no aparece, el carrito se guarda en el
navegador y la tienda se comporta exactamente como en la Fase 2 — sin
errores en consola y sin una puerta que no abre.

**La clienta no puede crear pedidos, y eso es la parte importante del
esquema.** `pedidos` tiene política de lectura pero ninguna de inserción. Un
pedido nace en una función de servidor que recalcula el total desde el
catálogo; si el navegador pudiera escribir en esa tabla, cualquiera con la
consola abierta podría registrar un frasco de 100 ml por mil pesos. El
carrito sí es suyo —es una intención de compra, no un cobro— y el precio no
se guarda nunca en él: sale del catálogo cada vez que se calcula un total.

**Entrar no te hace perder la bandeja.** Al iniciar sesión hay dos carritos
posibles: el de esta pestaña, de quien acaba de añadir el frasco y luego
decide crear cuenta, y el de la nube, de quien lo añadió ayer desde el móvil.
Tirar cualquiera de los dos se siente como una pérdida, así que se fusionan
quedándose con la cantidad mayor. Al cerrar sesión, en cambio, el carrito se
vacía: si no, la siguiente persona que abra ese ordenador encontraría la
compra de otra.

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
| `src/modulos/modal.js` | Diálogo accesible: trampa de foco, Escape, `inert`, scroll |
| `src/modulos/sesion.js` | Quién está dentro. Un solo sitio lo sabe; el resto se suscribe |
| `src/modulos/cuenta-ui.js` | El panel de cuenta: entrar, identidad, historial |
| `src/modulos/sincronizar-carrito.js` | El único archivo que conoce a la vez la sesión y el carrito |
| `src/servicios/` | Todo lo que habla con Supabase, y nada más |
| `src/modulos/` | El resto, por responsabilidad: revelado, atmósfera, marca, navegación, ritual, profundidad |
| `supabase/migraciones/` | El esquema, con el porqué de cada decisión escrito arriba |
| `docs/credenciales.md` | Cómo sacar las llaves de Google y dónde va cada una |
| `public/assets/` | Logotipo y isotipo vectorizados, packshots y fotografía de campaña |
| `scripts/verificar-contraste.mjs` | Mide la paleta contra WCAG AA y falla si algo no cumple |

El estado del carrito y su interfaz están separados, y el almacén donde se
guarda es intercambiable. Sin sesión es `localStorage`; con sesión es la
tabla `carritos`. El resto del módulo no se entera de cuál está puesto, que
era exactamente el objetivo de separarlos en la Fase 2.

La sesión y el carrito tampoco se conocen entre sí: `sincronizar-carrito.js`
es el único archivo que sabe las dos cosas y las conecta. Si mañana la
persistencia cambia de proveedor, se reescribe ese archivo y nada más.

## Correrlo

```bash
npm install
cp .env.example .env   # opcional: sin esto funciona todo menos la cuenta
npm run dev            # servidor de desarrollo
npm run verificar      # contraste + construcción
npm run build          # genera dist/
```

Las llaves y los pasos para obtenerlas están en
[`docs/credenciales.md`](docs/credenciales.md).

## Estado

Este repositorio está en construcción. Lo que ya funciona y lo que falta:

- [x] **Fase 0** — Activos de marca, sistema de diseño, verificador de contraste, hero
- [x] **Fase 1** — Secciones de producto, ritual, fórmula y aroma
- [x] **Fase 2** — Ficha de compra, carrito y cálculo de envío por ciudad
- [x] **Fase 3** — Cuenta con Google, carrito en la nube, historial de pedidos
- [ ] **Fase 4** — Checkout con firma del pago en servidor
- [ ] **Fase 5** — Accesibilidad, responsive y despliegue

De la Fase 3 queda un cabo suelto honesto: el esquema, las políticas y el
código están hechos y comprobados, pero el recorrido completo de Google no
se ha podido ejecutar de punta a punta porque el proveedor necesita unas
credenciales que sólo puede crear el dueño de la cuenta. Es la primera
prueba que hay que hacer al abrir el proyecto con el `.env` puesto.

## Sobre los pagos

Cuando llegue el checkout irá contra el **entorno de pruebas de Wompi**, no contra producción. El motivo es simple: flowyn es una marca de proyecto, no una sociedad con NIT, y no puede ni debe recibir dinero real. El flujo es idéntico al de producción y se puede recorrer entero con las tarjetas de prueba que Wompi publica.

La firma de integridad se calculará en una función de servidor, no en el navegador. Es la diferencia entre tener un checkout y entender por qué un checkout se firma del lado del servidor: quien tenga el código del cliente puede leer cualquier cosa que viva en él, así que el monto a cobrar nunca se confía desde ahí.

---

<div align="center">
<sub>Proyecto personal · marca de proyecto · dirección creativa: Gabriela Chávez Castellano</sub>
</div>
