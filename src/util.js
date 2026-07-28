// Kleine, DOM-freie Hilfsfunktionen.

// HTML-Sonderzeichen maskieren (für sicheres Einsetzen in innerHTML-Strings).
export function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
