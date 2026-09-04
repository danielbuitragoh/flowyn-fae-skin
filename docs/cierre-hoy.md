# Flowyn · Cierre del proyecto

Todo lo que sigue está pensado para terminarse hoy. Está ordenado por
dependencias: cada bloque asume que el anterior salió bien.

---

## Parte 0 · Dos correcciones honestas antes de empezar

**1. Las 11 imágenes muertas NO están borradas de tu equipo.** En un mensaje
anterior te dije que las había borrado "via el puente". Me equivoqué: el
puente con tu computador puede leer y escribir archivos, pero no borrarlos.
Las borré sólo en mi copia de trabajo. Siguen en tu `public/assets/` y el
paso 2 de abajo las quita de verdad.

**2. Los dos workflows de `.github/workflows/` no los pude escribir.** GitHub
Actions son archivos protegidos por seguridad y las herramientas remotas no
pueden tocarlos. Los cambios que les hice son menores (números de pruebas en
comentarios) y están al final, en la Parte 6, por si los quieres aplicar a
mano. No bloquean nada.

---

## Parte 1 · Lo que encontré y ya está arreglado

Cuatro agentes revisaron el proyecto entero en paralelo: código, seguridad,
build y diseño. Esto es lo que salió. **Todo lo de esta sección ya está en tu
carpeta**, verificado con contraste + pruebas de pedido + build en verde.

### Bugs reales (no cosméticos)

**El carrito no se vaciaba al terminar un pedido.** En
`src/modulos/carrito-ui.js` se llamaba a `vaciar()` sin haberla importado. En
un módulo ES eso lanza `ReferenceError`. Efecto en la práctica: la clienta
confirma, se abre WhatsApp, y justo después el código revienta — el carrito
no se vacía y el panel no se cierra. Vuelve del chat y encuentra su pedido
todavía en la bandeja, invitándola a pedirlo dos veces. Es el bug más caro
que había y estaba en el camino feliz del checkout.

**Un oyente que fallara mataba a los siguientes.** `avisar()` en
`src/modulos/sesion.js` recorría los oyentes sin `try/catch`. El panel de
cuenta se suscribe antes que la sincronización del carrito, así que
cualquier fallo cosmético al repintar la cuenta impedía que el carrito se
conectara a la nube — un fallo visual se convertía en uno funcional y
silencioso. Ahora cada oyente falla solo.

**Carrera entre entrar y salir.** `conectarAlmacen()` es asíncrono y su
primera línea es un viaje a la red; `desconectarAlmacen()` es síncrono. Si
alguien cerraba sesión mientras la lectura del carrito remoto estaba en
vuelo, la respuesta llegaba tarde y volvía a poner el carrito de la clienta
que acababa de salir. Ahora hay un testigo de generación que descarta las
respuestas viejas.

**Datos de Google interpolados sin escapar.** El nombre y el correo que
devuelve Google se metían en `innerHTML` tal cual. Un nombre con comillas o
`<` rompía el panel justo en el primer repintado tras entrar. Escapado.

**`AbortSignal.timeout` sin respaldo.** En Safari antiguo lanzaba de forma
síncrona y dejaba el panel congelado en "Buscando tus pedidos…" para siempre.
Con respaldo y `try/catch`.

**El historial mostraba el identificador de la ciudad, no su nombre.** Salía
`bogota` en vez de "Bogotá".

**`npm run verificar` no corría en Windows.** El script llamaba a `esbuild`
en vez de `esbuild.cmd`. Por eso te fallaba a ti y no a mí.

**El precio estaba escrito a mano en dos sitios del HTML.** Ahora sale del
catálogo, que era justamente la regla que el README dice que sigue el
proyecto.

### Interfaz

**El selector de cantidad no parecía un selector.** El número iba en
Cormorant 300, y a 1rem el "1" se leía como una "I" o como un cursor de
texto. Ahora va en Jost con cifras tabulares — mismo tono, se lee.

**La bandeja vacía no ofrecía salida.** Estaba bien redactada pero sin ningún
botón: había que cerrar el panel, buscar la ficha y volver. En una tienda de
un solo producto ése es el momento de mayor intención. Ahora tiene "Añadir
FAE SKIN · $ 89.900".

**El desplegable de ciudad era el único control sin diseñar.** Salía con el
estilo nativo del navegador, con otra esquina y el chevron gris del sistema
— el único elemento con lenguaje ajeno, y en la pantalla de la compra.
Ahora es una píldora coherente con el resto.

**La barra de compra fija tapaba el contador de pasos del ritual.**

---

## Parte 2 · Los comandos, en orden (PowerShell)

```powershell
cd "C:\Users\USER\Documents\flowyn-web\flowyn-web"
git remote -v
```
Confirma que dice `github.com/danielbuitragoh/flowyn-fae-skin`.

### 2.1 · Quitar el código muerto

```powershell
git rm src/modulos/frasco3d.js src/modulos/geometria-frasco.js src/modulos/armado.js src/modulos/vaho.js src/modulos/regreso.js
git rm -r supabase/funciones/wompi-eventos
git rm .github/workflows/publicar.yml
```

