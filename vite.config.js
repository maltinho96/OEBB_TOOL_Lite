import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Phase 1: reine Browser-Entwicklung, noch ohne Tauri.
// (Fuer Tauri kaeme spaeter z. B. server.strictPort + build.target dazu.)
export default defineConfig({
  root: '.',            // Projektwurzel; index.html ist der Einstieg
  publicDir: 'public',  // wird 1:1 in den Build kopiert (Logos etc.)
  plugins: [
    // shpjs (Shapefile-Import) bringt eine Kette alter Node-Pakete mit
    // (buffer, string_decoder, safe-buffer, parsedbf, immediate, lie …),
    // die Node-Kernmodule wie "buffer" und das globale "global"-Objekt
    // erwarten. Dieses Plugin polyfillt sie automatisch fuer den Browser,
    // statt jede einzelne Stelle von Hand nachzuziehen.
    nodePolyfills(),
  ],
  server: {
    port: 5173,
    open: true,         // Browser beim Start automatisch oeffnen
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});