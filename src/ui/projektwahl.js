// Projekt-Auswahl oben in jedem Protokoll (nur am Bildschirm, nicht im
// Druck). Wählt man ein Projekt aus der Datenbank:
//   - Projekt-Name und Projektnummer werden ins Protokoll übernommen,
//   - Auftraggeber und Ort nur, wenn das Feld noch leer ist,
//   - die Flächen (Shapes) des Projekts erscheinen im Übersichtsplan und
//     in den Karten über den Foto-Blöcken (ui/fotokarte.js).
//
// Die Liste wird bei jedem Wechsel in einen Protokoll-Reiter aus der
// aktuellen Datenbank neu befüllt (Projekte können ja dazukommen).

import { dbHolen } from '../core/zustand.js';
import { esc } from '../core/util.js';
import { karteAktualisieren } from './fotokarte.js';

import { PROTOKOLL_TABS } from '../config/konstanten.js';

function leiste(tab) {
  let l = tab.querySelector('.projektwahl');
  if (!l) {
    l = document.createElement('div');
    l.className = 'projektwahl kein-druck';
    l.innerHTML =
      '<label>📁 Projekt: <select data-projektwahl></select></label>' +
      '<span class="projektwahl-hinweis"></span>';
    tab.prepend(l);
  }
  return l;
}

function optionenFuellen(tab) {
  const l = leiste(tab);
  const sel = l.querySelector('select');
  const hinweis = l.querySelector('.projektwahl-hinweis');
  const db = dbHolen();
  const ids = db && db.projekte ? Object.keys(db.projekte) : [];

  if (!ids.length) {
    sel.innerHTML = '<option value="">– keine Projekte geladen –</option>';
    sel.disabled = true;
    hinweis.textContent = db
      ? 'Noch keine Projekte angelegt (Übersicht → Projekt anlegen).'
      : 'Erst in der Übersicht den Grundordner verbinden.';
    return;
  }

  sel.disabled = false;
  hinweis.textContent = '';
  ids.sort((a, b) => (db.projekte[a].name || '').localeCompare(db.projekte[b].name || ''));
  sel.innerHTML =
    '<option value="">– Projekt wählen –</option>' +
    ids.map((id) => {
      const p = db.projekte[id];
      const nr = p.projektnummer ? ' (' + esc(p.projektnummer) + ')' : '';
      return '<option value="' + esc(id) + '">' + esc(p.name || id) + nr + '</option>';
    }).join('');
  sel.value = tab.dataset.projektId || '';
}

// Feld setzen und ein input-Event auslösen (damit z. B. die Fußzeile mit
// dem Auftraggeber sofort mitzieht).
function feldSetzen(tab, selektor, wert, nurWennLeer) {
  const el = tab.querySelector(selektor);
  if (!el || !wert) return;
  if (nurWennLeer && el.value.trim()) return;
  el.value = wert;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function projektUebernehmen(tab, pid) {
  tab.dataset.projektId = pid || '';
  const db = dbHolen();
  const p = pid && db && db.projekte ? db.projekte[pid] : null;
  if (p) {
    feldSetzen(tab, '[data-feld="projekt"]', p.name);
    feldSetzen(tab, '[data-feld="projektnummer"]', p.projektnummer);
    feldSetzen(tab, '[data-feld="auftraggeber-fuss"]', p.infos && p.infos.auftraggeber, true);
    feldSetzen(tab, '[data-feld="ort"]', p.ort, true);
  }
  karteAktualisieren(tab);
}

// Als tabWechselHook registrieren: Liste auffrischen + Karten neu zeichnen
// (Leaflet braucht nach dem Sichtbarwerden eine Größen-Neuberechnung).
export function projektwahlBeiAnzeige(id) {
  if (!PROTOKOLL_TABS.includes(id)) return;
  const tab = document.getElementById(id);
  if (!tab) return;
  optionenFuellen(tab);
  karteAktualisieren(tab);
}

export function projektwahlInit() {
  PROTOKOLL_TABS.forEach((id) => {
    const tab = document.getElementById(id);
    if (tab) leiste(tab);
  });
  document.addEventListener('change', (e) => {
    if (e.target && e.target.matches && e.target.matches('[data-projektwahl]')) {
      projektUebernehmen(e.target.closest('.tab'), e.target.value);
    }
  });
}
