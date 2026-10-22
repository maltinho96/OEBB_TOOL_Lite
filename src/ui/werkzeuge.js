// Verdrahtet den Werkzeugleisten-Knopf "Drucken/PDF" (druckt den aktuell
// sichtbaren Reiter über druck.css). 'speichern' verdrahtet
// export/html-export.js.

// Die Fußzeile mit "Seite x/y" (ui/fusszeile.js) beherrschen nur Chrome
// und Edge ab Version 131. Firefox und Safari lassen sie weg.
function fusszeileMoeglich() {
  const m = /Chrome\/(\d+)/.exec(navigator.userAgent);
  return !!m && Number(m[1]) >= 131 && !/Firefox\//.test(navigator.userAgent);
}

let gewarnt = false;

function drucken() {
  if (!fusszeileMoeglich() && !gewarnt) {
    gewarnt = true;
    const weiter = confirm(
      'Hinweis: Dieser Browser druckt die Fußzeile (Datum · Auftrag · Seite x/y) nicht mit.\n\n' +
      'Für das fertige PDF bitte Google Chrome oder Microsoft Edge verwenden.\n\n' +
      'Trotzdem jetzt drucken?'
    );
    if (!weiter) return;
  }
  window.print();
}

export function werkzeugeInit() {
  const leiste = document.querySelector('.werkzeuge');
  if (!leiste) return;
  leiste.querySelectorAll('[data-aktion="drucken"]').forEach((btn) => {
    btn.addEventListener('click', drucken);
  });
}
