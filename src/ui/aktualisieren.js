// Ein einziger „🔄 Aktualisieren“-Knopf oben in der Leiste: liest die
// gemeinsame Datenbank neu ein (z. B. nachdem Kolleg*innen etwas geändert
// haben) und zeichnet den offenen Reiter neu. Ordner werden nicht mehr
// durchsucht – Stunden-Einträge entstehen über „⏱ In Stunden überführen“
// am Ende eines Protokolls.

import { grundordnerHolen } from '../core/storage/index.js';
import { dbLesen } from '../core/db.js';
import { dbSetzen } from '../core/zustand.js';
import { statusText } from '../core/util.js';
import { aktivenReiterNeuZeigen } from './tabs.js';

let laeuft = false;

export async function allesAktualisieren() {
  if (laeuft) return;
  laeuft = true;
  const knopf = document.querySelector('[data-aktion="alles-aktualisieren"]');
  if (knopf) { knopf.disabled = true; knopf.textContent = '⏳ Aktualisiere …'; }
  let ergebnis = '';
  try {
    const grund = await grundordnerHolen(true);
    if (!grund) {
      statusText('Kein Grundordner verbunden.');
      return;
    }
    const db = await dbLesen(grund);
    dbSetzen(db);
    aktivenReiterNeuZeigen();
    const n = Object.keys(db.projekte || {}).length;
    ergebnis = '✅ ' + n + (n === 1 ? ' Projekt' : ' Projekte');
    statusText('✅ Datenbank neu eingelesen.');
  } catch {
    // Lesefehler meldet db.js selbst.
  } finally {
    laeuft = false;
    if (knopf) {
      knopf.disabled = false;
      knopf.textContent = ergebnis || '🔄 Aktualisieren';
      if (ergebnis) setTimeout(() => { knopf.textContent = '🔄 Aktualisieren'; }, 2500);
    }
  }
}

export function aktualisierenInit() {
  const knopf = document.querySelector('[data-aktion="alles-aktualisieren"]');
  if (knopf) knopf.addEventListener('click', allesAktualisieren);
}
