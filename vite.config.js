import { defineConfig } from 'vite';

// GitHub Pages sirve el proyecto desde /<nombre-del-repo>/, así que las rutas
// absolutas necesitan ese prefijo en producción. En desarrollo la raíz es "/",
// por eso la base es condicional en lugar de fija.
const NOMBRE_REPO = 'flowyn-fae-skin';

// Se mira `mode` y no `command` a propósito: `vite preview` sirve la carpeta
// ya construida, pero su `command` es "serve", así que con la condición
// anterior la base valía "/" mientras el HTML pedía "/flowyn-fae-skin/…" y
// todos los recursos daban 404. `mode` sí vale "production" en preview, que
// es justo lo que queremos comprobar antes de publicar.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? `/${NOMBRE_REPO}/` : '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // el logo va en línea por código, no por el bundler
  },
}));