### 2.2 · Quitar las imágenes muertas (esto es lo que yo no pude hacer)

Ninguna la usa el sitio: o tienen su versión `.webp`/`.svg` que sí se usa, o
son sobras de exploraciones. Son ~6,6 MB que hoy se publican a GitHub Pages
sin que nadie los pida, porque `public/` se copia entero al construir.

```powershell
git rm public/assets/logo-flowyn-oro.png public/assets/logo-flowyn-blanco.png
git rm public/assets/isotipo-gota-oro.png public/assets/isotipo-gota-blanco.png
git rm public/assets/frasco-boceto.jpg public/assets/frasco-boceto.png
git rm public/assets/frasco-completo.png public/assets/packshot-frasco-recortado.png
git rm public/assets/tapa-frasco.png
git rm public/assets/packshot-frasco-flores.jpg public/assets/packshot-frasco-tapa.jpg
git rm public/assets/pano-01.jpg public/assets/pano-02.jpg public/assets/pano-03.jpg
```

Si alguno te dice `did not match any files`, ignóralo y sigue: significa que
ya no estaba.

### 2.3 · Verificar en verde

```powershell
npm install
npm run verificar
```

Esto ahora **sí** funciona en Windows. Tiene que terminar con las tres cosas
en verde: contraste, pruebas de pedido y build. Si algo falla, párate aquí y
mándame la salida — no sigas al paso siguiente.

### 2.4 · Reescribir la autoría de los commits

Éste es el paso que sigue pendiente desde hace días. En tus capturas GitHub
todavía muestra "claude" como autor de todo y aparece como contribuidor del
repositorio.

```powershell
$envFilter = @'
export GIT_AUTHOR_NAME="Daniel Buitrago"
export GIT_AUTHOR_EMAIL="daniel.buitrago-h@uniminuto.edu.co"
export GIT_COMMITTER_NAME="Daniel Buitrago"
export GIT_COMMITTER_EMAIL="daniel.buitrago-h@uniminuto.edu.co"
'@

git filter-branch -f --env-filter $envFilter -- --all
```

El `'@` de cierre tiene que ir solo y pegado al margen izquierdo, sin ningún
espacio antes. Si lo indentas, PowerShell da error.

Va a avisar que `filter-branch` está obsoleto. Es normal, ignóralo.

Comprueba:

```powershell
git log --format='%h %an <%ae> %s' | Select-Object -First 30
```

Ninguna línea puede decir "claude". Si todas dicen "Daniel Buitrago", funcionó.

### 2.5 · Confirmar y publicar

```powershell
git add -A
git status
```

Revisa la lista. Deberías ver: los `deleted:` del código y las imágenes
muertas, los `modified:` de los archivos que arreglé, y `docs/capturas/` con
las capturas y el video. **No** debe aparecer `node_modules/` ni `dist/`.

```powershell
git commit -m "Arreglos de checkout y sesion, limpieza de assets muertos, mejoras de interfaz y video del anuncio"
git push --force-with-lease origin main
```

El `--force-with-lease` hace falta porque reescribiste el historial en 2.4.

---

## Parte 3 · GitHub por web (sólo tú puedes)

### 3.1 · El "About" del repositorio

Engranaje al lado de "About", arriba a la derecha:

**Description:**
```
Landing y tienda de un producto único · Vite + Supabase + checkout por WhatsApp · Proyecto personal de portafolio
```

**Website:**
```
https://danielbuitragoh.github.io/flowyn-fae-skin/
```

**Topics:**
```
vite  supabase  javascript  accessibility  wcag  ecommerce  github-pages  design-system  google-oauth
```

Marca también "Use your GitHub Pages website" si te lo ofrece.

### 3.2 · La release v1.0

*Releases → Create a new release.*

- **Tag:** `v1.0`
- **Title:** `v1.0 — flowyn · FAE SKIN`
- **Descripción:**

```
Landing de producto único y tienda para FAE SKIN — Ethereal Skin Mist, la
bruma facial de la marca flowyn.

Recorrido completo de marca a carrito: producto en pestañas, ritual de uso,
ficha de compra, carrito accesible con persistencia en el navegador y en la
nube, cuenta con Google y cierre de pedido por WhatsApp con el total siempre
recalculado en el servidor.

Dirección creativa: Gabriela Chávez Castellano.
Desarrollo: Daniel Buitrago.

Accesibilidad revisada contra las Human Interface Guidelines de Apple y
contraste WCAG AA verificado en cada push.
```

### 3.3 · Que "claude" desaparezca de Contributors

Se arregla solo con el paso 2.4 + el push. GitHub recalcula los
contribuidores a partir del historial; como ya no habrá commits con ese
correo, desaparece de la barra lateral en unos minutos.

---

## Parte 4 · El bug de Google — lo que de verdad pasa

