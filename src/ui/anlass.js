// Füllt „Anlass“ mit dem Vorschlagstext (domain/anlass.js) und hält ihn
// aktuell, solange man ihn nicht selbst geändert hat: Ersetzt wird nur ein
// leeres Feld oder genau der zuletzt automatisch eingesetzte Text.

import { anlassText } from '../domain/anlass.js';
import { feldWert } from '../core/util.js';
import { dbHolen } from '../core/zustand.js';
import { PROTOKOLL_TABS } from '../config/konstanten.js';

function behoerdeVon(tab) {
  const db = dbHolen();
  const p = tab.dataset.projektId && db && db.projekte ? db.projekte[tab.dataset.projektId] : null;
  return (p && p.infos && p.infos.behoerde) || '';
}

export function anlassAktualisieren(tab) {
  const feld = tab && tab.querySelector('[data-feld="anlass"]');
  if (!feld) return;
  const aktuell = feld.value.trim();
  if (aktuell && aktuell !== (feld.dataset.auto || '')) return; // selbst geändert
  const text = anlassText({ behoerde: behoerdeVon(tab), landkreis: feldWert(tab, 'landkreis'), ort: feldWert(tab, 'ort') });
  feld.dataset.auto = text;
  if (feld.value !== text) {
    feld.value = text;
    feld.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function anlassInit() {
  PROTOKOLL_TABS.forEach((id) => anlassAktualisieren(document.getElementById(id)));
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('[data-feld="landkreis"], [data-feld="ort"]')) anlassAktualisieren(t.closest('.tab'));
  });
}
