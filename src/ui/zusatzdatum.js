// Begehungsprotokoll: zweites Begehungsdatum (z. B. Wochenprotokoll mit zwei
// Begehungen in einer KW). Das Feld data-feld="datum2" ist versteckt, bis man
// auf „＋ weiteres Datum“ klickt oder es einen Wert hat. Leer = im Druck weg.

export function zusatzdatumAktualisieren(scope) {
  (scope || document).querySelectorAll('[data-zusatzdatum]').forEach((box) => {
    const feld = box.querySelector('[data-feld="datum2"]');
    const an = box.dataset.offen === '1' || !!(feld && feld.value);
    box.querySelector('.zd-feld').hidden = !an;
    box.querySelector('[data-aktion="datum2-an"]').hidden = an;
  });
}

// Vor Druck/Speichern: ein geöffnetes, aber leeres zweites Datum wieder
// einklappen, damit kein leeres „und ___“ im Protokoll steht.
export function zusatzdatumAufraeumen(scope) {
  (scope || document).querySelectorAll('[data-zusatzdatum]').forEach((box) => {
    const feld = box.querySelector('[data-feld="datum2"]');
    if (!feld || !feld.value) box.dataset.offen = '';
  });
  zusatzdatumAktualisieren(scope);
}

export function zusatzdatumInit(root) {
  window.addEventListener('beforeprint', () => zusatzdatumAufraeumen(root));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aktion="datum2-an"], [data-aktion="datum2-weg"]');
    if (!b) return;
    const box = b.closest('[data-zusatzdatum]');
    const feld = box.querySelector('[data-feld="datum2"]');
    if (b.dataset.aktion === 'datum2-an') {
      box.dataset.offen = '1';
      zusatzdatumAktualisieren(box.parentElement);
      feld.focus();
    } else {
      box.dataset.offen = '';
      feld.value = '';
      feld.removeAttribute('value');
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      zusatzdatumAktualisieren(box.parentElement);
    }
  });
  zusatzdatumAktualisieren(root);
}
