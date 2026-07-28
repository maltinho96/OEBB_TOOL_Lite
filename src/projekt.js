// Projektlogik: DB-Manipulation und das Einlesen (Scannen) eines
// Projektordners. KEIN DOM – die Formular-/Bestaetigungs-/Render-Teile
// liegen spaeter in ui/projektformular.js bzw. ui/dashboard.js.

import { scanneHtmlDateien } from '../core/storage/index.js';
import { metaAusText } from '../core/meta.js';

// ---------- DB-Manipulation (rein, ohne IO) ----------

// Projekt anlegen oder (bei warBearbeitung) aktualisieren.
// Bei Aktualisierung bleiben vorhandene eintraege erhalten.
export function projektSchreiben(db, id, daten, warBearbeitung) {
  if (warBearbeitung && db.projekte[id]) {
    Object.assign(db.projekte[id], daten); // eintraege unberuehrt
  } else {
    db.projekte[id] = { ...daten, eintraege: {} };
  }
  return db.projekte[id];
}

// Projekt aus der DB entfernen (die Protokoll-Dateien bleiben unberuehrt).
export function projektLoeschen(db, id) {
  const p = db.projekte[id];
  delete db.projekte[id];
  return p;
}

// Neue Projekt-Id erzeugen.
export function neueProjektId() {
  return 'p' + Date.now();
}

// ---------- Scannen ----------

// Einen Projektordner nach Protokoll-HTMLs durchsuchen und die Metadaten
// einlesen. Reine Auswertung: gibt gefundene Eintraege + Zaehler zurueck,
// schreibt aber noch nichts in die DB.
export async function projektScannen(ordner) {
  const { treffer, geprueft } = await scanneHtmlDateien(ordner);
  const neu = {};
  let gefunden = 0;

  treffer.forEach(({ pfad, kopf, geaendert }) => {
    const meta = metaAusText(kopf);
    // Nur echte Protokolle uebernehmen (nicht Start-/Uebersichtsseiten).
    if (meta && meta.typ && meta.typ !== 'start' && meta.typ !== 'uebersicht') {
      meta.geaendert = geaendert;
      neu[pfad] = meta;
      gefunden++;
    }
  });

  return { neu, gefunden, geprueft };
}

// Scan-Ergebnis in ein Projekt einpflegen: vorhandene Stunden- und
// Abrechnungs-Angaben je Datei bleiben erhalten, Metadaten werden ersetzt.
export function eintraegeZusammenfuehren(projekt, neu) {
  Object.keys(neu).forEach((datei) => {
    const alt = projekt.eintraege[datei] || {};
    neu[datei].stunden = alt.stunden || [];
    neu[datei].abgerechnet = alt.abgerechnet || false;
    neu[datei].abgerechnetAm = alt.abgerechnetAm || '';
    projekt.eintraege[datei] = neu[datei];
  });
}