Revisé el camino completo del login línea a línea, y también las políticas
RLS de Supabase. **En el código no hay ninguna excepción en la vuelta de
Google.** Está bien blindado: `maybeSingle()` en vez de `single()`, `?.` en
todos los accesos a los datos de Google, el evento `TOKEN_REFRESHED`
filtrado, y guarda de idempotencia en la sincronización del carrito.

Pero encontré **por qué se ve en blanco**, que es el dato que faltaba:

- `.revelar { opacity: 0 }` en `base.css`, y la clase `visible` que la
  enciende **sólo la pone JavaScript**, en la última línea de `main.js`.
- Por tanto: **si el JavaScript no llega a ejecutarse, la página entera se
  queda invisible.** No rota — invisible.

Y la forma más fácil de que el JS no se ejecute es aterrizar en una URL
distinta de `/flowyn-fae-skin/`, donde el `<script>` no existe. Que es
exactamente lo que pasa cuando el `redirectTo` no está en la lista blanca:
Supabase no falla, hace *fallback* silencioso a la Site URL del proyecto.

**Las dos causas probables, en orden:**

**A) El `redirectTo` no está en la lista blanca de Supabase.** Pasa sobre
todo si pruebas con `npm run preview` (puerto 4173) o si Vite cogió el 5174
porque el 5173 estaba ocupado. Ninguno de los dos está hoy en la lista.

En *Authentication → URL Configuration* debe estar exactamente:

- *Site URL:* `https://danielbuitragoh.github.io/flowyn-fae-skin/`
- *Redirect URLs*, una por línea:
  ```
  https://danielbuitragoh.github.io/flowyn-fae-skin/**
  http://localhost:5173/**
  http://localhost:4173/**
  ```

**B) La llave `anon` del sitio publicado ya no vale.** Tu `.env` local tiene
una llave del formato nuevo (`sb_publishable_…`), pero el sitio publicado se
construye con el *secret* de GitHub Actions. Si ese secret todavía guarda la
JWT antigua y esa llave fue desactivada al crear las publishable keys, pasa
exactamente esto: el login con Google funciona (esa parte no usa la llave),
y al volver el intercambio del código falla con 401 — sin sesión.

Arreglo: *Settings → Secrets and variables → Actions* → actualizar
`VITE_SUPABASE_ANON_KEY` con la misma `sb_publishable_…` de tu `.env`, y
relanzar el workflow.

**Cómo saber cuál de las dos es, en dos minutos:** reproduce el fallo y mira
la barra de direcciones en el momento exacto de caerse. Si no dice
`danielbuitragoh.github.io/flowyn-fae-skin/?code=…`, es (A). Si la URL está
bien, abre F12 → Network, filtra `supabase.co`, y mira si
`token?grant_type=pkce` devuelve 401: entonces es (B).

Mándame lo que veas y lo cerramos.

---

## Parte 5 · Mejoras de interfaz que valen la pena pero no bloquean

Las dejo priorizadas por si quieres seguir después del cierre. Ninguna es
urgente; el sitio funciona bien sin ellas.

**Alto retorno:**

1. **La cuenta es obligatoria pero sólo se dice al final.** El código exige
   sesión de Google *después* de que la clienta llenó los seis campos de
   envío y pulsó "Pedir por WhatsApp". Es el punto más caro para abandonar.
   Debería anunciarse al abrir el carrito, no al final.
2. **En móvil, el claim del hero se superpone con la barra de navegación.**
   La barra sólo se vuelve opaca al terminar el hero (912 px), y hasta
   entonces es transparente: durante ese tramo el texto pasa por debajo de
   "ENTRAR" y "CARRITO". Se arregla haciendo que se materialice a los ~24 px
   de scroll.
3. **En móvil, la primera pantalla no tiene ni precio ni botón.** Entra el
   frasco, el logotipo y dos líneas de claim; el precio y "DESCUBRIR" caen
   por debajo del pliegue. Bajando el frasco de 320 a 240 px caben.

**Después:** las pestañas del producto deberían ser `sticky` (hoy
desaparecen en cuanto empiezas a leer y el panel mide 1.400 px); los errores
del formulario no se distinguen de los textos de ayuda; el ritual pide 3.700
px de scroll para cinco frases; y la página termina sin pie — sin contacto,
sin políticas de envío ni de devolución, que en una tienda que cierra por
WhatsApp es justo lo que da confianza antes de dar una dirección.

---

## Parte 6 · Los dos workflows (opcional, a mano)

Cambios menores que no pude escribir por la protección de GitHub Actions:
en `verificar.yml` y `desplegar-paginas.yml` el comentario dice "66 pruebas"
y el número real hoy es distinto. Si quieres cuadrarlo, corre
`npm run verificar` y usa el número que salga. No afecta a nada funcional.

---

## Orden recomendado para hoy

1. Parte 2 completa (2.1 → 2.5). Es lo único que bloquea todo lo demás.
2. Parte 3 (About y release), que son diez minutos por web.
3. Parte 4: comprobar la URL y la consola, y me dices qué ves.
4. Parte 5 sólo si te queda ánimo. El proyecto ya está cerrado sin eso.
