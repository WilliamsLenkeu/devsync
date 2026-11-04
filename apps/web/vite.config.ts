import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    // Same-origin in dev: cookies and the WebSocket upgrade just work, no CORS involved.
    proxy: { '/api': { target: 'http://localhost:3000', ws: true } },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], globals: true, exclude: ['e2e/**', 'node_modules/**'] },
});
