// "Protokoll laden": liest eine zuvor gespeicherte Protokoll-HTML ein und
// füllt die Formularfelder des passenden Reiters mit deren Werten – als
// Ausgangspunkt für ein Folgeprotokoll (z. B. 4. laden, Nummer und Datum
// anpassen, als 5. speichern).
//
// Bewusste Entscheidungen:
//  - Übernommen werden Textfelder, Checkboxen, Radios, Selects und die
//    contenteditable-Textblöcke (rechtliche Grundlagen, Visualisierungs-
//    texte, Bestätigung).
//  - Fotos und Unterschriften nur auf Nachfrage ("Korrigieren"). Beim
//    Folgeprotokoll bleiben sie bewusst weg – dort kommen neue hinein.
//  - Der Ziel-Reiter wird aus dem eingebetteten protokollMeta-Block
//    erkannt (typ), nicht aus dem gerade offenen Reiter.

import { metaAusText } from '../core/meta.js';
import { tabZeigen } from '../ui/tabs.js';
import { einklappenAktualisieren } from '../ui/einklappen.js';
import { fotosUebernehmen, unterschriftenUebernehmen, textMitUmbruechen } from '../ui/fotos.js';
import { karteAktualisieren } from '../ui/fotokarte.js';

// typ (aus protokollMeta) -> Reiter-Id
const TYP_ZU_TAB = {
  protokoll: 'tab-protokoll',
  vorbegehung: 'tab-vorbegehung',
  belehrung: 'tab-belehrung',
  'belehrung-karel': 'tab-belehrung-karel',
};

// Überträgt Feldwerte aus dem geladenen Quell-Reiter (quelle) in den
// aktiven Formular-Reiter (ziel). Beide haben dieselbe Struktur, deshalb
// gehen wir die Felder positionsweise in gleicher Reihenfolge durch –
// robust genug, weil die Templates fest sind und sich Quelle/Ziel exakt
// entsprechen.
function felderUebernehmen(quelle, ziel) {
  // Ältere Begehungsprotokolle hatten im Baumschutz noch die Wurzel-Tabelle
  // (9 Textfelder). Sie gibt es nicht mehr – vorher entfernen, sonst
  // verrutschen alle folgenden Textfelder.
  quelle.querySelectorAll('.wurzeltab').forEach((t) => t.remove());
  // Ebenso die frühere Zeile "Feinst- und Feinwurzelflächenverlust m²".
  quelle.querySelectorAll('tr').forEach((tr) => {
    if (/Feinwurzelflächenverlust/.test(tr.textContent)) tr.remove();
  });

  // Einzeilige Eingabefelder: der gespeicherte Wert steht im value-Attribut
  // (so schreibt es zustandSichern beim Export).
  ['input[type=text]', 'input[type=date]', 'input[type=tel]', 'input[type=email]'].forEach((selektor) => {
    const q = quelle.querySelectorAll(selektor);
    const z = ziel.querySelectorAll(selektor);
    q.forEach((el, i) => {
      if (z[i]) z[i].value = el.getAttribute('value') || '';
    });
  });

  // Auflagen-Felder im Belehrungsprotokoll "Karel" über ihre Themen-Kennung
  // (data-thema) zuordnen, damit die Reihenfolge der Blöcke egal ist. Ältere
  // Dateien ohne Kennung hatten die Reihenfolge ALT_THEMEN.
  const ALT_THEMEN = ['arten', 'gehoelz', 'boden', 'wasser', 'sonstiges'];
  quelle.querySelectorAll('textarea.kb-auflagen').forEach((el, i) => {
    const thema = el.getAttribute('data-thema') || ALT_THEMEN[i];
    const z = thema && ziel.querySelector('textarea[data-thema="' + thema + '"]');
    if (z) z.value = el.value || el.textContent || '';
  });

  // Übrige Textareas positionsweise. Der Wert steht als Textinhalt (so
  // schreibt es zustandSichern).
  const qt = quelle.querySelectorAll('textarea:not(.kb-auflagen)');
  const zt = ziel.querySelectorAll('textarea:not(.kb-auflagen)');
  qt.forEach((el, i) => {
    if (zt[i]) {
      // Beim Export steht der Text als Elementinhalt zwischen den Tags
      // (textContent); manche Parser legen ihn zusätzlich in value ab.
      // Beides berücksichtigen, damit der Import zuverlässig greift.
      const wert = el.value || el.textContent || '';
      zt[i].value = wert;
    }
  });

  // Checkboxen / Radios. Die Unterpunkt-Haken (data-unterklapp) werden
  // getrennt zugeordnet, damit ältere Protokolle ohne diese Haken nicht
  // alle folgenden Häkchen um eine Position verschieben.
  const NORMAL = 'input[type=checkbox]:not([data-unterklapp]),input[type=radio]';
  const UNTER = 'input[data-unterklapp]';
  [NORMAL, UNTER].forEach((selektor) => {
    const qc = quelle.querySelectorAll(selektor);
    const zc = ziel.querySelectorAll(selektor);
    qc.forEach((el, i) => { if (zc[i]) zc[i].checked = el.hasAttribute('checked') || el.checked; });
  });

  // Selects
  const qs = quelle.querySelectorAll('select');
  const zs = ziel.querySelectorAll('select');
  qs.forEach((el, i) => { if (zs[i]) zs[i].value = el.value; });

  // contenteditable-Textblöcke (Vis-Texte, rechtliche Grundlagen,
  // Bestätigung) – aber KEINE Bildfelder (vis-bild/unterschrift).
  const qe = quelle.querySelectorAll('[contenteditable]');
  const ze = ziel.querySelectorAll('[contenteditable]');
  // Nur Text übernehmen, kein HTML: eine geladene (fremde) Datei könnte sonst
  // Skripte/Markup einschleusen. innerText erhält dabei die Zeilenumbrüche.
  qe.forEach((el, i) => { if (ze[i]) ze[i].innerText = textMitUmbruechen(el); });
}

