import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev/build config (replaces the deprecated Create React App tooling).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    // Polling makes file watching reliable inside Docker / WSL bind mounts.
    watch: { usePolling: true },
    // When the dev server port is remapped (e.g. Docker 7000:3000), tell the
    // HMR client which port the browser actually reaches it on.
    hmr: process.env.HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.HMR_CLIENT_PORT) }
      : undefined,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:7001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
