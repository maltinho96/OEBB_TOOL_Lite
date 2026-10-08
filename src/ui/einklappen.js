// Schutzblöcke ein-/ausklappen: Jede Tabelle mit data-schutzblock hat als
// erste Zeile die Checkbox "Begehung ohne Beanstandung" (data-einklapp).
// Ist sie angehakt (= ohne Beanstandung), werden die Detailzeilen darunter
// ausgeblendet. Beim Abhaken (= mit Beanstandung) klappen sie auf.
//
// Zweite Ebene (Arten- und Habitatschutz): Zeilen mit data-unterkopf sind
// Unterpunkte (Vogelschutz, Fledermausschutz …) mit eigener Checkbox
// "ohne Beanstandung" (data-unterklapp). Ist der Block aufgeklappt, sind
// alle Unterpunkt-Köpfe sichtbar, ihre Details aber nur, wenn beim
// jeweiligen Unterpunkt der Haken entfernt wurde.
//
// Beim Drucken/Export bleibt alles wie eingestellt: eingeklappte Teile
// drucken nur ihre "ohne Beanstandung"-Zeile (kurzer Nachweis). Die Zeilen
// werden per inline-style display:none gesetzt, damit auch der HTML-Export
// (der den DOM-Zustand serialisiert) den Stand korrekt übernimmt.

function bloeckeAktualisieren(tabelle) {
  const kasten = tabelle.querySelector('[data-einklapp]');
  if (!kasten) return;
  const ohneBeanstandung = kasten.checked;
  const hatUnterpunkte = !!tabelle.querySelector('[data-unterkopf]');

  const zeilen = Array.from(tabelle.querySelectorAll('tr')).slice(1);
  let unterpunktOk = false; // gehört die Zeile zu einem Unterpunkt ohne Beanstandung?
  zeilen.forEach((tr) => {
    if (tr.hasAttribute('data-unterkopf')) {
      const k = tr.querySelector('[data-unterklapp]');
      unterpunktOk = !!(k && k.checked);
      tr.style.display = ohneBeanstandung ? 'none' : '';
      return;
    }
    if (tr.hasAttribute('data-immer-sichtbar')) {
      tr.style.display = '';
      return;
    }
    tr.style.display = ohneBeanstandung || unterpunktOk ? 'none' : '';
  });

  // Anhang-Elemente: weitere Tabellen/Absätze, die zum selben Block
  // gehören (Wurzeltabelle und Maßnahmen beim Baumschutz), klappen mit.
  const gruppe = tabelle.getAttribute('data-schutzblock-gruppe');
  if (gruppe) {
    document.querySelectorAll('[data-schutzblock-anhang="' + gruppe + '"]').forEach((el) => {
      el.style.display = ohneBeanstandung ? 'none' : '';
    });
  }

  const hinweis = tabelle.querySelector('.einklapp-hinweis');
  if (hinweis) {
    if (ohneBeanstandung) {
      hinweis.textContent = '(keine Beanstandung – Details eingeklappt, zum Aufklappen Haken entfernen)';
    } else if (hatUnterpunkte) {
      hinweis.textContent = '(mit Beanstandung – beim betroffenen Unterpunkt den Haken entfernen)';
    } else {
      hinweis.textContent = '(mit Beanstandung – bitte Details ausfüllen)';
    }
  }
}

// Alle Schutzblöcke im Bereich neu darstellen – z. B. nach "Protokoll
// laden", wenn sich Häkchen geändert haben, ohne dass jemand geklickt hat.
export function einklappenAktualisieren(root) {
  (root || document).querySelectorAll('table[data-schutzblock]').forEach(bloeckeAktualisieren);
}

export function einklappenInit(root) {
  root = root || document;
  root.querySelectorAll('table[data-schutzblock]').forEach((tabelle) => {
    bloeckeAktualisieren(tabelle);
    tabelle.addEventListener('change', (e) => {
      if (e.target.matches('[data-einklapp], [data-unterklapp]')) bloeckeAktualisieren(tabelle);
    });
  });
}