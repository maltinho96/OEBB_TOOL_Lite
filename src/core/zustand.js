// Kleiner geteilter Zustand: die zuletzt aus dem Grundordner gelesene
// Datenbank. Dashboard, Karte und Stundenansicht teilen sich dieselbe
// Kopie (wie im Original die globale Variable letzteDb), damit z. B. ein
// Klick auf eine Kartennadel sofort die Projektdaten kennt, ohne erneut
// von der Festplatte zu lesen.

let letzteDb = null;

export function dbSetzen(db) {
  letzteDb = db;
}

export function dbHolen() {
  return letzteDb;
}