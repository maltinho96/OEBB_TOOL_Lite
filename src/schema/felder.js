// Gemeinsame HTML-Bausteine fuer die Protokoll-Templates.
// Erster, kleiner Satz an "Feldtypen" – hier bewusst schlank gehalten.
// Wiederkehrende Muster (Textfeld, Checkbox-Zeile, Foto-Abschnitt) kannst
// du spaeter nach Bedarf ergaenzen, ohne die Templates umzubauen.

import { HINWEIS_STANDARD } from '../config/haftungshinweis.js';

// Firmen-Logo. Das Bild liegt NICHT im Repo, sondern im Grundordner
// (Unterordner logos/, Dateiname steht in firmen.txt) und wird von
// ui/firma.js eingesetzt, sobald der Grundordner verbunden ist.
export function logo() {
  return '<span class="logo"><img alt="Logo"></span>';
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

// Knopf "Mail vorbereiten" am Protokollende (nur Bildschirm), verdrahtet in
// ui/mail.js. empfaenger: kurzer Hinweis, an wen die Mail geht.
export function mailKnopf(empfaenger) {
  return (
    '<div class="mail-leiste kein-druck">' +
    '<button type="button" class="mail-knopf" data-aktion="mail-vorbereiten">✉ Mail vorbereiten</button>' +
    '<span>Öffnet eine Mail ' + empfaenger + ' und kopiert den fertigen Text – im Mailfenster Strg+V. Das PDF bitte als Anhang dazulegen.</span>' +
    '</div>'
  );
}

// Fußzeile (Bildschirm-Vorschau am Dokumentende): Datum | Auftrag | Seite.
// Beim Drucken wird sie ausgeblendet; dort setzt ui/fusszeile.js dieselbe
// Zeile über @page-Seitenränder auf JEDE Seite, mit echter Seitenzahl.
// Rollen-/Haftungshinweis im Abschnitt mit der Unterschrift. Text: haftungshinweis.txt im
// Grundordner (ui/haftungshinweis.js), bis dahin der Standardtext.
// Als letzte Zeile der Unterschriften-Tabelle (farbe: 'gelb' | 'blau').
export function haftungshinweis(spalten, farbe = 'gelb') {
  return '<tr class="bg-' + farbe + ' hh-zeile" data-haftungshinweis><td colspan="' + spalten + '">' +
    '<b>Hinweis:</b> <span class="hh-text">' + HINWEIS_STANDARD + '</span></td></tr>';
}

export function abschlussFusszeile() {
  return (
    '<div class="dok-fusszeile" data-dok-fusszeile>' +
    '<span class="fz-datum"></span>' +
    '<span class="fz-text">Ökologische Baubegleitung</span>' +
    '<span class="fz-seite">Seite 1/x</span>' +
    '</div>'
  );
}
