// Vorbegehungsprotokoll. HTML originalgetreu; Logos/onclick angepasst.

import { logo, fotodokumentation, uebersichtsplan } from './felder.js';

export const vorbegehung = {
  id: 'tab-vorbegehung',
  key: 'vorbegehung',
  label: '🚶 Vorbegehungsprotokoll',
  html: () => `
${logo()}
<h1><span class="nr"><input type="text" value="" aria-label="Protokollnummer" data-feld="nummer">.</span> Vorbegehungsprotokoll der ökologischen Baubegleitung</h1>

<table class="form">
  <tr class="bg-blau"><td class="label" style="width:220px">Netzbetreiber:</td><td><input type="text"></td></tr>
  <tr class="bg-blau-h"><td class="label">Tiefbauunternehmen:</td><td><input type="text"></td></tr>
  <tr class="bg-blau"><td class="label">Projekt:</td><td><textarea rows="3" data-feld="projekt"></textarea></td></tr>
</table>

<h2 class="c-grau">Vorbegehung</h2>
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

<h2 class="c-gruen">Festlegungen aus dem Bescheid der zuständigen Umweltbehörde</h2>
<table class="form"><tr class="bg-gruen-h"><td><textarea class="gross"></textarea></td></tr></table>

<h2 class="c-pink">Rechtliche Grundlagen, Normen und Regeln</h2>
<table class="form"><tr class="bg-pink-h"><td><textarea class="gross"></textarea></td></tr></table>

<h2 class="c-orange">Zusätzliche Festlegungen in Abstimmung mit der ÖBB</h2>
<table class="form"><tr class="bg-orange-h"><td><textarea class="gross"></textarea></td></tr></table>

<div class="zusammen">
<h2 class="c-gelb">Ökologische Baubegleitung</h2>
<table class="form">
  <tr class="bg-gelb"><td colspan="4" class="label">Anlass:<textarea rows="3"></textarea></td></tr>
  <tr class="bg-gelb-h">
    <td><span class="zeile"><b>Telefon:</b> <input type="tel"></span></td>
    <td><span class="zeile"><b>PLZ:</b> <input type="text" style="width:70px"></span></td>
    <td colspan="2"><span class="zeile"><b>Straße:</b> <input type="text"></span></td>
  </tr>
  <tr class="bg-gelb-h">
    <td class="label" colspan="2">Ökologische*r Baubegleiter*in:<br><input type="text" data-feld="baubegleiter"></td>
    <td class="label" colspan="2" rowspan="2">Unterschrift:
      <div class="unterschrift-feld" data-einzelbild="unterschrift" title="Klicken, um ein Unterschrift-Bild einzufügen"></div>
    </td>
  </tr>
  <tr class="bg-gelb-h">
    <td colspan="2"><span class="zeile"><b>Ort / Datum:</b> <input type="text" value="Berlin" style="max-width:140px">, <input type="date" style="max-width:150px"></span></td>
  </tr>
</table>
</div>

${uebersichtsplan()}

${fotodokumentation('Je 2 Fotos ergeben eine Abbildung (umschaltbar auf 1 Bild) · Kartenausschnitt wird automatisch vom Übersichtsplan übernommen')}
`,
};