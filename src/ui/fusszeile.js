// Dokument-Fußzeile: füllt das Element am Ende jedes Protokolls
// (data-dok-fusszeile, aus schema/felder.js abschlussFusszeile) mit
//   Ökologische Baubegleitung im Auftrag der „«Auftraggeber»"
// Der Auftraggeber-Name kommt aus dem Feld data-feld="auftraggeber-fuss"
// im selben Protokoll-Reiter und wird bei jeder Eingabe aktualisiert.
// Farbe/Position steuert das CSS (.dok-fusszeile).

function fusszeileImTab(tab) {
  const el = tab.querySelector('[data-dok-fusszeile]');
  if (!el) return;
  const feld = tab.querySelector('[data-feld="auftraggeber-fuss"]');
  const ag = feld ? feld.value.trim() : '';
  el.textContent = ag
    ? 'Ökologische Baubegleitung im Auftrag der „' + ag + '“'
    : 'Ökologische Baubegleitung';
}

function alleAktualisieren() {
  document.querySelectorAll('.tab').forEach(fusszeileImTab);
}

export function fusszeileInit() {
  alleAktualisieren();
  // Bei Eingabe im Auftraggeber-Feld die Fußzeile desselben Reiters füllen.
  document.addEventListener('input', (e) => {
    if (e.target && e.target.matches && e.target.matches('[data-feld="auftraggeber-fuss"]')) {
      const tab = e.target.closest('.tab');
      if (tab) fusszeileImTab(tab);
    }
  });
}