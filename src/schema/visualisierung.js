// Piktogramm-Zeilen "Visualisierung der geltenden Bestimmungen" für das
// Belehrungsprotokoll: je Zeile ein Bild (Standard-Referenzbild aus
// public/assets/belehrung_bilder/, per Klick ersetzbar – data-einzelbild="vis",
// verdrahtet in ui/fotos.js) und ein frei änderbarer Text.

// import.meta.env.BASE_URL: lokal "/", auf GitHub Pages "/OEBB_TOOL_Lite/".
const BASIS = import.meta.env.BASE_URL;

// Eine Visualisierungszeile mit vorbelegtem Text und optional einem
// Standard-Referenzbild (public/assets/belehrung_bilder/belehrung_bild_01.png …).
// Klick auf das Bild ersetzt es weiterhin wie gewohnt durch ein eigenes
// (data-einzelbild="vis", verdrahtet in ui/fotos.js) – die Vorbelegung
// ist nur ein Startpunkt, kein fester Wert.
export function visZeile(text, bildDatei) {
  const bildHtml = bildDatei
    ? '<img src="' + BASIS + 'assets/belehrung_bilder/' + bildDatei + '" alt="">'
    : '';
  return `
  <div class="vis-zeile">
    <div class="vis-bild" data-einzelbild="vis">${bildHtml}</div>
    <div class="vis-text" contenteditable="true">${text}</div>
    <button class="vis-entfernen kein-druck" data-aktion="vis-entfernen">✕</button>
  </div>`;
}

export const VIS_TEXTE = [
  `− Wurzelraum = Kronentraufe + 1,5 m
   − Kein Baggereinsatz
   − Kein Bodenauftrag
   − Kein Bodenabtrag
   − Keine Lagerung/Abstellen von Baumaschinen und Baumaterial`,
  `− Bohrpress- und Spülverfahren (geschlossene Bauweise):
   − Mindesttiefe 1,50 m
   − Montagegrube außerhalb von Kronentraufe
   − In Ausnahmefällen: Handschachtung im Wurzelbereich erlaubt`,
  `− Pressbohrung bei Baumstandorten
− Handschachtung im Wurzelbereich: Abstand zum Stammfuß mindestens 2,50 m`,
  `− Wurzeln &gt; 2 cm Durchmesser nicht durchtrennen
− Schäden sind zu vermeiden
− Bei durchtrennten Wurzeln Wurzelbehandlung, d.h. Glattschnitt und Wundbehandlung`,
  `− Nicht tagesaktuell verschlossene Baugrube:
   − Wurzeln mittels Jute o. ä. vor Austrocknung und Sonneneinstrahlung schützen`,
  `− Wundverschlussmittel bei Wurzelverletzungen ab Daumendicke
− Fotodokumentation (Baumnummer oder Standort, Art/Größe der Verletzung)
− Mitteilung an ÖBB, um fachliche Behandlung der Wurzelverletzung zu gewährleisten`,
  `− Möglichst taggleiches Verschließen, sonst:
   − Kleintierausstiegshilfen (min. 15 cm breit, Querleisten, ca. 40° auslaufend)
   − Sichtkontrolle von Baugruben`,
  `− Getrennte Lagerung von Ober- und Unterboden
− Einbau entsprechend der ursprünglichen Schichtung
− Wiederherstellung der ursprünglichen Geländeverhältnisse`,
  `− Material, Baumaschinen und Fahrzeuge auf vorverdichteten Flächen abstellen
− Biologisch abbaubare Öle einsetzen
− Für Havariefälle ausreichend dimensionierte Auffangbehälter und Adsorptionsmittel vorhalten`,
];
