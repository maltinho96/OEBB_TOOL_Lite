// Begehungsprotokoll (Haupt-Protokolltyp). HTML originalgetreu aus der
// Ausgangsdatei; Base64-Logos ersetzt (felder.logo), Inline-onclick durch
// data-Hooks ersetzt (in ui/fotos.js verdrahtet).

import { logo, fotodokumentation, uebersichtsplan } from './felder.js';

export const begehung = {
  id: 'tab-protokoll',
  key: 'protokoll',
  label: '📋 Begehungsprotokoll',
  html: () => `
${logo()}
<h1><span class="nr"><input type="text" value="" aria-label="Protokollnummer" data-feld="nummer">.</span> Protokoll der ökologischen Baubegleitung</h1>

<table class="form">
  <tr class="bg-blau"><td class="label" style="width:220px">Netzbetreiber:</td><td><input type="text"></td></tr>
  <tr class="bg-blau-h"><td class="label">Tiefbauunternehmen:</td><td><input type="text"></td></tr>
  <tr class="bg-blau"><td class="label">Projekt:</td><td><textarea rows="3" data-feld="projekt"></textarea></td></tr>
</table>

<h2 class="c-grau">Begehung</h2>
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
  <tr class="bg-grau"><td class="label">Fotostandorte:</td><td colspan="3"><textarea rows="2"></textarea></td></tr>
</table>

<h2 class="c-gruen">Baumschutz</h2>
<table class="form">
  <tr class="bg-gruen"><td colspan="7"><span class="cb"><b>Begehung ohne Beanstandung:</b> <input type="checkbox" checked></span></td></tr>
  <tr class="bg-gruen-h"><td colspan="7" class="label">Feinst- und Feinwurzelflächenverlust m²: <input type="text" style="width:90px"></td></tr>
</table>
<table class="form wurzeltab">
  <tr class="bg-gruen-h">
    <td class="kopf" rowspan="3">Rindenschäden</td>
    <td class="label">Schwachwurzel/-n*:</td><td><input type="text"></td>
    <td class="kopf" rowspan="3">Wurzelverlust</td>
    <td class="label">Schwachwurzel/-n*:</td><td><input type="text"></td>
    <td class="kopf" rowspan="3">Altschäden</td>
    <td class="label">Schwachwurzel/-n*:</td><td><input type="text"></td>
  </tr>
  <tr class="bg-gruen-h">
    <td class="label">Grobwurzel/-n*:</td><td><input type="text"></td>
    <td class="label">Grobwurzel/-n*:</td><td><input type="text"></td>
    <td class="label">Grobwurzel/-n*:</td><td><input type="text"></td>
  </tr>
  <tr class="bg-gruen-h">
    <td class="label">Starkwurzel/-n*:</td><td><input type="text"></td>
    <td class="label">Starkwurzel/-n*:</td><td><input type="text"></td>
    <td class="label">Starkwurzel/-n*:</td><td><input type="text"></td>
  </tr>
</table>
<table class="form">
  <tr class="bg-gruen"><td><span class="cb"><b>Schutzabstände wurden eingehalten:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-gruen-h"><td class="label">Kommentar Schaden und Ursache:<textarea rows="3"></textarea></td></tr>
  <tr class="bg-gruen-h"><td class="label">Durchzuführende Baumpflegerische Maßnahmen:<textarea rows="2"></textarea></td></tr>
  <tr class="bg-gruen-h"><td>
    <div class="prio-hinweis">Priorität der Maßnahme/n:</div>
    <div class="prio">
      <label class="cb"><b>0</b> <input type="radio" name="prio" value="0" checked></label>
      <label class="cb"><b>1</b> <input type="radio" name="prio" value="1"></label>
      <label class="cb"><b>2</b> <input type="radio" name="prio" value="2"></label>
      <label class="cb"><b>3</b> <input type="radio" name="prio" value="3"></label>
    </div>
    <div class="prio-hinweis">0 Keine Maßnahmen erforderlich / 1 Hoch (sofort) / 2 (innerhalb von 1 Woche) / 3 (innerhalb von 1 Monat)</div>
  </td></tr>
  <tr class="bg-gruen-h"><td class="label">Bereits durchgeführte Maßnahme/n:<textarea rows="2"></textarea></td></tr>
</table>
<p class="fusz">*Feinst- und Feinwurzeln &lt; 0,5 cm, Schwachwurzel 0,5 cm – 2,0 cm, Grobwurzel 2,0 – 5,0 cm, Starkwurzel &gt; 5,0 cm</p>

<div class="zusammen">
<h2 class="c-orange">Boden- und Wasserschutz</h2>
<table class="form">
  <tr class="bg-orange"><td colspan="4"><span class="cb"><b>Begehung ohne Beanstandung:</b> <input type="checkbox" checked></span></td></tr>
  <tr class="bg-orange-h">
    <td colspan="2"><span class="cb"><b>Oberbodenverdichtung:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Unterbodenverdichtung:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-orange-h"><td colspan="4"><span class="cb"><b>Getrennte Lagerung von Bodenhorizonten:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-orange-h"><td colspan="4"><span class="cb"><b>Beeinträchtigungen von Oberflächengewässern oder Grundwasserkörpern:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-orange-h"><td colspan="4" class="label">Kommentar:<textarea rows="2"></textarea></td></tr>
</table>
</div>

<h2 class="c-pink">Arten- und Habitatschutz</h2>
<table class="form">
  <tr class="bg-pink"><td colspan="6"><span class="cb"><b>Begehung ohne Beanstandung:</b> <input type="checkbox" checked></span></td></tr>
  <tr class="bg-pink"><td colspan="6" class="label">Vogelschutz</td></tr>
  <tr class="bg-pink-h"><td colspan="6"><span class="cb"><b>Bauzeitenregelung eingehalten:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-pink-h">
    <td colspan="4"><span class="cb"><b>Baufeldfreimachung durch Besatzkontrolle:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Positivbefund:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-pink-h">
    <td colspan="2"><span class="cb"><b>Bodenbrüter:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Höhlenbrüter:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Baumbrüter:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-pink-h"><td colspan="6" class="label">Kommentar:<textarea rows="2"></textarea></td></tr>
  <tr class="bg-pink"><td colspan="6" class="label">Amphibien- und Reptilienschutz</td></tr>
  <tr class="bg-pink-h"><td colspan="6"><span class="cb"><b>Bauzeitenregelung eingehalten:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-pink-h">
    <td colspan="4"><span class="cb"><b>Baufeldfreimachung durch Besatzkontrolle:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Positivbefund:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-pink-h">
    <td colspan="4"><span class="cb"><b>Schutzmaßnahmen gefordert:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Umgesetzt:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-pink-h">
    <td colspan="2"><span class="cb"><b>Todfunde:</b> <input type="checkbox"></span></td>
    <td colspan="4"><span class="zeile"><b>Ursache:</b> <input type="text"></span></td>
  </tr>
  <tr class="bg-pink-h"><td colspan="6" class="label">Kommentar:<textarea rows="2"></textarea></td></tr>
  <tr class="bg-pink"><td colspan="6" class="label">Fledermausschutz</td></tr>
  <tr class="bg-pink-h">
    <td colspan="4"><span class="cb"><b>Kontrolle gefordert:</b> <input type="checkbox"></span></td>
    <td colspan="2"><span class="cb"><b>Positivbefund:</b> <input type="checkbox"></span></td>
  </tr>
  <tr class="bg-pink-h"><td colspan="6" class="label">Umzusetzende Maßnahmen:<textarea rows="2"></textarea></td></tr>
  <tr class="bg-pink-h"><td colspan="6" class="label">Kommentar:<textarea rows="2"></textarea></td></tr>
  <tr class="bg-pink"><td colspan="6" class="label">Habitatschutz</td></tr>
  <tr class="bg-pink-h">
    <td colspan="2"><span class="cb"><b>Schutzgebiete vorhanden:</b> <input type="checkbox"></span></td>
    <td colspan="4"><span class="zeile"><b>Name Schutzgebiet/e:</b> <input type="text"></span></td>
  </tr>
  <tr class="bg-pink-h"><td colspan="6"><span class="cb"><b>Nutzung entgegen der Genehmigung:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-pink-h"><td colspan="6" class="label">Kommentar:<textarea rows="2"></textarea></td></tr>
</table>

<div class="zusammen">
<h2 class="c-gelb">Ökologische Baubegleitung</h2>
<table class="form">
  <tr class="bg-gelb"><td colspan="4" class="label">Anlass:<textarea rows="3"></textarea></td></tr>
  <tr class="bg-gelb-h"><td class="label" colspan="2">Belehrung durchgeführt am / durch:</td><td colspan="2"><input type="text"></td></tr>
  <tr class="bg-gelb"><td colspan="4"><span class="cb"><b>Vorbegehung des Bereiches durchgeführt:</b> <input type="checkbox"></span></td></tr>
  <tr class="bg-gelb-h">
    <td><span class="zeile"><b>Telefon:</b> <input type="tel"></span></td>
    <td><span class="zeile"><b>PLZ:</b> <input type="text" style="width:70px"></span></td>
    <td colspan="2"><span class="zeile"><b>Straße:</b> <input type="text"></span></td>
  </tr>
  <tr class="bg-gelb-h">
    <td class="label" colspan="2">Ökologische*r Baubegleiter*in:<br><input type="text"></td>
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

${fotodokumentation('Je 2 Fotos ergeben eine Abbildung (umschaltbar auf 1 Bild) · Kartenausschnitt wird automatisch vom Übersichtsplan übernommen · alles wird in der Datei gespeichert')}
`,
};
