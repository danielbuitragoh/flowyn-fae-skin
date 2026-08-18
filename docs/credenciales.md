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
