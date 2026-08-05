// Verdrahtet den Werkzeugleisten-Knopf "Drucken/PDF" (druckt den aktuell
// sichtbaren Reiter über druck.css). Ersetzt den werkzeugeInitStub aus
// dem ursprünglichen main.js-Bauplan, der beim Verdrahten der Module
// versehentlich ganz entfallen war.

export function werkzeugeInit() {
  const leiste = document.querySelector('.werkzeuge');
  if (!leiste) return;
  leiste.querySelectorAll('[data-aktion="drucken"]').forEach((btn) => {
    btn.addEventListener('click', () => window.print());
    // 'speichern' wird bereits von export/html-export.js verdrahtet.
  });
}