// Zentrale Konstanten – reine Daten.

// Dateiname der gemeinsamen Projekt-/Stunden-Datenbank im Grundordner.
export const DB_NAME = 'oebb_datenbank.json';

// Sperrdatei fuer gleichzeitiges Schreiben (siehe core/db.js).
export const LOCK_NAME = 'oebb_datenbank.lock';
// Aelter als das gilt eine Sperre als verwaist (z. B. nach Absturz) und
// wird ignoriert, statt die App fuer immer zu blockieren.
export const LOCK_VERWAIST_MS = 15000;
// Abstand zwischen zwei Versuchen, waehrend eine fremde Sperre aktiv ist.
export const LOCK_POLL_MS = 300;
// Maximale Wartezeit, bevor eine als "haengend" erkannte Sperre trotz
// allem uebernommen wird (Notbremse, damit die App nie dauerhaft blockiert).
export const LOCK_MAX_WARTEN_MS = 10000;
// Ab dieser Wartezeit "Bitte warten"-Meldung anzeigen (kurze Wartezeiten
// sollen unbemerkt bleiben, wie besprochen).
export const LOCK_STATUS_VERZOEGERUNG_MS = 400;

// Maximale Kantenlänge (px) beim Verkleinern von Bildern vor dem Einbetten.
export const BILD_MAX = {
  foto: 1600,          // Fotos in der Dokumentation
  plan: 1800,          // Übersichtsplan / Kartenausschnitt
  visualisierung: 1800,// Belehrung: Visualisierungsbilder
  unterschrift: 600,   // Unterschriftenfelder
};

// JPEG-Qualität beim Einbetten.
export const BILD_QUALITAET = 0.85;

// Startansicht der Karte (Brandenburg).
export const KARTE_START = { lat: 52.4, lng: 12.95, zoom: 9 };

// Monatsnamen (deutsch) für Stunden-/Excel-Ausgabe.
export const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];