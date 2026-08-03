// Kleine, DOM-freie Hilfsfunktionen.

// HTML-Sonderzeichen maskieren (für sicheres Einsetzen in innerHTML-Strings).
export function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Kurzstatus in mehreren Anzeigen gleichzeitig setzen (Übersicht/Karte/
// Stunden teilen sich dieselben Meldungen wie im Original).
export function statusText(t) {
  ['scanStatus', 'startStatus', 'exStatus'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  });
}