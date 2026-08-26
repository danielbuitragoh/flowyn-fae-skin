# Credenciales

Todo lo que hace falta para que la cuenta y el pago funcionen. Nada de esto
cuesta dinero.

El proyecto de Supabase **ya está creado** y el esquema aplicado. Lo que
queda es la parte de Google, que sólo puedes hacer tú: son tus credenciales,
entrando con tu cuenta.

---

## 1. Supabase — hecho

| Dato | Valor |
|---|---|
| Proyecto | `flowyn-fae-skin` |
| Referencia | `etnmbgvdjymduujhlgvp` |
| URL | `https://etnmbgvdjymduujhlgvp.supabase.co` |
| Región | `us-east-1` (la más cercana a Colombia de las que ofrece el plan gratis) |
| Coste | 0 USD/mes |

Tablas creadas: `perfiles`, `carritos`, `pedidos`, `lineas_pedido`. Las cuatro
con RLS activo y comprobado — sin sesión no se ve ni una fila, y con sesión
sólo se ve lo propio.

El archivo `.env` local ya tiene la URL y la llave publicable. No está en el
repositorio: `.gitignore` lo excluye.

> **Nota sobre las dos llaves de Supabase.** La `publishable` (o `anon`) está
> hecha para ir en el navegador; no da más permisos que los que concedan las
> políticas RLS. La `service_role` salta todas las políticas: no va nunca en
> el repositorio, ni en un `.env` del proyecto, ni en un mensaje. Su único
> sitio es la configuración de la función de servidor, en la Fase 4.

---

## 2. Google — te toca a ti

Son unos diez minutos. Necesitas dos cosas al final: un **Client ID** y un
**Client Secret**.

### 2.1 Crear el proyecto y la pantalla de consentimiento

1. Entra en <https://console.cloud.google.com/>.
2. Arriba a la izquierda, en el selector de proyectos → **Nuevo proyecto**.
   Nómbralo `flowyn` y créalo.
3. Con el proyecto `flowyn` seleccionado, ve al buscador de arriba y escribe
   **OAuth consent screen** (Pantalla de consentimiento de OAuth).
4. Tipo de usuario: **External** / Externo. Crear.
5. Rellena lo mínimo:
   - *App name*: `flowyn`
   - *User support email*: tu correo
   - *Developer contact*: tu correo
6. En **Scopes** no añadas nada: los tres por defecto (`email`, `profile`,
   `openid`) son justo lo que la tienda usa, y no conviene pedir más de lo
   que se usa.
7. En **Test users** añade tu propio correo. Mientras la app esté en modo
   *Testing*, sólo entran los correos de esa lista — suficiente para probar,
   y te ahorra la verificación de Google.

### 2.2 Crear las credenciales

1. Menú → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID**.
3. *Application type*: **Web application**. Nombre: `flowyn web`.
4. **Authorized JavaScript origins** — añade estos dos:

   ```
   http://localhost:5173
   https://danielbuitragoh.github.io
   ```

5. **Authorized redirect URIs** — añade **exactamente** esta, que es la de
   Supabase, no la de la web:

   ```
   https://etnmbgvdjymduujhlgvp.supabase.co/auth/v1/callback
   ```

   Esto suele ser lo que falla. Google no redirige a nuestra página: redirige
   a Supabase, y Supabase nos devuelve a nosotros. Si aquí pones la URL de
   GitHub Pages, Google responderá `redirect_uri_mismatch`.

6. Crear. Google te muestra el **Client ID** y el **Client Secret**.
   Déjalos abiertos, o cópialos a un sitio seguro. El *secret* se puede
   volver a ver después, pero mejor no perderlo de vista.

### 2.3 Pegarlos en Supabase

1. Panel de Supabase → proyecto `flowyn-fae-skin` → **Authentication** →
   **Sign In / Providers** → **Google**.
2. Actívalo y pega el **Client ID** y el **Client Secret**.
3. Guarda.

> El *Client Secret* va **sólo aquí**. No en el `.env`, no en el repositorio,
> no en un mensaje. El navegador no lo necesita para nada: el intercambio de
> código por token lo hace Supabase desde su servidor. Cualquier secreto que
> acabe en el paquete de la web es un secreto público.

### 2.4 Decirle a Supabase a dónde puede volver

Mismo panel → **Authentication** → **URL Configuration**:

- *Site URL*:
  ```
  https://danielbuitragoh.github.io/flowyn-fae-skin/
  ```
- *Redirect URLs* — añade las dos, una por línea:
  ```
  http://localhost:5173/**
  https://danielbuitragoh.github.io/flowyn-fae-skin/**
  ```

