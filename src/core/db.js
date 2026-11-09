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
        return eigenerZeitstempel;
      }
      if (zuLangeGewartet) return eigenerZeitstempel; // Notbremse: einfach weitermachen
    }

    if (!hinweisGezeigt && Date.now() - start > LOCK_STATUS_VERZOEGERUNG_MS) {
      hinweisGezeigt = true;
      statusText('⏳ Jemand anderes speichert gerade – bitte kurz warten …');
    }
    await warten(LOCK_POLL_MS);
  }
}

// Nur die EIGENE Sperre löschen – hat sie inzwischen jemand anderes
// übernommen (Notbremse bei sehr langem Warten), bleibt seine stehen.
async function lockFreigeben(ordner, stempel) {
  const inhalt = await dateiLesen(ordner, LOCK_NAME);
  if (inhalt == null || inhalt === stempel) await dateiLoeschen(ordner, LOCK_NAME);
}

// Fehler beim Lesen der Datenbank: einmal deutlich melden (nicht bei
// jedem Neuzeichnen erneut) und weiterwerfen – es wird dann NICHTS
// geschrieben, damit eine unlesbare Datei nie durch eine leere ersetzt wird.
let letzteMeldung = '';
function lesefehler(text) {
  statusText('⚠️ ' + text);
  if (letzteMeldung !== text) { letzteMeldung = text; alert('⚠️ ' + text); }
  return new Error(text);
}

// Rohtext -> geparste, migrierte DB-Struktur (immer mit .projekte).
// Leerer Text = noch keine Datenbank. Kaputtes JSON = Fehler.
function dbAusText(text) {
  let db = {};
  if (text && text.trim()) {
    try {
      db = JSON.parse(text);
    } catch {
      throw lesefehler('Die Datenbank-Datei ist beschädigt (kein gültiges JSON) und wird nicht überschrieben. ' +
        'Bitte aus dem Ordner „backups“ die letzte Sicherung zurückkopieren.');
    }
  }
  if (!db || typeof db !== 'object') db = {};
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

async function textLesen(ordner) {
  try {
    return await leseDbText(ordner);
  } catch (e) {
    throw lesefehler('Die Datenbank konnte nicht gelesen werden (' + (e && e.message ? e.message : e) +
      '). Netzlaufwerk / VPN verbunden? Es wurde nichts gespeichert.');
  }
}

// DB aus dem Grundordner lesen (oder leere Struktur, wenn es noch keine gibt).
export async function dbLesen(ordner) {
  const db = dbAusText(await textLesen(ordner));
  letzteMeldung = '';
  return db;
}

// DB in den Grundordner schreiben (eingerueckt, wie im Original).
async function dbSchreiben(ordner, db) {
  await schreibeDbText(ordner, JSON.stringify(db, null, 1));
}

// Tägliche Sicherung (rollierend, eine Datei je Wochentag): vor dem ersten
// Schreiben eines Tages den Stand sichern. So gibt es immer die letzten
// sieben Tage zum Zurückholen, ohne dass sich Dateien ansammeln.
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
async function tagesSicherung(ordner, db) {
  try {
    const heute = new Date();
    const datum = heute.getFullYear() + '-' + String(heute.getMonth() + 1).padStart(2, '0') + '-' + String(heute.getDate()).padStart(2, '0');
    const backupOrdner = await unterordnerHolen(ordner, 'backups');
    if (!backupOrdner) return;
    const name = 'oebb_tag-' + WOCHENTAGE[heute.getDay()] + '.json';
    const vorhanden = await dateiLesen(backupOrdner, name);
    if (vorhanden && vorhanden.includes('"_gesichert": "' + datum + '"')) return;
    await dateiSchreiben(backupOrdner, name, JSON.stringify({ _gesichert: datum, ...db }, null, 1));
  } catch {
    // unkritisch
  }
}

// Gibt es Sicherungen, obwohl die Datenbank fehlt? Dann wurde sie gelöscht
// oder verschoben – lieber nicht still eine neue, leere anlegen.
async function datenbankVerschwunden(ordner) {
  try {
    const backupOrdner = await unterordnerHolen(ordner, 'backups');
    if (!backupOrdner) return false;
    for (const tag of WOCHENTAGE) {
      if (await dateiLesen(backupOrdner, 'oebb_tag-' + tag + '.json')) return true;
    }
  } catch { /* egal */ }
  return false;
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
  } catch {
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
  const stempel = await lockErwerben(ordner);
  try {
    const text = await textLesen(ordner);
    if (text == null && await datenbankVerschwunden(ordner)) {
      throw lesefehler('Die Datenbank-Datei fehlt im Grundordner, es gibt aber Sicherungen. ' +
        'Bitte die letzte Sicherung aus „backups“ als oebb_datenbank.json zurückkopieren – es wurde nichts gespeichert.');
    }
    const db = dbAusText(text);
    // Vor der Aenderung sichern: täglich (7 Tage rollierend) und monatlich.
    await tagesSicherung(ordner, db);
    await monatsSicherung(ordner, db);
    await aenderung(db);
    await dbSchreiben(ordner, db);
    letzteMeldung = '';
    return db;
  } finally {
    await lockFreigeben(ordner, stempel);
  }
}
