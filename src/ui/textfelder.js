// Mehrzeilige Textfelder (<textarea>) in den Protokollen wachsen mit ihrem
// Inhalt mit: leer sind sie klein, mit viel Text entsprechend hoch.
// Wichtig auch fürs Drucken – ein <textarea> druckt nur seine sichtbare
// Höhe, zu viel Text würde sonst abgeschnitten.

import { aktiverTab } from '../core/util.js';

export function hoeheAnpassen(ta) {
  if (!ta.offsetParent) return; // unsichtbar (anderer Reiter) – später
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 2 + 'px';
}

function alleAnpassen(root) {
  if (root) root.querySelectorAll('textarea').forEach(hoeheAnpassen);
}

// Als tabWechselHook: erst sichtbare Felder können ihre Höhe berechnen.
export function textfelderBeiAnzeige(id) {
  alleAnpassen(document.getElementById(id));
}

export function textfelderInit(root) {
  root.addEventListener('input', (e) => {
    if (e.target && e.target.tagName === 'TEXTAREA') hoeheAnpassen(e.target);
  });
  // Direkt vor dem Drucken noch einmal (z. B. nach "Protokoll laden").
  window.addEventListener('beforeprint', () => alleAnpassen(aktiverTab()));
}
