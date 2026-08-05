// Belehrungsprotokoll. HTML originalgetreu; Logos/onclick angepasst.
// Die Visualisierungs-Bildfelder sind mit Standard-Referenzbildern
// vorbelegt (public/assets/belehrung_bilder/belehrung_bild_01.png … 09.png,
// eins je
// VIS_TEXTE-Zeile in Reihenfolge) – per Klick weiterhin ersetzbar.
// data-Hooks: vis-bild -> data-einzelbild="vis", ✕ -> data-aktion="vis-entfernen",
//             ＋ Zeile -> data-aktion="vis-zeile-hinzu" (verdrahtet in ui/fotos.js).

import { logo } from './felder.js';

// import.meta.env.BASE_URL: lokal "/", auf GitHub Pages "/OEBB_TOOL_Lite/",
// spaeter unter Tauri entsprechend – siehe felder.js logo() fuer denselben Trick.
const BASIS = import.meta.env.BASE_URL;

// Eine Visualisierungszeile mit vorbelegtem Text und optional einem
// Standard-Referenzbild (public/assets/belehrung_bilder/belehrung_bild_01.png …).
// Klick auf das Bild ersetzt es weiterhin wie gewohnt durch ein eigenes
// (data-einzelbild="vis", verdrahtet in ui/fotos.js) – die Vorbelegung
// ist nur ein Startpunkt, kein fester Wert.
function visZeile(text, bildDatei) {
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

const VIS_TEXTE = [
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

export const belehrung = {
  id: 'tab-belehrung',
  key: 'belehrung',
  label: '🎓 Belehrungsprotokoll',
  html: () => `
${logo()}
<h1>Belehrungsprotokoll der ökologischen Baubegleitung</h1>

<table class="form">
  <tr class="bg-blau"><td class="label" style="width:220px">Leitungsinhabende Firma:</td><td><input type="text"></td></tr>
  <tr class="bg-blau-h"><td class="label">Aufgrabende Firma:</td><td><input type="text"></td></tr>
  <tr class="bg-blau"><td class="label">Projekt:</td><td><textarea rows="2" data-feld="projekt"></textarea></td></tr>
</table>

<h2 class="c-grau">Geltungsbereich und Adressat*innen des Belehrungsprotokolls</h2>
<table class="form">
  <tr class="bg-grau">
    <td class="label" style="width:120px">Datum:</td><td style="width:200px"><input type="date" data-feld="datum"></td>
    <td class="label" style="width:60px">Ort:</td><td><input type="text" data-feld="ort"></td>
  </tr>
  <tr class="bg-grau-h"><td class="label">Landkreis:</td><td colspan="3"><input type="text"></td></tr>
  <tr class="bg-grau">
    <td class="label">Straße:</td><td colspan="2"><input type="text"></td>
    <td><span class="zeile"><b>Hausnummer/n:</b> <input type="text" style="width:80px"></span></td>
  </tr>
  <tr class="bg-grau-h">
    <td class="label" colspan="2">Teilnehmende:<textarea rows="3"></textarea></td>
    <td class="label" colspan="2">Adressiert an:<textarea rows="3"></textarea></td>
  </tr>
  <tr class="bg-grau"><td class="label" colspan="2">Geltendes naturschutzrechtliches Aktenzeichen:</td><td colspan="2"><input type="text"></td></tr>
  <tr class="bg-grau-h"><td class="label">Projektnummer:</td><td colspan="3"><input type="text" data-feld="projektnummer"></td></tr>
</table>

<h2 class="c-gruen">Festlegungen der zuständigen Umweltbehörde und zusätzliche Festlegungen der ÖBB</h2>
<table class="form"><tr class="bg-gruen-h"><td><textarea class="gross"></textarea></td></tr></table>

<h2 class="c-pink">Rechtliche Grundlagen, Normen und Regeln</h2>
<table class="form"><tr class="bg-pink-h"><td><textarea class="gross" style="min-height:110px"></textarea></td></tr></table>

<h2 class="c-grau">Visualisierung der geltenden Bestimmungen</h2>
<div class="visContainer">${VIS_TEXTE.map((text, i) => visZeile(text, 'belehrung_bild_' + String(i + 1).padStart(2, '0') + '.png')).join('')}
</div>
<button class="kein-druck" style="margin-top:8px" data-aktion="vis-zeile-hinzu">＋ Zeile hinzufügen</button>

<div class="zusammen">
<div class="bestaetigung" contenteditable="true">Hiermit bestätige ich, dass ich die oben aufgeführten Vorgaben, Auflagen und Festlegungen des Naturschutzes sowie die Zusatzfestlegungen der Ökologischen Baubegleitung (ÖBB) vollständig zur Kenntnis genommen und verstanden habe.
Ich verpflichte mich, diese Bestimmungen bei der Ausführung der Bauarbeiten strikt einzuhalten und an das ausführende Personal auf der Baustelle weiterzugeben. Ein Exemplar dieses Protokolls wurde mir digital ausgehändigt.</div>
<table class="form">
  <tr class="bg-blau-h">
    <td class="label" style="width:50%">Name der Bauleitung:<br><input type="text"></td>
    <td class="label" rowspan="2">Unterschrift:
      <div class="unterschrift-feld" data-einzelbild="unterschrift" title="Klicken, um ein Unterschrift-Bild einzufügen"></div>
    </td>
  </tr>
  <tr class="bg-blau-h">
    <td><span class="zeile"><b>Ort / Datum:</b> <input type="text" style="max-width:140px">, <input type="date" style="max-width:150px"></span></td>
  </tr>
</table>
</div>
`,
};