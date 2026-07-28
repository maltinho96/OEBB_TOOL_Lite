// Gemeinsame HTML-Bausteine fuer die Protokoll-Templates.
// Erster, kleiner Satz an "Feldtypen" – hier bewusst schlank gehalten.
// Wiederkehrende Muster (Textfeld, Checkbox-Zeile, Foto-Abschnitt) kannst
// du spaeter nach Bedarf ergaenzen, ohne die Templates umzubauen.

// Firmen-Logo. Verweist auf die Asset-Dateien in public/assets/ (statt
// wie im Original riesige Base64-Strings). Welches Logo sichtbar ist,
// steuert themes.css ueber die firma-Klasse am <html>.
export function logo() {
  return (
    '<span class="logo">' +
    '<img class="lg-greens" src="/assets/logo-greens.svg" alt="NET-TEC GREENgineers Logo">' +
    '<img class="lg-ing" src="/assets/logo-ing.svg" alt="NET-TEC Ingenieurgesellschaft Logo">' +
    '</span>'
  );
}

// Standard-Fotodokumentationsblock (Container + Dropzone).
// data-dropzone wird in ui/fotos.js verdrahtet (Stufe 4).
export function fotodokumentation(kleingedrucktes) {
  return (
    '<h2 class="c-grau">Fotodokumentation</h2>' +
    '<div class="fotoContainer"></div>' +
    '<div class="dropzone kein-druck" data-dropzone>' +
    '📷 Fotos hierher ziehen oder klicken zum Auswählen<br>' +
    '<small>' + kleingedrucktes + '</small>' +
    '</div>'
  );
}

// Uebersichtsplan-Block (Bildfeld + Textzeile).
// data-einzelbild="plan" wird in ui/fotos.js verdrahtet.
export function uebersichtsplan() {
  return (
    '<div class="zusammen">' +
    '<h2 class="c-grau">Übersichtsplan</h2>' +
    '<div class="plan-bild" data-einzelbild="plan" title="Klicken, um den Übersichtsplan einzufügen oder zu ersetzen"></div>' +
    '<div class="plan-text" contenteditable="true"></div>' +
    '</div>'
  );
}