Sin esto, Supabase rechaza la vuelta con `redirect_to is not allowed`. Es una
lista blanca a propósito: impide que alguien monte una página falsa y se
lleve la sesión de tus clientas.

---

## 3. Probarlo en local

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>, pulsa **Entrar** arriba a la derecha y
**Continuar con Google**. Si todo está bien:

- vuelves a la página ya dentro, con tu nombre en la barra;
- el panel de cuenta enseña tu foto, tu correo y "Todavía no hay ninguno" en
  pedidos;
- lo que tuvieras en la bandeja antes de entrar sigue ahí;
- si añades algo, cierras sesión y vuelves a entrar, sigue ahí. Eso significa
  que el carrito ya vive en la cuenta y no en el navegador.

**Si algo falla, mira primero esto:**

| Mensaje | Casi siempre es |
|---|---|
| `redirect_uri_mismatch` | La URI de callback (punto 2.2, paso 5) no está en Google, o tiene una barra de más |
| `redirect_to is not allowed` | Falta la URL en *Redirect URLs* de Supabase (punto 2.4) |
| `Access blocked: has not completed verification` | Tu correo no está en *Test users* (punto 2.1.7) |
| Entra pero vuelve sin sesión | La *Site URL* de Supabase no coincide con dónde estás abriendo la web |

---

## 4. Wompi — cuando lleguemos a la Fase 4

Todavía no hace falta. Cuando toque serán las llaves de **sandbox**
(`pub_test_…` y su secreto de integridad), nunca las de producción: flowyn es
una marca de proyecto, sin NIT, y no puede recibir dinero real. El flujo es
idéntico al de producción y se recorre entero con las tarjetas de prueba que
Wompi publica.

El secreto de integridad se calculará dentro de una función de Supabase, no
en el navegador. Quien tenga el código del cliente puede leer cualquier cosa
que viva en él, así que el monto a cobrar no se confía desde ahí.

---

## 5. Y el despliegue

GitHub Pages sirve archivos ya construidos, así que las dos variables
`VITE_…` tienen que estar presentes en el momento de construir. Como la llave
publicable no es un secreto, hay dos caminos igual de válidos:

- guardarlas como *secrets* del repositorio y que la acción de GitHub las
  inyecte al construir — más limpio;
- o dejarlas en un `.env.production` versionado — más simple, y no filtra
  nada que no vaya a estar en el paquete de todas formas.

Lo montamos en la Fase 5, junto con el resto del despliegue.

---

# Fase 4 · Los pagos (Wompi)

El código del checkout ya está desplegado y funcionando en tu Supabase. Lo
único que falta son cuatro valores que sólo puedes crear tú.

**Importante: todo va en modo de pruebas.** flowyn es una marca de proyecto,
no una sociedad con NIT, así que no puede ni debe recibir dinero real. Las
llaves de prueba empiezan por `pub_test_`, `prv_test_`, `test_integrity_` y
`test_events_`. Si alguna vez ves una que empieza por `prod_`, párate: ésa
cobra de verdad.

## 1. Sacar las llaves en Wompi

1. Entra en tu comercio en <https://comercios.wompi.co>.
2. Ve a **Configuración → Llaves API** (o "Desarrolladores").
3. Cambia al **ambiente de pruebas** (sandbox) si no estás ya en él.
4. Copia estos tres valores:
   - **Llave pública** — empieza por `pub_test_`
   - **Secreto de integridad** — empieza por `test_integrity_`
   - **Secreto de eventos** — empieza por `test_events_`

La llave privada (`prv_test_`) no hace falta para este flujo. Si no la
necesitas, no la copies: una llave que no está en ningún sitio no se puede
filtrar.

## 2. Guardarlas en Supabase (no en el proyecto)

Ninguna de estas llaves va en el código ni en el `.env` del sitio. El `.env`
del sitio termina dentro del JavaScript que descarga cualquier visitante, y
el secreto de integridad es justo lo que permite firmar un cobro: si viajara
al navegador, cualquiera podría firmar un cobro de mil pesos por un frasco de
89.900. Por eso viven en el servidor y sólo ahí.

En <https://supabase.com/dashboard> → tu proyecto → **Edge Functions →
Secrets** (o *Project Settings → Edge Functions*), añade:

| Nombre | Valor |
|---|---|
| `WOMPI_LLAVE_PUBLICA` | tu `pub_test_…` |
| `WOMPI_SECRETO_INTEGRIDAD` | tu `test_integrity_…` |
| `WOMPI_SECRETO_EVENTOS` | tu `test_events_…` |
| `URL_REGRESO` | `http://localhost:5173/` mientras pruebas en local |

