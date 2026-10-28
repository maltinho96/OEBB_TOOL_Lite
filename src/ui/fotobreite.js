// Fotos eines Blocks bündig mit der Karte darüber: zusammen genau so breit
// wie die Karte und alle gleich hoch.
//
// So geht's: Jedes Foto bekommt sein Seitenverhältnis (Breite/Höhe) als
// CSS-Variable --ar; im Flex-Layout wächst jedes Foto proportional dazu
// (flex-grow = --ar). Dadurch sind alle Fotos gleich hoch und füllen die
// Zeile exakt. Die Summe der Verhältnisse (--summe an .abb-bilder) begrenzt
// die Breite, falls die Fotos sonst zu hoch würden (z. B. zwei
// Hochformat-Handyfotos) – dann werden sie gleichmäßig kleiner und mittig.
// Siehe grundlagen.css / druck.css (.abb-bilder).

function verhaeltnis(img) {
  return img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
}

export function fotobreiteAktualisieren(bilder) {
  if (!bilder) return;
  let summe = 0;
  bilder.querySelectorAll('img').forEach((img) => {
    const ar = verhaeltnis(img);
    if (!ar) return;
    img.style.setProperty('--ar', ar.toFixed(4));
    summe += ar;
  });
  if (summe) bilder.style.setProperty('--summe', summe.toFixed(4));
  // flex-grow als Anteil (Summe = 1): Ist die Summe der Wachstumswerte
  // kleiner als 1 (z. B. ein einzelnes Hochformatfoto, 0,56), verteilt der
  // Browser nur diesen Bruchteil des Platzes – das Foto bliebe zu schmal.
  if (summe) {
    bilder.querySelectorAll('img').forEach((img) => {
      const ar = verhaeltnis(img);
      if (ar) img.style.setProperty('--anteil', (ar / summe).toFixed(5));
    });
  }
  bilder.style.setProperty('--anzahl', String(bilder.querySelectorAll('img').length));
}

export function fotobreiteInit(root) {
  // Bild fertig geladen (neu eingefügt, markiert, aus Datei übernommen):
  // load-Ereignisse steigen nicht auf, daher in der Capture-Phase lauschen.
  root.addEventListener('load', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest('.abb-bilder')) fotobreiteAktualisieren(t.closest('.abb-bilder'));
  }, true);
  // Foto entfernt oder verschoben: Summe neu berechnen.
  new MutationObserver((liste) => {
    const betroffen = new Set();
    liste.forEach((m) => {
      const b = m.target.closest && m.target.closest('.abb-bilder');
      if (b) betroffen.add(b);
      m.target.querySelectorAll && m.target.querySelectorAll('.abb-bilder').forEach((x) => betroffen.add(x));
    });
    betroffen.forEach(fotobreiteAktualisieren);
  }).observe(root, { childList: true, subtree: true });
}
