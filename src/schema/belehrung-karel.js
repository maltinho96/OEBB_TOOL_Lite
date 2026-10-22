// Belehrungsprotokoll (Variante "Karel", inzwischen das einzige) – Inhalt
// nach der Word-Vorlage YYMMDD_Belehrungsprotokoll_TIEFBAUFIRMA_AUSBAUGEBIET
// ("Auflagen zum Naturschutz"): farbige table.form-Blöcke, Beschriftung
// links, Feld rechts, je Block eine farbige Überschrift darüber. Die
// interne Kennung bleibt "belehrung-karel", damit gespeicherte Protokolle
// weiter erkannt werden. Alle Felder sind leer; unter jedem
// Auflagen-Feld gibt es Knöpfe für Textbausteine (config/textbausteine.js,
// eingefügt von ui/bausteine.js – die Knöpfe werden nicht gedruckt).

import { logo, mailKnopf, abschlussFusszeile } from './felder.js';
import { visZeile, VIS_TEXTE } from './visualisierung.js';
import { TEXTBAUSTEINE } from '../config/textbausteine.js';
import { esc } from '../core/util.js';

// Auflagen-Block eines Themas – wie "Festlegungen der zuständigen
// Umweltbehörde" im Original: farbige Überschrift + ein farbiges Textfeld.
// data-thema identifiziert das Feld eindeutig (auch fürs "Protokoll laden",
// unabhängig von der Reihenfolge der Blöcke).
// Bleibt das Feld leer (z. B. keine Auflagen zum Wasser), wird der ganze
// Block nicht gedruckt (Klasse .leer, gesetzt in ui/bausteine.js).
function thema(key, titel, farbe) {
  const bausteine = TEXTBAUSTEINE[key] || [];
  const knoepfe = bausteine.length
    ? `<div class="bausteine kein-druck">${bausteine.map((b, i) =>
        `<button type="button" data-aktion="baustein" data-thema="${key}" data-idx="${i}" title="${esc(b.text)}">${esc(b.kurz)}</button>`).join('')}</div>`
    : '';
  return `
<div class="kb-thema leer">
<h2 class="c-${farbe}">${titel}<span class="kb-leer-hinweis kein-druck"> – leer, wird nicht gedruckt</span></h2>
<table class="form"><tr class="bg-${farbe}-h"><td><textarea class="kb-auflagen" data-thema="${key}"></textarea>${knoepfe}</td></tr></table>
</div>`;
}

export const belehrungKarel = {
  id: 'tab-belehrung-karel',
  key: 'belehrung-karel',
  label: '🎓 Belehrungsprotokoll',
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
    <td class="label">E-Mail:</td><td><input type="email" data-feld="bauleitung-email"></td>
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
  <tr class="bg-grau"><td class="label">Aktenzeichen:</td><td colspan="3"><textarea rows="2" data-feld="aktenzeichen"></textarea></td></tr>
</table>

${thema('gehoelz', 'Gehölzschutz', 'gruen')}
${thema('boden', 'Bodenschutz', 'orange')}
${thema('arten', 'Artenschutz', 'pink')}
${thema('wasser', 'Gewässer- und Grundwasserschutz', 'blau')}
${thema('sonstiges', 'Sonstige Auflagen', 'grau')}

<h2 class="c-grau">Visualisierung der geltenden Bestimmungen</h2>
<div class="visContainer">${VIS_TEXTE.map((text, i) => visZeile(text, 'belehrung_bild_' + String(i + 1).padStart(2, '0') + '.png')).join('')}
</div>

<h2 class="c-gelb">Hinweise</h2>
<table class="form">
<tr class="bg-gelb-h"><td><div class="kb-hinweise" contenteditable="true">Eine ökologische Baubegleitung ist für die gesamte Dauer des Vorhabens gefordert und hat die Baustelle regelmäßig zu begehen (mind. 1× pro Woche). Die Protokolle werden wöchentlich zusammengefasst durch die ÖBB an die UNB versandt.

Bei einer ökologischen Baubegleitung handelt es sich um eine beratende Tätigkeit, das Verursacherprinzip bleibt davon unangetastet.

Der Bauleiter/Polier der beauftragten Tiefbaufirma ist dafür verantwortlich, alle ausführenden Arbeitskräfte der Baustelle (dies umfasst ebenfalls ggf. von der Tiefbaufirma beauftragte Subunternehmer) über sämtliche Punkte dieses Protokolls auf verständliche, auch sprachlich verständliche, und praxistaugliche Weise aufzuklären und zu sensibilisieren.</div></td></tr>
<tr class="bg-gelb-h"><td>
  <div class="kb-punkt">Infoflyer „Baumschutz auf Baustellen“ an die Bauleitung in folgenden Sprachen übergeben:</div>
  <div class="kb-sprachen">
    <label class="cb"><input type="checkbox" checked> Deutsch</label>
    <label class="cb"><input type="checkbox"> Rumänisch</label>
    <label class="cb"><input type="checkbox"> Polnisch</label>
    <label class="cb"><input type="checkbox"> Türkisch</label>
  </div>
</td></tr>
</table>

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

${mailKnopf('an die Bauleitung (E-Mail oben)')}

${abschlussFusszeile()}
`,
};
