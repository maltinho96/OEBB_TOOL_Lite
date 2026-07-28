import { defineConfig } from 'vite';

// Phase 1: reine Browser-Entwicklung, noch ohne Tauri.
// (Fuer Tauri kaeme spaeter z. B. server.strictPort + build.target dazu.)
export default defineConfig({
  root: '.',            // Projektwurzel; index.html ist der Einstieg
  publicDir: 'public',  // wird 1:1 in den Build kopiert (Logos etc.)
  server: {
    port: 5173,
    open: true,         // Browser beim Start automatisch oeffnen
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
