// „⏱ In Stunden überführen“ am Ende jedes Protokolls.
//
// Legt im gewählten Projekt einen Stunden-Eintrag für dieses Protokoll an:
//   Schlüssel = Dateiname des Protokolls (wie beim Speichern),
//   typ / nummer / datum(2) / ort aus dem Protokoll,
//   Zeilen je nach Abrechnung des Projekts (Stunden- oder Tagessatz).
// Gibt es den Eintrag schon, bleiben die erfassten Stunden unangetastet.
// Danach öffnet sich der Reiter „Stunden“ mit diesem Projekt.

import { feldWert, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen } from '../core/zustand.js';
import { stVorschlag, abrechnungVon } from '../domain/stunden.js';
import { dateinameBauen } from '../export/html-export.js';
import { tabZeigen } from './tabs.js';

function eintragAusProtokoll(tab) {
  return {
    typ: tab.id.replace('tab-', ''),
    nummer: feldWert(tab, 'nummer'),
    datum: feldWert(tab, 'datum'),
    datum2: feldWert(tab, 'datum2'),
    ort: feldWert(tab, 'ort'),
  };
}

async function inStundenUeberfuehren(tab) {
  const pid = tab.dataset.projektId;
  if (!pid) {
    alert('Bitte oben im Protokoll zuerst das Projekt wählen – der Eintrag kommt in dessen Stundentabelle.');
    return;
  }
  const e = eintragAusProtokoll(tab);
  if (!e.datum) {
    alert('Bitte zuerst das Datum der Begehung eintragen.');
    return;
  }
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner verbinden.'); return; }

  const name = dateinameBauen(tab);
  let neu = false;
  const db = await dbAendern(ordner, (db) => {
    const p = db.projekte[pid];
    if (!p) return;
    p.eintraege = p.eintraege || {};
    const alt = p.eintraege[name];
    if (alt && alt.stunden && alt.stunden.length) {
      // Stunden schon erfasst: nur Angaben zum Protokoll auffrischen.
      Object.assign(alt, e);
    } else {
      p.eintraege[name] = { ...e, stunden: stVorschlag(e, abrechnungVon(p)) };
      neu = true;
    }
  });
  dbSetzen(db);
  if (!db.projekte[pid]) { alert('Das gewählte Projekt gibt es nicht mehr in der Datenbank.'); return; }
  statusText(neu ? '⏱ In Stunden übernommen: ' + name : 'Eintrag war schon da – Stunden unverändert: ' + name);
  // Zum Stunden-Reiter mit diesem Projekt.
  const sel = document.getElementById('stProjekt');
  if (sel) sel.dataset.vorwahl = pid;
  tabZeigen('tab-stunden');
}

export function stundenuebernahmeInit() {
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-aktion="in-stunden"]');
    if (b) inStundenUeberfuehren(b.closest('.tab'));
  });
}
