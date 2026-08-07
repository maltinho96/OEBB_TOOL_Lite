import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// base wird NUR beim Production-Build gesetzt (npm run build -> GitHub
// Pages liefert unter /OEBB_TOOL_Lite/ aus). Im Dev-Modus (npm run dev)
// bleibt base auf "/", damit die App lokal / in Codespaces unter der
// Wurzel-URL laeuft und man keinen Unterpfad an die URL haengen muss.
// command ist 'serve' bei dev, 'build' beim Bauen.
export default defineConfig(({ command }) => ({
  root: '.',            // Projektwurzel; index.html ist der Einstieg
  publicDir: 'public',  // wird 1:1 in den Build kopiert (Logos etc.)
  base: command === 'build' ? '/OEBB_TOOL_Lite/' : '/',
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
    strictPort: true,   // lieber Fehler als stiller Port-Wechsel
    open: true,         // Browser beim Start automatisch oeffnen
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));