// Kleine Hilfsfunktionen, die an vielen Stellen gebraucht werden.

// HTML-Sonderzeichen maskieren (für sicheres Einsetzen in innerHTML-Strings).
export function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "2026-10-22" -> "22.10.2026"; leer, wenn kein gültiges Datum.
export function datumDeutsch(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
}

// Wert des Protokollfelds mit data-feld="name" (getrimmt, sonst '').
export function feldWert(tab, name) {
  const el = tab && tab.querySelector('[data-feld="' + name + '"]');
  return el ? (el.value || '').trim() : '';
}

// Der gerade sichtbare Reiter (genau einer hat .tab.aktiv).
export function aktiverTab() {
  return document.querySelector('.tab.aktiv');
}

// Kurzstatus in mehreren Anzeigen gleichzeitig setzen (Übersicht/Karte/
// Stunden teilen sich dieselben Meldungen wie im Original).
export function statusText(t) {
  ['scanStatus', 'startStatus', 'exStatus'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  });
}
