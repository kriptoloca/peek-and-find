import { defineConfig } from 'vite';

// Platform rules (CLAUDE.md): relative base so the ZIP works from any folder,
// no inlined assets, no compression plugins, no external origins.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1600,
  },
});
