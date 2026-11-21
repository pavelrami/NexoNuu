import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Librerías en archivos aparte: el navegador las guarda en caché entre versiones del sitio.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('gsap') || id.includes('lenis')) return 'movimiento';
          if (id.includes('leaflet')) return 'mapa'; // solo se descarga al abrir el mapa del voluntariado
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