async function protokollLaden(file) {
  const text = await file.text();
  const meta = metaAusText(text);
  const zielTabId = (meta && TYP_ZU_TAB[meta.typ]) || null;
  if (!zielTabId) {
    alert('Diese Datei sieht nicht wie ein bekanntes Protokoll aus (kein gültiger Protokoll-Typ gefunden).');
    return;
  }

  // Geladene HTML in einem unsichtbaren Container parsen, um die Quell-
  // Section herauszugreifen.
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const quelle = doc.getElementById(zielTabId);
  if (!quelle) {
    alert('Die Formularfelder konnten in der Datei nicht gefunden werden.');
    return;
  }

  tabZeigen(zielTabId);
  const ziel = document.getElementById(zielTabId);
  felderUebernehmen(quelle, ziel);
  // Aufgeklappt/eingeklappt passend zu den geladenen Häkchen darstellen und
  // abhängige Anzeigen (z. B. Fußzeile mit Auftraggeber) auffrischen.
  einklappenAktualisieren(ziel);
  ziel.querySelectorAll('[data-feld], textarea').forEach((el) => el.dispatchEvent(new Event('input', { bubbles: true })));

  // Gewähltes Projekt (für die Flächen auf den Karten) mit übernehmen.
  ziel.dataset.projektId = quelle.getAttribute('data-projekt-id') || '';

  // Korrigieren oder Folgeprotokoll? Nur fragen, wenn die Datei Bilder hat.
  const hatBilder = quelle.querySelector('.fotoContainer .abb-bilder img, .unterschrift-feld img');
  const korrigieren = !!hatBilder && confirm(
    'Wie soll das Protokoll geladen werden?\n\n' +
    'OK = Protokoll KORRIGIEREN: Fotos und Unterschrift werden mit übernommen.\n' +
    'Abbrechen = FOLGEPROTOKOLL: nur die Texte, ohne Fotos und Unterschrift.'
  );

  if (korrigieren) {
    const n = fotosUebernehmen(quelle, ziel);
    unterschriftenUebernehmen(quelle, ziel);
    alert('Protokoll zum Korrigieren geladen (' + n + ' Fotos). Nach den Änderungen wieder speichern.');
    return;
  }

  karteAktualisieren(ziel);
  // Nummer im Titel ist meist die des geladenen Protokolls – fürs
  // Folgeprotokoll markieren, damit sie gleich überschrieben werden kann.
  const nummerFeld = ziel.querySelector('[data-feld=nummer]');
  if (nummerFeld) {
    nummerFeld.focus();
    nummerFeld.select && nummerFeld.select();
  }
  alert('Als Folgeprotokoll geladen – ohne Fotos und Unterschrift. Bitte Nummer/Datum anpassen und neu speichern.');
}

export function htmlImportInit() {
  // Verstecktes Datei-Eingabefeld einmalig anlegen.
  let input = document.getElementById('protokollLadenInput');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'protokollLadenInput';
    input.accept = '.html,.htm';
    input.hidden = true;
    document.body.appendChild(input);
  }
  input.addEventListener('change', (e) => {
    if (e.target.files.length) protokollLaden(e.target.files[0]);
    e.target.value = '';
  });

  document.querySelectorAll('[data-aktion="protokoll-laden"]').forEach((btn) => {
    btn.addEventListener('click', () => input.click());
  });
}
