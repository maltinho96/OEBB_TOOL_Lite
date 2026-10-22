// Gemeinsame HTML-Bausteine fuer die Protokoll-Templates.
// Erster, kleiner Satz an "Feldtypen" – hier bewusst schlank gehalten.
// Wiederkehrende Muster (Textfeld, Checkbox-Zeile, Foto-Abschnitt) kannst
// du spaeter nach Bedarf ergaenzen, ohne die Templates umzubauen.

import { FIRMEN } from '../config/firmen.js';

// Firmen-Logo. Die Bilder liegen NICHT im Repo, sondern im Grundordner
// (logo-<firma-id>.svg/.png/.jpg, z. B. logo-ing.png) und werden von
// ui/logo.js eingesetzt, sobald der Grundordner verbunden ist. So kann jede
// Firma ihr eigenes Logo verwenden. Welches Logo sichtbar ist, steuert
// themes.css über die firma-Klasse am <html>.
export function logo() {
  return (
    '<span class="logo">' +
    FIRMEN.map((f) => '<img class="lg-' + f.id + '" alt="' + f.name + ' Logo">').join('') +
    '</span>'
  );
}

// Standard-Fotodokumentationsblock (Container + Dropzone).
// data-dropzone wird in ui/fotos.js verdrahtet (Stufe 4).
export function fotodokumentation(kleingedrucktes) {
  return (
    '<h2 class="c-grau fotodoku-titel">Fotodokumentation</h2>' +
    '<div class="fotoContainer"></div>' +
    '<div class="dropzone kein-druck" data-dropzone>' +
    '📷 Fotos hierher ziehen oder klicken zum Auswählen<br>' +
    '<small>' + kleingedrucktes + '</small>' +
    '</div>'
  );
}

// Uebersichtsplan-Block: OSM-Karte, auf der die Bereiche der Foto-Gruppen
// als blaue Rechtecke markiert werden (ui/fotokarte.js). Ersetzt das
// frühere Bild-Upload-Feld. Die Textzeile darunter bleibt für Anmerkungen.
export function uebersichtsplan() {
  return (
    '<div class="zusammen">' +
    '<h2 class="c-grau">Übersichtsplan</h2>' +
    '<div class="plankarte" data-plankarte>' +
    '<div class="plankarte-map"></div>' +
    '</div>' +
    '<div class="plankarte-hinweis kein-druck">Eingefügte Fotos mit Standortdaten markieren hier automatisch die fotografierten Bereiche (blaue Rechtecke).</div>' +
    '<div class="plan-text" contenteditable="true"></div>' +
    '</div>'
  );
}

// Fußzeile (Bildschirm-Vorschau am Dokumentende): Datum | Auftrag | Seite.
// Beim Drucken wird sie ausgeblendet; dort setzt ui/fusszeile.js dieselbe
// Zeile über @page-Seitenränder auf JEDE Seite, mit echter Seitenzahl.
export function abschlussFusszeile() {
  return (
    '<div class="dok-fusszeile" data-dok-fusszeile>' +
    '<span class="fz-datum"></span>' +
    '<span class="fz-text">Ökologische Baubegleitung</span>' +
    '<span class="fz-seite">Seite 1/x</span>' +
    '</div>'
  );
}
