// Firmenlogos aus dem Grundordner laden (statt aus dem Repo), damit jede
// Firma ihr eigenes Logo verwenden kann. Gesucht wird pro Firma aus
// config/firmen.js eine Datei logo-<id>.<endung> im Grundordner, z. B.
//   logo-ing.svg   logo-greens.png
// Gefundene Logos werden als data:-URL in alle Logo-Bilder eingesetzt –
// dadurch landen sie beim Speichern auch automatisch in der Protokolldatei.
// Fehlt eine Datei, bleibt das Logo einfach leer (siehe grundlagen.css).

import { FIRMEN } from '../config/firmen.js';
import { dateiAlsDataUrl } from '../core/storage/index.js';

const ENDUNGEN = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

// Gibt die Dateinamen der gefundenen Logos zurück (für die Statusanzeige).
export async function logosLaden(ordner) {
  if (!ordner) return [];
  const gefunden = [];
  for (const firma of FIRMEN) {
    let url = null;
    for (const endung of ENDUNGEN) {
      const name = 'logo-' + firma.id + '.' + endung;
      url = await dateiAlsDataUrl(ordner, name);
      if (url) { gefunden.push(name); break; }
    }
    document.querySelectorAll('.logo img.lg-' + firma.id).forEach((img) => {
      if (url) img.src = url;
      else img.removeAttribute('src');
    });
  }
  return gefunden;
}
