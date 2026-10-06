// Lesen, Schreiben und Migrieren der gemeinsamen oebb_datenbank.json.
// Die eigentliche Datei-IO liegt im Speicher-Backend; hier nur die
// JSON-Struktur, Migration und die Aenderungs-Transaktion. KEIN DOM
// (bis auf die statusText-Meldung beim Warten auf eine fremde Sperre).

import { leseDbText, schreibeDbText, dateiLesen, dateiSchreiben, dateiLoeschen, unterordnerHolen } from './storage/index.js';
import { statusText } from './util.js';
import {
  LOCK_NAME,
  LOCK_VERWAIST_MS,
  LOCK_POLL_MS,
  LOCK_MAX_WARTEN_MS,
  LOCK_STATUS_VERZOEGERUNG_MS,
} from '../config/konstanten.js';

function warten(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Sperre erwerben: legt oebb_datenbank.lock mit Zeitstempel an. Ist eine
// fremde Sperre aktiv, wird kurz gewartet und erneut versucht (mit kurzer
// Kontroll-Pause nach dem Schreiben, um zwei fast zeitgleiche Versuche
// auseinanderzuhalten). Eine Sperre, die aelter als LOCK_VERWAIST_MS ist,
// gilt als verwaist (z. B. nach einem Absturz) und wird ignoriert.
// Nach LOCK_MAX_WARTEN_MS wird die Sperre notfalls trotzdem uebernommen,
// damit die App nie dauerhaft blockiert.
async function lockErwerben(ordner) {
  const start = Date.now();
  let hinweisGezeigt = false;

  while (true) {
    const inhalt = await dateiLesen(ordner, LOCK_NAME);
    const alter = inhalt ? Date.now() - parseInt(inhalt, 10) : null;
    const frei = !inhalt || alter > LOCK_VERWAIST_MS;
    const zuLangeGewartet = Date.now() - start > LOCK_MAX_WARTEN_MS;

    if (frei || zuLangeGewartet) {
      const eigenerZeitstempel = String(Date.now());
      await dateiSchreiben(ordner, LOCK_NAME, eigenerZeitstempel);
      // Kurze Kontroll-Pause: falls eine zweite Person im selben Moment
      // ebenfalls geschrieben hat, gewinnt, wer zuletzt schrieb (das ist
      // die verbleibende, sehr kleine Rest-Unschaerfe der FSA-basierten
      // Sperre – in der Praxis so gut wie nie relevant).
      await warten(50);
      const kontrolle = await dateiLesen(ordner, LOCK_NAME);
      if (kontrolle === eigenerZeitstempel) {
        if (hinweisGezeigt) statusText('Danke fürs Warten – wird gespeichert …');
        return;
      }
      if (zuLangeGewartet) return; // Notbremse: einfach weitermachen
    }

    if (!hinweisGezeigt && Date.now() - start > LOCK_STATUS_VERZOEGERUNG_MS) {
      hinweisGezeigt = true;
      statusText('⏳ Jemand anderes speichert gerade – bitte kurz warten …');
    }
    await warten(LOCK_POLL_MS);
  }
}

async function lockFreigeben(ordner) {
  await dateiLoeschen(ordner, LOCK_NAME);
}

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

// Monatliche Sicherung: legt beim ersten Schreiben eines Monats eine Kopie
// des aktuellen Datenbank-Stands unter backups/oebb_JJJJ-MM.json an. Existiert
// die Datei fuer den laufenden Monat schon, passiert nichts (nur EIN
// Schnappschuss pro Monat, der den Monatsanfangs-Stand festhaelt). Fehler
// beim Sichern sind unkritisch und duerfen das eigentliche Speichern nie
// blockieren – deshalb komplett in try/catch.
async function monatsSicherung(ordner, db) {
  try {
    const jetzt = new Date();
    const monat = jetzt.getFullYear() + '-' + String(jetzt.getMonth() + 1).padStart(2, '0');
    const name = 'oebb_' + monat + '.json';
    const backupOrdner = await unterordnerHolen(ordner, 'backups');
    if (!backupOrdner) return;
    // Schon vorhanden? Dann nicht ueberschreiben (Monatsanfangs-Stand halten).
    const vorhanden = await dateiLesen(backupOrdner, name);
    if (vorhanden != null) return;
    await dateiSchreiben(backupOrdner, name, JSON.stringify(db, null, 1));
  } catch (e) {
    // Sicherung fehlgeschlagen (z. B. keine Schreibrechte im Unterordner) -
    // das eigentliche Speichern laeuft trotzdem weiter.
  }
}

// Aenderungs-Transaktion: Sperre erwerben -> lesen -> (ggf. Monatssicherung)
// -> aenderung(db) anwenden -> schreiben -> Sperre freigeben. Die Sperre
// stellt sicher, dass niemand anderes zwischen Lesen und Schreiben dieselbe
// Datei veraendert (siehe lockErwerben). Gibt die geaenderte DB zurueck; das
// Neu-Zeichnen der Oberflaeche ist bewusst NICHT hier, sondern Sache der
// aufrufenden UI-Schicht.
export async function dbAendern(ordner, aenderung) {
  await lockErwerben(ordner);
  try {
    const db = await dbLesen(ordner);
    // Vor der Aenderung den aktuellen Stand monatlich sichern (nur einmal
    // pro Monat, siehe monatsSicherung).
    await monatsSicherung(ordner, db);
    await aenderung(db);
    await dbSchreiben(ordner, db);
    return db;
  } finally {
    await lockFreigeben(ordner);
  }
}
