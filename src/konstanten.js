// Zentrale Konstanten – reine Daten.

// Dateiname der gemeinsamen Projekt-/Stunden-Datenbank im Grundordner.
export const DB_NAME = 'oebb_datenbank.json';

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
