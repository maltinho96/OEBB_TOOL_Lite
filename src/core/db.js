// Lesen, Schreiben und Migrieren der gemeinsamen oebb_datenbank.json.
// Die eigentliche Datei-IO liegt im Speicher-Backend; hier nur die
// JSON-Struktur, Migration und die Aenderungs-Transaktion. KEIN DOM.

import { leseDbText, schreibeDbText } from './storage/index.js';

// Rohtext -> geparste, migrierte DB-Struktur (immer mit .projekte).
export function dbAusText(text) {
  let db = null;
  try { db = JSON.parse(text); } catch (e) { db = null; }
  if (!db) db = {};
  if (!db.projekte) db.projekte = {};

  // Migration: alte flache Struktur (db.eintraege) -> Projekte.
  if (db.eintraege) {
    Object.keys(db.eintraege).forEach((datei) => {
      const e = db.eintraege[datei];
      const key = e.projektnummer || e.projekt || 'importiert';
      const id = 'mig_' + key.replace(/[^\w]+/g, '_');
      if (!db.projekte[id]) {
        db.projekte[id] = {
          name: e.projekt || key,
          projektnummer: e.projektnummer || '',
          ort: e.ort || '',
          eintraege: {},
        };
      }
      db.projekte[id].eintraege[datei] = e;
    });
    delete db.eintraege;
  }

  db.version = 2;
  db.einstellungen = db.einstellungen || {};
  return db;
}

// DB aus dem Grundordner lesen (oder leere, migrierte Struktur).
export async function dbLesen(ordner) {
  const text = await leseDbText(ordner);
  return dbAusText(text || '');
}

// DB in den Grundordner schreiben (eingerueckt, wie im Original).
export async function dbSchreiben(ordner, db) {
  await schreibeDbText(ordner, JSON.stringify(db, null, 1));
}

// Aenderungs-Transaktion: lesen -> aenderung(db) anwenden -> schreiben.
// Gibt die geaenderte DB zurueck. Das Neu-Zeichnen der Oberflaeche ist
// bewusst NICHT hier, sondern Sache der aufrufenden UI-Schicht.
export async function dbAendern(ordner, aenderung) {
  const db = await dbLesen(ordner);
  await aenderung(db);
  await dbSchreiben(ordner, db);
  return db;
}