`URL_REGRESO` es a dónde vuelve la clienta después de pagar. Cuando
publiquemos el sitio hay que cambiarla por la dirección real de GitHub Pages,
o Wompi devolverá a la gente a tu computador.

Hasta que pongas las dos primeras, el botón de pagar responde *"Los pagos
todavía no están configurados"* en lugar de fallar con un error feo. Es el
estado normal, no un bug.

## 3. Decirle a Wompi dónde avisar

En el panel de Wompi, en **Configuración → Eventos** (o "URL de eventos"),
pon:

```
https://etnmbgvdjymduujhlgvp.supabase.co/functions/v1/wompi-eventos
```

Esto es lo que marca un pedido como pagado. Sin esto el cobro funciona, pero
el pedido se queda en "pendiente" para siempre, porque el sitio **nunca** da
un pago por bueno sólo porque la clienta haya vuelto a la página: eso lo
podría falsificar cualquiera escribiendo la dirección a mano. El único aviso
que se cree es el que llega firmado desde Wompi a esa URL.

## 4. Probarlo

1. Arranca el sitio (`npm run dev`), entra con Google y añade un frasco.
2. Pulsa **Finalizar pedido**. Debe llevarte a la pasarela de Wompi.
3. Paga con una de las **tarjetas de prueba** que Wompi publica en su
   documentación (hay una que aprueba y otra que rechaza — prueba las dos).
4. Al volver deberías ver el panel de confirmación con la referencia.
5. Abre tu cuenta en la tienda: el pedido tiene que aparecer en el historial
   con su estado.

Si el estado se queda en "pendiente" más de un par de minutos, casi siempre
es el paso 3 de arriba: la URL de eventos no está puesta o está mal escrita.

## Qué pasa si alguien intenta hacer trampa

El navegador sólo manda **qué producto y cuántos**. Nunca el precio, ni el
subtotal, ni el total. El servidor recalcula la cuenta entera desde su propia
copia del catálogo y firma ese total, no el que le digan. `npm run verificar`
incluye una prueba que intenta colar precios falsos, productos inventados,
cantidades absurdas y líneas repetidas, y comprueba que todas se rechacen.

---

# Fase 5 · El correo de confirmación

Cuando un pago se aprueba salen dos correos: la confirmación a la clienta y
un aviso a ti con todo lo necesario para rellenar la guía de la
transportadora. Sin configurar esto, el pago funciona igual — sólo que nadie
recibe nada, y en el registro de la función queda un aviso.

## Por qué Gmail y no Resend

Casi todos los servicios de correo transaccional exigen un dominio propio
verificado para poder escribirle a cualquiera:

| Servicio | Sin dominio propio |
|---|---|
| Resend | sólo escribe a tu propia dirección de registro; a cualquier otra, 403 |
| Postmark | prohíbe expresamente Gmail como remitente |
| Brevo | te deja ponerlo, y los correos **no llegan y no rebotan** |
| SendGrid | retiró el plan gratuito en mayo de 2025 |
| Correo nativo de Supabase | 2 por hora y sólo a miembros del proyecto |

Gmail funciona porque el remitente es una dirección de Google enviada desde
servidores de Google: SPF y DKIM cuadran solos.

Es una solución de arranque. Un correo de pedido que llega desde una @gmail
contradice el posicionamiento de la marca, así que cuando compres un dominio
(unos 10 USD al año en Cloudflare) conviene pasar a Resend. El cambio es de
unas líneas: todo el envío pasa por `enviarCorreo()` en
`supabase/funciones/_compartido/correo.ts`.

## Qué tienes que hacer

**1. Crear una contraseña de aplicación de Google.**

No sirve la contraseña normal de la cuenta. Hace falta:

1. Tener la verificación en dos pasos activada en la cuenta de Google.
2. Ir a <https://myaccount.google.com/apppasswords>.
3. Crear una para "flowyn" y copiar los 16 caracteres que salen.

Si te sale el error `535 5.7.8 Username and Password not accepted` en el
registro de la función, es exactamente esto: se puso la contraseña normal.

**2. Poner tres variables en Supabase.**

En el panel del proyecto → *Edge Functions* → *Secrets*:

| Variable | Valor |
|---|---|
| `CORREO_USUARIO` | tu dirección de Gmail completa |
| `CORREO_CLAVE` | los 16 caracteres de la contraseña de aplicación |
| `CORREO_AVISO` | dónde quieres recibir el aviso de pedido nuevo (opcional; si no la pones, va a `CORREO_USUARIO`) |

