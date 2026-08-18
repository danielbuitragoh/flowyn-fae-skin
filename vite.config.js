import { defineConfig } from 'vite';

// GitHub Pages sirve el proyecto desde /<nombre-del-repo>/, así que las rutas
// absolutas necesitan ese prefijo en producción. En desarrollo la raíz es "/",
// por eso la base es condicional en lugar de fija.
const NOMBRE_REPO = 'flowyn-fae-skin';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${NOMBRE_REPO}/` : '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // el logo va en línea por código, no por el bundler
  },
}));
