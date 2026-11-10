// Ein einziger „🔄 Aktualisieren“-Knopf oben in der Leiste – ersetzt die
// früheren Scannen-/Aktualisieren-Knöpfe in Projekten, Stunden, Karte und
// Support. Er:
//   1. verbindet den Grundordner (falls nötig),
//   2. liest ALLE verknüpften Projektordner neu ein (Protokolle nach
//      Dateinamen, siehe domain/projekt.js),
//   3. schreibt das Ergebnis in einem Rutsch in die Datenbank,
//   4. zeichnet den gerade offenen Reiter mit den frischen Daten neu.

import { grundordnerHolen, projektOrdnerHolen, gespeicherterProjektordner } from '../core/storage/index.js';
import { dbLesen, dbAendern } from '../core/db.js';
import { dbSetzen } from '../core/zustand.js';
import { statusText } from '../core/util.js';
import { projektScannen, eintraegeZusammenfuehren } from '../domain/projekt.js';
import { aktivenReiterNeuZeigen } from './tabs.js';

let laeuft = false;
let ergebnisText = '';   // kurze Rückmeldung direkt am Knopf

export async function allesAktualisieren() {
  if (laeuft) return;
  laeuft = true;
  const knopf = document.querySelector('[data-aktion="alles-aktualisieren"]');
  if (knopf) { knopf.disabled = true; knopf.textContent = '⏳ Aktualisiere …'; }
  try {
    const grund = await grundordnerHolen(true);
    if (!grund) {
      statusText('Kein Grundordner verbunden.');
      return;
    }
    const db = await dbLesen(grund);
    dbSetzen(db);

    // Alle Projekte mit verknüpftem Ordner scannen.
    const ergebnisse = {};
    let protokolle = 0;
    const ohneZugriff = [];
    for (const [id, p] of Object.entries(db.projekte || {})) {
      if (!(await gespeicherterProjektordner(id).catch(() => null))) continue;
      let ordner = null;
      try { ordner = await projektOrdnerHolen(id, true); } catch { ordner = null; }
      if (!ordner) { ohneZugriff.push(p.name || id); continue; }
      try {
        const { neu, gefunden } = await projektScannen(ordner);
        ergebnisse[id] = neu;
        protokolle += gefunden;
      } catch {
        ohneZugriff.push(p.name || id);
      }
    }

    if (Object.keys(ergebnisse).length) {
      const neuDb = await dbAendern(grund, (d) => {
        Object.entries(ergebnisse).forEach(([id, neu]) => {
          if (d.projekte[id]) eintraegeZusammenfuehren(d.projekte[id], neu);
        });
      });
      dbSetzen(neuDb);
    }

    aktivenReiterNeuZeigen();
    const text = Object.keys(ergebnisse).length + ' Projektordner gelesen, ' + protokolle +
      (protokolle === 1 ? ' Protokoll' : ' Protokolle') + '.' +
      (ohneZugriff.length ? ' Nicht erreichbar: ' + ohneZugriff.join(', ') + '.' : '');
    statusText('✅ Aktualisiert: ' + text);
    ergebnisText = (ohneZugriff.length ? '⚠️ ' : '✅ ') + protokolle + (protokolle === 1 ? ' Protokoll' : ' Protokolle');
    if (knopf) knopf.title = 'Zuletzt: ' + text;
  } catch {
    // Lesefehler meldet db.js selbst.
  } finally {
    laeuft = false;
    if (knopf) {
      knopf.disabled = false;
      knopf.textContent = ergebnisText || '🔄 Aktualisieren';
      if (ergebnisText) setTimeout(() => { knopf.textContent = '🔄 Aktualisieren'; }, 3000);
      ergebnisText = '';
    }
  }
}

export function aktualisierenInit() {
  const knopf = document.querySelector('[data-aktion="alles-aktualisieren"]');
  if (knopf) knopf.addEventListener('click', allesAktualisieren);
}
