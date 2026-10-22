import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Content-Security-Policy für die veröffentlichte App (nur im Build – der
// Dev-Server braucht u. a. eine WebSocket-Verbindung für das Neuladen).
// Erlaubt nur eigene Skripte; Bilder/Kacheln von OpenStreetMap; keine
// Plugins, keine fremden Formular-Ziele.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "connect-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function cspEinfuegen() {
  return {
    name: 'csp-einfuegen',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="' + CSP + '" />');
    },
  };
}

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
    cspEinfuegen(),
    // shpjs (Shapefile-Import) bringt eine Kette alter Node-Pakete mit
    // (buffer, string_decoder, safe-buffer, parsedbf, immediate, lie …),
    // die Node-Kernmodule wie "buffer" und das globale "global"-Objekt
    // erwarten. Dieses Plugin polyfillt sie automatisch fuer den Browser,
    // statt jede einzelne Stelle von Hand nachzuziehen.
    // Nur die Module, die shpjs wirklich braucht – sonst landen u. a.
    // Krypto-Polyfills (elliptic …) unnötig im Bundle.
    nodePolyfills({
      include: ['buffer', 'string_decoder', 'stream', 'util', 'events', 'process'],
      globals: { Buffer: true, global: true, process: true },
    }),
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