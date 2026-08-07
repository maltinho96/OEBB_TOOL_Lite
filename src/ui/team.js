// Team-Verwaltung: die Liste der Mitarbeitenden, aus der die Haupt-/
// Zweitverantwortlichen-Auswahl im Projektformular gespeist wird.
// Eigenständiges Modul, keine Abhängigkeit zu Projektformular/Dashboard.

import { esc, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { aktuellerNutzer, nutzerSetzen } from '../core/nutzer.js';

// Zeigt die Team-Liste (mit Entfernen-Knöpfen) und befüllt die beiden
// Verantwortlichen-Selects im Projektformular. vorbelegtHaupt/vorbelegtZweit:
// aktuelle Werte beim Bearbeiten eines Projekts, damit auch ein inzwischen
// aus dem Team entferntes Mitglied weiter sichtbar bleibt (keine verlorenen
// Daten, keine kaputten Referenzen).
export function teamAnzeigen(vorbelegtHaupt, vorbelegtZweit) {
  const db = dbHolen();
  const namen = (db && db.mitarbeitende) || [];

  const listeZiel = document.getElementById('teamListe');
  if (listeZiel) {
    listeZiel.innerHTML = namen.length
      ? namen.map((n, idx) => `<span style="display:inline-flex; align-items:center; gap:4px; margin:2px 6px 2px 0; padding:2px 6px; background:#eef; border-radius:4px;">
          👤 ${esc(n)} <button data-aktion="team-entfernen" data-idx="${idx}" style="border:none;background:none;color:#a00;cursor:pointer;font-size:12px;">✕</button>
        </span>`).join('')
      : '<span style="color:#777">Noch niemand im Team – oben Namen hinzufügen.</span>';
  }

  [
    { id: 'npHauptverantwortlich', leer: '– wählen –', wert: vorbelegtHaupt },
    { id: 'npZweitverantwortlich', leer: '– keine/r –', wert: vorbelegtZweit },
  ].forEach(({ id, leer, wert }) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">' + leer + '</option>' +
      namen.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if (wert) {
      if (!namen.includes(wert)) {
        sel.insertAdjacentHTML('beforeend', '<option value="' + esc(wert) + '">' + esc(wert) + ' (nicht mehr im Team)</option>');
      }
      sel.value = wert;
    }
  });

  // "Ich bin"-Auswahl: aus derselben Team-Liste, aktueller Nutzer aus
  // localStorage vorausgewählt (bleibt auch sichtbar, falls er inzwischen
  // aus dem Team entfernt wurde).
  const nutzerSel = document.getElementById('nutzerAuswahl');
  if (nutzerSel) {
    const aktiv = aktuellerNutzer();
    nutzerSel.innerHTML = '<option value="">– niemand ausgewählt –</option>' +
      namen.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if (aktiv && !namen.includes(aktiv)) {
      nutzerSel.insertAdjacentHTML('beforeend', '<option value="' + esc(aktiv) + '">' + esc(aktiv) + ' (nicht mehr im Team)</option>');
    }
    nutzerSel.value = aktiv;
  }
}

export async function mitarbeiterHinzufuegen() {
  const feld = document.getElementById('teamNeuerName');
  const name = feld.value.trim();
  if (!name) return;
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbAendern(ordner, (db) => {
    db.mitarbeitende = db.mitarbeitende || [];
    if (!db.mitarbeitende.includes(name)) db.mitarbeitende.push(name);
  });
  dbSetzen(db);
  feld.value = '';
  teamAnzeigen();
}

export async function mitarbeiterEntfernen(idx) {
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    if (db.mitarbeitende) db.mitarbeitende.splice(idx, 1);
  });
  dbSetzen(db);
  teamAnzeigen();
}

// Verdrahtet die Team-UI (Hinzufügen-Knopf, Entfernen-Knöpfe, Enter-Taste
// im Namensfeld), unabhängig vom Rest des Übersicht-Reiters.
export function teamInit(section) {
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    if (btn.dataset.aktion === 'team-hinzufuegen') mitarbeiterHinzufuegen();
    if (btn.dataset.aktion === 'team-entfernen') mitarbeiterEntfernen(parseInt(btn.dataset.idx, 10));
  });
  section.addEventListener('keydown', (e) => {
    if (e.target.id === 'teamNeuerName' && e.key === 'Enter') {
      e.preventDefault();
      mitarbeiterHinzufuegen();
    }
  });
  section.addEventListener('change', (e) => {
    if (e.target.id === 'nutzerAuswahl') {
      nutzerSetzen(e.target.value);
      statusText(e.target.value ? 'Angemeldet als: ' + e.target.value : 'Keine Person ausgewählt.');
    }
  });
}