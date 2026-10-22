// Textbaustein-Knöpfe im Belehrungsprotokoll "Karel" (Texte siehe
// config/textbausteine.js). Klick = Baustein als Punkt ans Auflagen-Feld
// anhängen; erneuter Klick = wieder herausnehmen. Bereits enthaltene
// Bausteine sind am Knopf mit ✓ markiert.
//
// Die Auflagen-Felder wachsen mit ihrem Inhalt (Höhe = Inhalt), damit beim
// Drucken nichts abgeschnitten wird – ein <textarea> druckt nur seine
// sichtbare Höhe.

import { TEXTBAUSTEINE } from '../config/textbausteine.js';

function bausteinText(thema, idx) {
  const b = (TEXTBAUSTEINE[thema] || [])[idx];
  if (!b) return null;
  return /^[☒☐]/.test(b.text) ? b.text : '• ' + b.text;
}

function hoeheAnpassen(ta) {
  if (!ta.offsetParent) return; // unsichtbar (anderer Reiter) – später
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 2 + 'px';
}

function knoepfeAktualisieren(ta) {
  const td = ta.closest('td');
  if (!td) return;
  td.querySelectorAll('[data-aktion="baustein"]').forEach((k) => {
    const text = bausteinText(k.dataset.thema, k.dataset.idx);
    k.classList.toggle('benutzt', !!text && ta.value.includes(text));
  });
}

function umschalten(knopf) {
  const ta = knopf.closest('td').querySelector('textarea[data-thema]');
  const text = bausteinText(knopf.dataset.thema, knopf.dataset.idx);
  if (!ta || !text) return;
  if (ta.value.includes(text)) {
    // Samt Zeilenumbruch entfernen, damit keine Leerzeile zurückbleibt.
    let v = ta.value;
    if (v.includes('\n' + text)) v = v.replace('\n' + text, '');
    else if (v.includes(text + '\n')) v = v.replace(text + '\n', '');
    else v = v.replace(text, '');
    ta.value = v.replace(/^\n+|\n+$/g, '');
  } else {
    const bisher = ta.value.replace(/\s+$/, '');
    ta.value = (bisher ? bisher + '\n' : '') + text;
  }
  hoeheAnpassen(ta);
  knoepfeAktualisieren(ta);
}

function alleAuffrischen(root) {
  (root || document).querySelectorAll('textarea[data-thema]').forEach((ta) => {
    hoeheAnpassen(ta);
    knoepfeAktualisieren(ta);
  });
}

// Als tabWechselHook: erst sichtbare Felder können ihre Höhe berechnen.
export function bausteineBeiAnzeige(id) {
  const tab = document.getElementById(id);
  if (tab) alleAuffrischen(tab);
}

export function bausteineInit(root) {
  root = root || document;
  root.addEventListener('click', (e) => {
    const knopf = e.target.closest('[data-aktion="baustein"]');
    if (knopf) umschalten(knopf);
  });
  root.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('textarea[data-thema]')) {
      hoeheAnpassen(e.target);
      knoepfeAktualisieren(e.target);
    }
  });
  alleAuffrischen(root);
}
