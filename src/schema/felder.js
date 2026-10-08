// Gemeinsame HTML-Bausteine fuer die Protokoll-Templates.
// Erster, kleiner Satz an "Feldtypen" – hier bewusst schlank gehalten.
// Wiederkehrende Muster (Textfeld, Checkbox-Zeile, Foto-Abschnitt) kannst
// du spaeter nach Bedarf ergaenzen, ohne die Templates umzubauen.

// Firmen-Logo. Verweist auf die Asset-Dateien in public/assets/ (statt
// wie im Original riesige Base64-Strings). Welches Logo sichtbar ist,
// steuert themes.css ueber die firma-Klasse am <html>.
//
// import.meta.env.BASE_URL statt eines fest verdrahteten "/assets/..."-
// Pfads: lokal ist das "/", auf GitHub Pages "/OEBB_TOOL_Lite/" (siehe
// vite.config.js "base"). Ohne das wuerden die Logos unter Pages ins
// Leere zeigen (Pfad relativ zur Domain-Wurzel statt zum Unterordner).
const BASIS = import.meta.env.BASE_URL;

export function logo() {
  return (
    '<span class="logo">' +
    '<img class="lg-greens" src="' + BASIS + 'assets/logo-greens.svg" alt="NET-TEC GREENgineers Logo">' +
    '<img class="lg-ing" src="' + BASIS + 'assets/logo-ing.svg" alt="NET-TEC Ingenieurgesellschaft Logo">' +
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