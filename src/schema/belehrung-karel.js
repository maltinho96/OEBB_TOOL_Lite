// Belehrungsprotokoll "Karel" – Inhalt nach der Word-Vorlage
// YYMMDD_Belehrungsprotokoll_TIEFBAUFIRMA_AUSBAUGEBIET.docx ("Auflagen zum
// Naturschutz"), Gestaltung wie das Original-Belehrungsprotokoll
// (belehrung.js): farbige table.form-Blöcke, Beschriftung links, Feld
// rechts, je Block eine farbige Überschrift darüber. Das Original bleibt
// unverändert daneben bestehen. Alle Felder sind leer.

import { logo, abschlussFusszeile } from './felder.js';
import { visZeile, VIS_TEXTE } from './belehrung.js';

// Auflagen-Block eines Themas – wie "Festlegungen der zuständigen
// Umweltbehörde" im Original: farbige Überschrift + ein farbiges Textfeld.
function thema(titel, farbe) {
  return `
<h2 class="c-${farbe}">${titel}</h2>
<table class="form"><tr class="bg-${farbe}-h"><td><textarea class="kb-auflagen"></textarea></td></tr></table>`;
}

export const belehrungKarel = {
  id: 'tab-belehrung-karel',
  key: 'belehrung-karel',
  label: '🎓 Belehrung (Karel)',
  html: () => `
${logo()}
<h1>Auflagen zum Naturschutz</h1>

<table class="form">
  <tr class="bg-blau"><td class="label" style="width:220px">Auftraggeber:</td><td><input type="text" data-feld="auftraggeber-fuss"></td></tr>
  <tr class="bg-blau-h"><td class="label">Ausbaugebiet:</td><td><input type="text" data-feld="ort"></td></tr>
  <tr class="bg-blau"><td class="label">Bauvorhaben:</td><td><textarea rows="2" data-feld="projekt"></textarea></td></tr>
  <tr class="bg-blau-h"><td class="label">Projekt-/Bestellnummer(n):</td><td><textarea rows="2" data-feld="projektnummer"></textarea></td></tr>
</table>

<h2 class="c-grau">Ausführende Tiefbaufirma</h2>
<table class="form kb-kontakte">
  <tr class="bg-grau">
    <td class="label" colspan="2">Bauleitung gestellt durch:</td>
    <td class="label" colspan="2">Bauüberwachung gestellt durch:</td>
  </tr>
  <tr class="bg-grau-h">
    <td class="label">Firma:</td><td><input type="text" data-feld="tiefbaufirma"></td>
    <td class="label">Firma:</td><td><input type="text"></td>
  </tr>
  <tr class="bg-grau">
    <td class="label">Name:</td><td><input type="text"></td>
    <td class="label">Name:</td><td><input type="text"></td>
  </tr>
  <tr class="bg-grau-h">
    <td class="label">Telefon:</td><td><input type="tel"></td>
    <td class="label">Telefon:</td><td><input type="tel"></td>
  </tr>
  <tr class="bg-grau">
    <td class="label">E-Mail:</td><td><input type="email"></td>
    <td class="label">E-Mail:</td><td><input type="email"></td>
  </tr>
</table>

<h2 class="c-grau">Belehrung und Zuständigkeit</h2>
<table class="form">
  <tr class="bg-grau">
    <td class="label" style="width:220px">Belehrung durchgeführt am:</td>
    <td colspan="3"><input type="date" data-feld="datum" style="max-width:180px"></td>
  </tr>
  <tr class="bg-grau-h">
    <td class="label">Belehrung / ÖBB durch:</td><td><input type="text" data-feld="baubegleiter"></td>
    <td class="label" style="width:80px">Telefon:</td><td style="width:200px"><input type="tel"></td>
  </tr>
  <tr class="bg-grau">
    <td class="label">E-Mail:</td><td colspan="3"><input type="email"></td>
  </tr>
  <tr class="bg-grau-h"><td class="label">Zuständige Naturschutzbehörde:</td><td colspan="3"><textarea rows="2"></textarea></td></tr>
  <tr class="bg-grau"><td class="label">Aktenzeichen:</td><td colspan="3"><textarea rows="2"></textarea></td></tr>
</table>

${thema('Artenschutz', 'pink')}
${thema('Gehölzschutz', 'gruen')}
${thema('Bodenschutz', 'orange')}
${thema('Gewässer- und Grundwasserschutz', 'blau')}
${thema('Sonstige Auflagen', 'grau')}

<h2 class="c-grau">Visualisierung der geltenden Bestimmungen</h2>
<div class="visContainer">${VIS_TEXTE.map((text, i) => visZeile(text, 'belehrung_bild_' + String(i + 1).padStart(2, '0') + '.png')).join('')}
</div>

<h2 class="c-gelb">Hinweise</h2>
<table class="form"><tr class="bg-gelb-h"><td><div class="kb-hinweise" contenteditable="true">Eine ökologische Baubegleitung ist für die gesamte Dauer des Vorhabens gefordert und hat die Baustelle regelmäßig zu begehen (mind. 1× pro Woche). Die Protokolle werden wöchentlich zusammengefasst durch die ÖBB an die UNB versandt.

Bei einer ökologischen Baubegleitung handelt es sich um eine beratende Tätigkeit, das Verursacherprinzip bleibt davon unangetastet.

Der Bauleiter/Polier der beauftragten Tiefbaufirma ist dafür verantwortlich, alle ausführenden Arbeitskräfte der Baustelle (dies umfasst ebenfalls ggf. von der Tiefbaufirma beauftragte Subunternehmer) über sämtliche Punkte dieses Protokolls auf verständliche, auch sprachlich verständliche, und praxistaugliche Weise aufzuklären und zu sensibilisieren.</div></td></tr></table>

<div class="zusammen">
<h2 class="c-grau">Kenntnisnahme</h2>
<table class="form kb-kenntnis">
  <tr class="bg-blau-h">
    <td class="label" style="width:50%">Bauleitung (Name):<input type="text"></td>
    <td class="label">Bauüberwachung (Name):<input type="text"></td>
  </tr>
  <tr class="bg-blau-h">
    <td class="label">Unterschrift:<div class="unterschrift-feld" data-einzelbild="unterschrift" title="Klicken, um ein Unterschrift-Bild einzufügen"></div></td>
    <td class="label">Unterschrift:<div class="unterschrift-feld" data-einzelbild="unterschrift" title="Klicken, um ein Unterschrift-Bild einzufügen"></div></td>
  </tr>
  <tr class="bg-blau">
    <td colspan="2"><span class="zeile"><b>Ort / Datum:</b> <input type="text" value="Berlin" style="max-width:140px">, <input type="date" style="max-width:150px"></span></td>
  </tr>
</table>
</div>

${abschlussFusszeile()}
`,
};