// Schutzblöcke ein-/ausklappen: Jede Tabelle mit data-schutzblock hat als
// erste Zeile die Checkbox "Begehung ohne Beanstandung" (data-einklapp).
// Ist sie angehakt (= ohne Beanstandung), werden die Detailzeilen darunter
// ausgeblendet – das gibt in der Übersicht Ruhe und zeigt nur die Blöcke
// mit Beanstandung ausführlich. Beim Abhaken (= mit Beanstandung) klappen
// die Details wieder auf.
//
// Beim Drucken/Export bleibt alles wie eingestellt sichtbar: eingeklappte
// Blöcke drucken nur die "ohne Beanstandung"-Zeile, das ist gewollt (kurzer
// Nachweis). Die eingeklappten Zeilen werden per inline-style display:none
// gesetzt, damit auch der HTML-Export (der den DOM-Zustand serialisiert)
// den eingeklappten Stand korrekt übernimmt.

function bloeckeAktualisieren(tabelle) {
  const kasten = tabelle.querySelector('[data-einklapp]');
  if (!kasten) return;
  const ohneBeanstandung = kasten.checked;
  const hinweis = tabelle.querySelector('.einklapp-hinweis');

  // Zeilen der Haupttabelle: alle außer der ersten (Checkbox-Zeile) und
  // außer denen mit data-immer-sichtbar (z. B. das Kommentarfeld beim
  // Baumschutz, das auch bei "ohne Beanstandung" ausfüllbar bleibt).
  const zeilen = Array.from(tabelle.querySelectorAll('tr'));
  zeilen.slice(1).forEach((tr) => {
    if (tr.hasAttribute('data-immer-sichtbar')) {
      tr.style.display = '';
      return;
    }
    tr.style.display = ohneBeanstandung ? 'none' : '';
  });

  // Anhang-Elemente: weitere Tabellen/Absätze, die zum selben Block
  // gehoeren (z. B. Wurzeltabelle und Maßnahmen beim Baumschutz), werden
  // komplett mit ein-/ausgeklappt.
  const gruppe = tabelle.getAttribute('data-schutzblock-gruppe');
  if (gruppe) {
    document.querySelectorAll('[data-schutzblock-anhang="' + gruppe + '"]').forEach((el) => {
      el.style.display = ohneBeanstandung ? 'none' : '';
    });
  }

  if (hinweis) {
    hinweis.textContent = ohneBeanstandung
      ? '(keine Beanstandung – Details eingeklappt, zum Aufklappen Haken entfernen)'
      : '(mit Beanstandung – bitte Details ausfüllen)';
  }
}

export function einklappenInit(root) {
  root = root || document;
  const tabellen = Array.from(root.querySelectorAll('table[data-schutzblock]'));

  // Startzustand herstellen und pro Tabelle auf Änderungen der Checkbox
  // reagieren.
  tabellen.forEach((tabelle) => {
    bloeckeAktualisieren(tabelle);
    const kasten = tabelle.querySelector('[data-einklapp]');
    if (kasten) {
      kasten.addEventListener('change', () => bloeckeAktualisieren(tabelle));
    }
  });
}