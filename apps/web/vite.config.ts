import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const monorepoRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  // Read root `.env` so local Hyper-V port exclusions (API_PORT=3100) match the proxy.
  const env = loadEnv(mode, monorepoRoot, '');
  const apiPort = env.API_PORT || '3000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    server: {
      port: 5173,
      // Same-origin in dev: cookies and the WebSocket upgrade just work, no CORS involved.
      proxy: { '/api': { target: `http://localhost:${apiPort}`, ws: true } },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      globals: true,
      exclude: ['e2e/**', 'node_modules/**'],
    },
  };
});
