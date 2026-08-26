<div align="center">

# flowyn · FAE SKIN

**Landing page y tienda de una bruma facial de tratamiento.**

*Ethereal Beauty in Motion*

[![Verificar](https://github.com/danielbuitragoh/flowyn-fae-skin/actions/workflows/verificar.yml/badge.svg)](https://github.com/danielbuitragoh/flowyn-fae-skin/actions/workflows/verificar.yml)

[**Ver la web**](https://danielbuitragoh.github.io/flowyn-fae-skin/) · [Cómo está armado](#cómo-está-armado) · [Cómo correrlo](#correrlo)

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

**El frasco del hero: la foto, con profundidad, no un modelo 3D.** Se probó
modelar el frasco por código —a partir del perfil medido sobre el canal alfa
del packshot, con su proporción real de 2.45 por 1— pero nunca llegó al
nivel del producto real: lo que hace bello a ese envase son las nervaduras
de vidrio refractando la luz, no su silueta, y aproximar eso con fórmulas
siempre daba algo parecido pero peor. Se decidió no perseguirlo más —queda
descartado, no en pausa— y se sacó el código entero (`three.js` incluido:
734 kB menos en el paquete construido).

En su lugar el hero sirve la fotografía real y le da dimensión tratando la
escena como capas a distinta distancia: velo, halo, frasco y destellos se
desplazan en proporción a su profundidad al mover el puntero, y el frasco
gira unos grados hacia el lado al que se inclina. El seguimiento interpola
en cada fotograma en lugar de saltar al cursor — un objeto con masa no se
teletransporta, y ese retraso es lo que separa la sensación de peso de la
de temblor.

**La paleta no se tocó, se separó.** El manual de marca es monocromo cálido: crema, nude, cobre, caoba. Precioso en muestras grandes, pero medí los pares y tres fallaban WCAG AA en texto pequeño — el cobre de las etiquetas daba 3.01:1 sobre crema, cuando el mínimo es 4.5:1. La salida fácil habría sido oscurecer la marca. En vez de eso, los tonos originales se quedan para superficies, filetes y acentos, y para texto hay variantes más profundas del mismo color. Un verificador corre en cada push y falla la construcción si alguien rompe el equilibrio.

**Se probó un gesto de "quitar la tapa" y se descartó.** Hubo una versión con
el frasco y la tapa como dos fotografías separadas, que se despegaba al
pasar el mouse con un aerosol dibujado en canvas. Por bien medida que
quedara la física de la animación —anticipación, overshoot, sombra que crece
con la altura—, seguía siendo un compuesto de dos piezas tratando de leerse
como una sola, y nunca se sintió como parte del mismo objeto. El hero usa
ahora una única fotografía del frasco ya montado: menos gesto, más frasco.

**El frasco flota, y eso no es un capricho.** El manual repite una imagen: *"una nube dulce flotando en el aire"*. Si el packshot estuviera apoyado sobre una superficie con su sombra debajo, la promesa de la marca se rompería en el primer segundo. Por eso el frasco deriva muy despacio, la luz nace detrás de él, y lo único que hay abajo es la memoria de un reflejo.

**El logotipo es vectorial, no una imagen.** Lo extraje de los documentos originales y lo vectoricé, así que conserva la ligadura de la `fl` y el descendente largo de la `y` — los dos rasgos que ninguna fuente de sistema reproduce. Va en línea como SVG y se tiñe con `currentColor`, de modo que el mismo archivo sirve en caoba sobre crema y en crema sobre caoba.

**Las fuentes las servimos nosotros.** Cormorant Garamond y Jost van autoalojadas en lugar de pedirlas al CDN de Google: una petición menos a un tercero, ningún dato del visitante saliendo fuera, y el texto no parpadea si ese CDN va lento.

**El producto va en pestañas; el resto, en scroll.** *El objeto*, *la fórmula* y *el aroma* eran tres secciones seguidas y sumaban un tercio del largo de la página con el mismo ritmo cada una. Ahora comparten una sección con pestañas, y la página bajó de 12.000 a 10.000 píxeles. La regla que decidió dónde sí y dónde no: las pestañas sirven cuando el contenido son alternativas paralelas —tres formas de mirar el mismo frasco— y estorban cuando es una secuencia. El recorrido de venta sigue siendo scroll, porque lleva a un desconocido de "qué es esto" a "lo compro" sin pedirle ni una decisión, y cada decisión que se le pide es gente que se va. Los enlaces `#formula` y `#aroma` siguen funcionando: el módulo reconoce el fragmento, baja a la sección y abre la pestaña.

**Una revisión con las Human Interface Guidelines en la mano.** Pasé la página entera por el criterio de diseño de Apple —claridad, deferencia al contenido, y las reglas medibles de zona táctil, tipografía y jerarquía— midiendo con el navegador en vez de a ojo. Lo que salió, y lo que se hizo:

| Lo que había | Cómo se vio | Qué se hizo |
|---|---|---|
| Un solo botón de compra, en el píxel 9.530 de 9.954 | Midiendo la posición de todos los botones de la página | Barra de compra que aparece al pasar el producto y se retira al llegar a la ficha |
| En móvil no había navegación: los cuatro enlaces se ocultaban con `display:none` y no los sustituía nada | Los cuatro enlaces con ancho 0 a 390 px | Menú desplegable con Escape, cierre al elegir destino y devolución del foco |
| Zonas táctiles de 27–38 px | Medidas contra el mínimo de 44×44 de las HIG | Nav, cuenta, carrito, cantidad y cierre a 44 px |
| Las etiquetas de sección a la izquierda y sus titulares centrados | 454 px de desalineación en tres secciones | Ver abajo: la causa no era el centrado |
| 316 px de vacío idéntico entre cada dos secciones | Sumando el relleno inferior y el superior en los siete límites | El relleno superior se recorta cuando ya hay uno debajo |
| El claim del hero repetido palabra por palabra como titular del concepto | Buscando frases duplicadas en el documento | Titular nuevo, y marcado como `h2` de verdad — antes era un párrafo |
| Cinco pilares de valor con adjetivos intercambiables | Leyéndolos | Los titulares de marca se quedan; debajo va el dato real |
| `npm run preview` servía 404 en todo el JavaScript | Al intentar revisar la construcción antes de publicar | `base` decidida por `mode` y no por `command` |

**La desalineación de las etiquetas no era un problema de centrado.** Tres secciones tenían la etiqueta pegada a la izquierda mientras su titular iba centrado, y el intento anterior —`width: 100%` más `justify-content: center`— no había servido de nada. La causa estaba a cuatro archivos de distancia: `p { max-width: 62ch }`. La unidad `ch` se mide sobre la fuente del propio elemento, y una etiqueta va a 11 px, así que sus 62ch eran 372 px y no los 1.280 del contenedor. El `width: 100%` se aplicaba obedientemente sobre un bloque contenedor de 372 px. Es el tipo de fallo que no se encuentra mirando la pantalla: aparece midiendo, y sólo si uno se pregunta por qué un `width: 100%` no mide el 100 %.

**La barra de compra no usa `IntersectionObserver`, y ese es el detalle.** Era la herramienta obvia, y la primera versión la usaba. Pero el observador sólo avisa cuando `isIntersecting` cambia de valor: al cargar, la sección de producto está debajo del pliegue y entrega `false`; si el visitante salta de golpe más abajo —un ancla, la tecla Fin, recargar conservando la posición—, la sección pasa a estar por encima de la ventana, que también es `false`. Mismo valor, ninguna notificación, y la barra no aparecía nunca. Se detectó saltando directamente al píxel 3.600. Ahora lee dos rectángulos en los fotogramas en que hubo scroll, agrupados en un `requestAnimationFrame`. Es el mismo fallo que ya había tenido el centinela de la barra de navegación, con la misma forma.

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
| `scripts/verificar-pedido.mjs` | Intenta engañar al cálculo del servidor y comprueba que no se deje |
| `supabase/funciones/crear-pedido/` | Crea el pedido y firma el cobro. El total se decide aquí, nunca en el navegador |
| `supabase/funciones/wompi-eventos/` | Recibe el aviso firmado de Wompi. El único sitio que marca un pedido como pagado |
| `src/servicios/pago.js` | Pide el pedido al servidor y devuelve a dónde ir. No calcula nada |
| `src/modulos/regreso.js` | La vuelta de la pasarela: consulta el estado, no lo decide |
| `src/modulos/pestanas.js` | Las tres miradas al producto, con el patrón de pestañas de WAI-ARIA |
| `src/modulos/palabras.js` | El titular del hero, condensándose palabra por palabra |

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
- [x] **Fase 4** — Checkout con firma del pago en servidor, datos de envío y correo de confirmación *(código listo y desplegado; faltan las llaves de Wompi y la contraseña de Gmail)*
- [x] **Fase 5** — Accesibilidad (Human Interface Guidelines), responsive y limpieza de assets
- [ ] **Fase 6** — Despliegue en GitHub Pages *(workflow listo; falta crear el repositorio y activar Pages — ver `docs/credenciales.md`)*

De la Fase 4 queda el mismo tipo de cabo suelto que tuvo la Fase 3, y por la
misma razón. Las funciones de servidor están escritas, desplegadas y activas
—incluida la del correo de confirmación—; el cálculo del pedido y de los
datos de envío está probado contra manipulación del cliente con
`npm run verificar`. Lo que falta son las llaves de Wompi y la contraseña de
aplicación de Gmail, que sólo puede crear el dueño de esas cuentas. Hasta que
estén, el botón de pagar contesta "los pagos todavía no están configurados"
en lugar de romperse, y un pedido aprobado sin correo configurado se registra
en el log sin tumbar el pedido — comportamiento correcto en los dos casos,
no un pendiente disfrazado.

De la Fase 6 no hay nada de código pendiente: el repositorio simplemente no
existe todavía en GitHub. Los pasos —crear el repo, activar Pages con
Actions como origen y pegar las llaves— están en `docs/credenciales.md`, en
orden.

## Sobre los pagos

Cuando llegue el checkout irá contra el **entorno de pruebas de Wompi**, no contra producción. El motivo es simple: flowyn es una marca de proyecto, no una sociedad con NIT, y no puede ni debe recibir dinero real. El flujo es idéntico al de producción y se puede recorrer entero con las tarjetas de prueba que Wompi publica.

La firma de integridad se calculará en una función de servidor, no en el navegador. Es la diferencia entre tener un checkout y entender por qué un checkout se firma del lado del servidor: quien tenga el código del cliente puede leer cualquier cosa que viva en él, así que el monto a cobrar nunca se confía desde ahí.

---

## In English

A single-product landing page and store for **FAE SKIN — Ethereal Skin
Mist**, a 100 ml facial mist by the fictional brand *flowyn*. It's a
portfolio project: the brand's naming, visual identity, positioning, and
product development are Gabriela Chávez Castellano's; my part is turning
that into a web experience that holds up technically — catalog, cart,
authentication, and checkout, with no payment server of my own.

Stack: a Vite-built static frontend deployed to GitHub Pages, Supabase for
auth and data (Google OAuth, Postgres, Edge Functions), and Wompi's sandbox
environment for payments — the brand has no legal entity, so it can't take
real money, and the checkout is honest about that. The one architectural
decision worth calling out: the payment amount is never trusted from the
browser. A Supabase Edge Function recalculates the full order from its own
copy of the catalog and signs that total server-side, because anyone with
devtools open can read and rewrite anything that lives in client code.
`npm run verificar` includes 30 tests that specifically try to cheat that
calculation — injected prices, out-of-range quantities, spoofed cities,
duplicated line items — and asserts every one gets rejected.

Also covered: a real accessibility pass against Apple's Human Interface
Guidelines (44×44pt touch targets, a WCAG AA contrast checker that runs on
every push and fails the build if the palette drifts), a proper accessible
modal for the cart (focus trap, `Escape`, focus return, scroll lock), and a
server-validated shipping-data flow where the customer's department can't
be spoofed for cities the store already knows.

---

<div align="center">
<sub>Proyecto personal · marca de proyecto · dirección creativa: Gabriela Chávez Castellano</sub>
</div>
