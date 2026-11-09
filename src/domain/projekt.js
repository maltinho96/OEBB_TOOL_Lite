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
  const leer = [];        // 0-KB-Dateien (Speichern abgebrochen)

  treffer.forEach(({ pfad, kopf, geaendert }) => {
    if (!kopf || !kopf.trim()) { leer.push(pfad); return; }
    const meta = metaAusText(kopf);
    // Nur echte Protokolle uebernehmen (nicht Start-/Uebersichtsseiten).
    if (meta && meta.typ && meta.typ !== 'start' && meta.typ !== 'uebersicht') {
      meta.geaendert = geaendert;
      neu[pfad] = meta;
      gefunden++;
    }
  });

  return { neu, gefunden, geprueft, leer };
}

// Scan-Ergebnis (vollständiger Ordner-Scan) in ein Projekt einpflegen:
//  - gefundene Dateien: Metadaten ersetzen, Stunden behalten
//  - umbenannte Datei (gleicher Typ + Nummer, alte Datei weg): Stunden
//    wandern zur neuen Datei mit
//  - verschwundene Dateien ohne Stunden: aus der Liste entfernen
//  - verschwundene Dateien MIT Stunden: behalten, als „fehlt“ markiert
//    (damit keine erfassten Stunden verloren gehen)
export function eintraegeZusammenfuehren(projekt, neu) {
  const alt = projekt.eintraege || {};
  const ergebnis = {};
  const hatStunden = (e) => Array.isArray(e.stunden) && e.stunden.length > 0;
  const weg = Object.keys(alt).filter((d) => !neu[d]);

  Object.keys(neu).forEach((datei) => {
    let stunden = alt[datei] && alt[datei].stunden;
    if (!alt[datei]) {
      const umbenannt = weg.find((d) => hatStunden(alt[d]) && alt[d].typ === neu[datei].typ &&
        String(alt[d].nummer || '') === String(neu[datei].nummer || '') && (alt[d].nummer || alt[d].datum === neu[datei].datum));
      if (umbenannt) {
        stunden = alt[umbenannt].stunden;
        weg.splice(weg.indexOf(umbenannt), 1);
        delete alt[umbenannt];
      }
    }
    ergebnis[datei] = { ...neu[datei], stunden: stunden || [] };
    delete ergebnis[datei].fehlt;
  });
  weg.forEach((d) => {
    if (alt[d] && hatStunden(alt[d])) ergebnis[d] = { ...alt[d], fehlt: true };
  });
  projekt.eintraege = ergebnis;
}

// ---------- Aktenzeichen und Verteiler je Projekt ----------
//
// p.aktenzeichen: [{ az, kommentar, haupt }]  – höchstens eins mit haupt
// p.verteiler:    [{ name, email }]
// Ältere Projekte hatten nur ein einzelnes infos.aktenzeichen (Text); das
// gilt dann als Haupt-Aktenzeichen.

export function aktenzeichenListe(p) {
  if (!p) return [];
  if (Array.isArray(p.aktenzeichen)) return p.aktenzeichen;
  const alt = p.infos && p.infos.aktenzeichen;
  return alt ? [{ az: alt, kommentar: '', haupt: true }] : [];
}

export function hauptAktenzeichen(p) {
  const liste = aktenzeichenListe(p);
  const h = liste.find((a) => a.haupt);
  return h ? h.az : '';
}

export function verteilerListe(p) {
  return p && Array.isArray(p.verteiler) ? p.verteiler : [];
}

// Bewusst streng: keine Zeichen wie ? & = , ; – die könnten in einem
// mailto:-Link zusätzliche Empfänger oder Felder einschleusen.
export const EMAIL_MUSTER = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
