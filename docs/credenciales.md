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

## 4. WhatsApp — el número donde llegan los pedidos

La tienda no cobra sola: la clienta confirma su pedido por WhatsApp. Hace
falta un único secreto en Supabase — ver la Fase 4 más abajo para el detalle
completo. Sin él, el botón de pedir responde honestamente "los pedidos por
WhatsApp todavía no están configurados", igual que hacía antes con Wompi.

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

# Fase 4 · Pedidos por WhatsApp

**Estado: activo.** Se evaluó activar Wompi para cobrar de verdad y se
descartó a propósito: su registro actual (agosto 2026) exige, incluso solo
para llegar a las llaves de sandbox, dirección real, dos redes sociales
activas de la marca y una cuenta bancaria personal vinculada — el mismo
nivel de verificación que le pedirían a un negocio real cobrando de verdad.
No tenía sentido pagar ese costo, ni en tiempo ni en exponer una cuenta
bancaria propia, por un proyecto de portafolio que nunca va a facturar. En
su lugar, el pedido se cierra como lo cerraría cualquier tienda pequeña que
despacha ella misma: por chat.

El flujo es el mismo de siempre hasta el final: el navegador manda qué
producto y cuántos, nunca el precio; `supabase/funciones/crear-pedido`
recalcula el total contra su propia copia del catálogo, guarda el pedido y
sólo entonces arma el mensaje de WhatsApp con esos números — nunca con lo
que mandó el navegador. `npm run verificar` sigue probando que un precio
inyectado, una cantidad fuera de rango o una línea repetida para saltarse el
tope se rechacen igual que antes.

## 1. Sacar el número de WhatsApp Business

El número al que deben llegar los pedidos, en formato internacional y sin
signos: `57` + el número a 10 dígitos (ej. `573001234567` para un celular
`300 123 4567`).

## 2. Guardarlo en Supabase

En <https://supabase.com/dashboard> → tu proyecto → **Edge Functions →
Secrets**, añade:

| Nombre | Valor |
|---|---|
| `WHATSAPP_NUMERO` | tu número, ej. `573001234567` |

Hasta que lo pongas, el botón de pedir responde *"Los pedidos por WhatsApp
todavía no están configurados"* en lugar de fallar con un error feo. Es el
mismo patrón que tenía Wompi — un estado honesto, no un bug.

## 3. Probarlo

1. Arranca el sitio (`npm run dev`), entra con Google y añade un frasco.
2. Llena los datos de envío y pulsa **Pedir por WhatsApp**.
3. Se abre WhatsApp Web (o la app, en el celular) en una pestaña nueva, con
   el mensaje ya redactado: producto, envío, total y los datos de a dónde
   llevarlo. El sitio se queda abierto detrás, con el carrito vacío.
4. Abre tu cuenta en la tienda: el pedido tiene que aparecer en el
   historial, con estado "Recibido · por confirmar".

## Confirmar o cancelar un pedido

No hay panel propio para esto todavía — con el volumen de un proyecto de
portafolio no hace falta más que editar la fila a mano. En el panel de
Supabase → **Table Editor → pedidos**, cambia la columna `estado` de
`recibido` a `confirmado` (ya coordinaste el pago y el envío por WhatsApp) o
a `cancelado`. El cambio se refleja solo en el historial de la clienta la
próxima vez que abra su cuenta.

## Qué pasa si alguien intenta hacer trampa

El navegador sólo manda **qué producto y cuántos**. Nunca el precio, ni el
subtotal, ni el total. El servidor recalcula la cuenta entera desde su propia
copia del catálogo y sólo con ese resultado arma el mensaje de WhatsApp.
`npm run verificar` incluye una prueba que intenta colar precios falsos,
productos inventados, cantidades absurdas y líneas repetidas, y comprueba
que todas se rechacen.

---

# Fase 5 · El correo de confirmación

**Estado: activo.** Ya no depende de un webhook de pago: se manda directo
desde `crear-pedido` apenas el pedido queda guardado, con el aviso a la
clienta ("recibimos tu pedido, te escribimos por WhatsApp para confirmar")
y el aviso a ti con todo lo necesario para rellenar la guía de la
transportadora. Sin configurar esto, el pedido se registra igual — sólo que
nadie recibe el correo, y en el registro de la función queda un aviso.

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

Con el número de WhatsApp puesto (Fase 4), haz un pedido de prueba. Deberían
llegarte los dos correos apenas se registre el pedido, antes incluso de
tocar el enlace de WhatsApp. Si no llegan, mira el registro de
`crear-pedido` en el panel de Supabase: los fallos de correo se registran
ahí y **no** tumban el pedido, que queda registrado igual.

## Qué se manda

- **A la clienta:** referencia, líneas, envío, total, dirección completa,
  plazo de entrega y el aviso del derecho de retracto. Tablas con estilos en
  línea, porque los clientes de correo no entienden CSS moderno.
- **A ti:** los mismos datos en formato de ficha, pensado para copiar a la
  guía de la transportadora sin abrir la base de datos.

Se manda apenas el pedido queda guardado — ya no hace falta esperar un aviso
de una pasarela, porque ya no hay pasarela.

---

# Fase 6 · Publicar en GitHub Pages

**Estado: hecho.** El sitio está publicado en
<https://danielbuitragoh.github.io/flowyn-fae-skin/>. Lo que sigue es la
guía tal como se siguió para llegar ahí — queda como referencia, no como
pendiente.

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
(`.github/workflows/desplegar-paginas.yml`, con el mismo nombre y la misma
forma que en la-mesa): corre las 66 pruebas automáticas y sólo si todas
pasan sube el resultado a Pages.

## 3. Probar en la URL real

Con el repo publicado: entrar con Google, agregar un frasco al carrito,
llenar los datos de envío, y confirmar que el resumen y el botón de "Pedir
por WhatsApp" se comportan igual que en local — ya no en `localhost`, sino
en `https://danielbuitragoh.github.io/flowyn-fae-skin/`. Si el número de
WhatsApp (Fase 4) y las llaves de Gmail (Fase 5) ya están puestas en
Supabase, el pedido de prueba tiene que terminar en un mensaje de WhatsApp
real y dos correos.
