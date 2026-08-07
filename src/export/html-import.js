// "Protokoll laden": liest eine zuvor gespeicherte Protokoll-HTML ein und
// füllt die Formularfelder des passenden Reiters mit deren Werten – als
// Ausgangspunkt für ein Folgeprotokoll (z. B. 4. laden, Nummer und Datum
// anpassen, als 5. speichern).
//
// Bewusste Entscheidungen:
//  - Übernommen werden Textfelder, Checkboxen, Radios, Selects und die
//    contenteditable-Textblöcke (rechtliche Grundlagen, Visualisierungs-
//    texte, Bestätigung).
//  - NICHT übernommen werden Fotos, Übersichtsplan und Unterschriften –
//    die sollen im Folgeprotokoll neu gesetzt werden, nicht veraltet
//    mitwandern.
//  - Der Ziel-Reiter wird aus dem eingebetteten protokollMeta-Block
//    erkannt (typ), nicht aus dem gerade offenen Reiter.

import { metaAusText } from '../core/meta.js';
import { tabZeigen } from '../ui/tabs.js';

// typ (aus protokollMeta) -> Reiter-Id
const TYP_ZU_TAB = {
  protokoll: 'tab-protokoll',
  vorbegehung: 'tab-vorbegehung',
  belehrung: 'tab-belehrung',
};

// Überträgt Feldwerte aus dem geladenen Quell-Reiter (quelle) in den
// aktiven Formular-Reiter (ziel). Beide haben dieselbe Struktur, deshalb
// gehen wir die Felder positionsweise in gleicher Reihenfolge durch –
// robust genug, weil die Templates fest sind und sich Quelle/Ziel exakt
// entsprechen.
function felderUebernehmen(quelle, ziel) {
  // Einzeilige Eingabefelder: der gespeicherte Wert steht im value-Attribut
  // (so schreibt es zustandSichern beim Export).
  ['input[type=text]', 'input[type=date]', 'input[type=tel]', 'input[type=email]'].forEach((selektor) => {
    const q = quelle.querySelectorAll(selektor);
    const z = ziel.querySelectorAll(selektor);
    q.forEach((el, i) => {
      if (z[i]) z[i].value = el.getAttribute('value') || '';
    });
  });

  // Textareas: der Wert steht als Textinhalt (so schreibt es zustandSichern).
  const qt = quelle.querySelectorAll('textarea');
  const zt = ziel.querySelectorAll('textarea');
  qt.forEach((el, i) => { if (zt[i]) zt[i].value = el.textContent || ''; });

  // Checkboxen / Radios
  const qc = quelle.querySelectorAll('input[type=checkbox],input[type=radio]');
  const zc = ziel.querySelectorAll('input[type=checkbox],input[type=radio]');
  qc.forEach((el, i) => { if (zc[i]) zc[i].checked = el.hasAttribute('checked') || el.checked; });

  // Selects
  const qs = quelle.querySelectorAll('select');
  const zs = ziel.querySelectorAll('select');
  qs.forEach((el, i) => { if (zs[i]) zs[i].value = el.value; });

  // contenteditable-Textblöcke (Vis-Texte, rechtliche Grundlagen,
  // Bestätigung) – aber KEINE Bildfelder (plan-bild/vis-bild/unterschrift).
  const qe = quelle.querySelectorAll('[contenteditable]');
  const ze = ziel.querySelectorAll('[contenteditable]');
  qe.forEach((el, i) => { if (ze[i]) ze[i].innerHTML = el.innerHTML; });
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

  // Nummer im Titel ist meist die des geladenen Protokolls – als Hinweis
  // kurz melden, dass sie fürs Folgeprotokoll angepasst werden sollte.
  const nummerFeld = ziel.querySelector('[data-feld=nummer]');
  if (nummerFeld) {
    nummerFeld.focus();
    nummerFeld.select && nummerFeld.select();
  }
  alert('Protokoll geladen. Fotos und Unterschrift wurden bewusst NICHT übernommen – bitte Nummer/Datum anpassen und neu speichern.');
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