La contraseña de aplicación **no** va en el repositorio ni en `.env`: el
frontend es público en GitHub Pages.

**3. Probarlo.**

Con las llaves de Wompi puestas, haz un pedido de prueba y págalo con una
tarjeta de sandbox. Deberían llegarte los dos correos. Si no llegan, mira el
registro de `wompi-eventos` en el panel de Supabase: los fallos de correo se
registran ahí y **no** tumban el pedido, que queda aprobado igual.

## Qué se manda

- **A la clienta:** referencia, líneas, envío, total, dirección completa,
  plazo de entrega y el aviso del derecho de retracto. Tablas con estilos en
  línea, porque los clientes de correo no entienden CSS moderno.
- **A ti:** los mismos datos en formato de ficha, pensado para copiar a la
  guía de la transportadora sin abrir la base de datos.

Sólo se manda cuando el pedido pasa de "pendiente" a "aprobado" de verdad.
Wompi reenvía cada evento hasta tres veces si no recibe un `200`, y sin esa
comprobación la clienta recibiría la confirmación por triplicado.

---

# Fase 6 · Publicar en GitHub Pages

El proyecto vive hoy sólo en este espacio de trabajo: no hay repositorio
remoto (`git remote -v` no devuelve nada). Nada de lo de abajo se puede
saltar en el orden — cada paso depende del anterior.

## 1. Subirlo a GitHub

Esto se hace desde tu computador, no desde aquí — subir código es algo que
te toca autenticar a ti con tus credenciales de GitHub, no algo que yo deba
hacer por ti con un token tuyo.

1. En <https://github.com/new> crea un repositorio llamado exactamente
   `flowyn-fae-skin`, **vacío** (sin README, sin .gitignore, sin licencia —
   ya los trae el proyecto).
2. Descomprime el zip del proyecto (ya trae el historial de Git, no hace
   falta `git init`).
3. En cmd, dentro de esa carpeta:
   ```
   git remote add origin https://github.com/danielbuitragoh/flowyn-fae-skin.git
   git push -u origin main
   ```
   (si tu usuario de GitHub no es `danielbuitragoh`, cambia esa parte de la
   URL). Te va a pedir iniciar sesión en GitHub — sigue las instrucciones que
   te dé la terminal.

## 2. Activar Pages y los dos secretos de Actions

En el repo ya en GitHub → **Settings**:

- **Settings → Pages → Build and deployment → Source**: elige **GitHub
  Actions** (no "Deploy from a branch").
- **Settings → Secrets and variables → Actions → New repository secret**,
  dos veces:
  | Nombre | Valor |
  |---|---|
  | `VITE_SUPABASE_URL` | el mismo de tu `.env` local |
  | `VITE_SUPABASE_ANON_KEY` | el mismo de tu `.env` local |

  Sin esto el sitio publicado se ve igual pero el botón de entrar no
  aparece — el paquete se construye sin saber a qué proyecto de Supabase
  hablarle.

Con eso, cada `git push` a `main` reconstruye el sitio y lo publica solo
(`.github/workflows/publicar.yml`), pero sólo si `Verificar` pasó primero en
ese mismo commit.

## 3. Las llaves que siguen pendientes

Estas ya están documentadas arriba, pero repetidas aquí porque son lo único
que falta para que la tienda cobre y avise de verdad:

| Dónde | Variables | Para qué |
|---|---|---|
| Supabase → Edge Functions → Secrets | `WOMPI_LLAVE_PUBLICA`, `WOMPI_SECRETO_INTEGRIDAD`, `WOMPI_SECRETO_EVENTOS` | que el botón de pagar funcione |
| Supabase → Edge Functions → Secrets | `URL_REGRESO` | cambiarla de `http://localhost:5173/` a `https://danielbuitragoh.github.io/flowyn-fae-skin/` |
| Supabase → Edge Functions → Secrets | `CORREO_USUARIO`, `CORREO_CLAVE` (contraseña de aplicación de Gmail) | el correo de confirmación |
| Wompi → Configuración → Eventos | URL de eventos apuntando a `wompi-eventos` | que el pedido pase de "pendiente" a "aprobado" |

## 4. Probar en la URL real

Con todo lo anterior puesto: entrar con Google, agregar un frasco, llenar
los datos de envío, pagar con una tarjeta de sandbox, y confirmar que llegan
los dos correos y que el pedido queda "aprobado" en el historial de la
cuenta — ya no en `localhost`, sino en
`https://danielbuitragoh.github.io/flowyn-fae-skin/`.
