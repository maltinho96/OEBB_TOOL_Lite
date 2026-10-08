// Rote Kreise in Fotos einzeichnen (z. B. verletzte Wurzeln markieren).
//
// Bedienung: Foto in der Fotodokumentation anklicken → Fenster öffnet sich →
// mit Maus oder Finger einen Kreis aufziehen (beliebig viele) → "Fertig".
// "↶" nimmt den letzten Kreis zurück, Esc bricht ab, Enter übernimmt.
//
// Die Kreise werden direkt ins Bild gerechnet (img.src wird ersetzt), damit
// sie ohne Sonderbehandlung im Druck, im PDF und in der gespeicherten Datei
// erscheinen. Das unmarkierte Original und die Kreisliste werden nur im
// Arbeitsspeicher gehalten (WeakMap) – so lassen sich Kreise in derselben
// Sitzung jederzeit wieder entfernen, ohne die Protokolldatei aufzublähen.
// (Fotos werden beim "Protokoll laden" ohnehin nicht übernommen.)
//
// GPS-Daten (data-lat/-lng) bleiben unberührt, weil nur src geändert wird.

import { BILD_QUALITAET } from '../config/konstanten.js';

const ROT = '#e00000';
const originale = new WeakMap(); // img -> unmarkierte data-URL
const kreise = new WeakMap();    // img -> [{x, y, rx, ry}] (Anteile 0..1 der Bildgröße)

let editor = null; // DOM des Fensters (einmalig erzeugt)
let sitzung = null; // { img, bild, kreise, vorschau, start }

function strichstaerke(w, h) {
  return Math.max(4, Math.round(Math.max(w, h) / 220));
}

function zeichnen(ctx, bild, liste, vorschau) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.drawImage(bild, 0, 0, w, h);
  ctx.strokeStyle = ROT;
  ctx.lineWidth = strichstaerke(w, h);
  const alle = vorschau ? liste.concat([vorschau]) : liste;
  alle.forEach((k) => {
    ctx.beginPath();
    ctx.ellipse(k.x * w, k.y * h, Math.max(k.rx * w, 1), Math.max(k.ry * h, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function neuZeichnen() {
  const c = editor.querySelector('canvas');
  zeichnen(c.getContext('2d'), sitzung.bild, sitzung.kreise, sitzung.vorschau);
  editor.querySelector('[data-mk="zurueck"]').disabled = !sitzung.kreise.length;
}

// Zeigerposition als Anteil (0..1) der Bildfläche.
function punkt(e) {
  const r = editor.querySelector('canvas').getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
  };
}

// Aufgezogenes Rechteck (Start bis aktueller Punkt) -> Ellipse darin.
function ellipseAus(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    rx: Math.abs(b.x - a.x) / 2,
    ry: Math.abs(b.y - a.y) / 2,
  };
}

function schliessen() {
  editor.hidden = true;
  document.body.style.overflow = '';
  sitzung = null;
}

function uebernehmen() {
  const { img, bild } = sitzung;
  if (!sitzung.kreise.length) {
    // Alle Kreise entfernt -> Original wiederherstellen.
    img.src = originale.get(img);
    kreise.set(img, []);
  } else {
    const c = document.createElement('canvas');
    c.width = bild.naturalWidth;
    c.height = bild.naturalHeight;
    zeichnen(c.getContext('2d'), bild, sitzung.kreise, null);
    img.src = c.toDataURL('image/jpeg', BILD_QUALITAET);
    kreise.set(img, sitzung.kreise.slice());
  }
  schliessen();
}

function editorBauen() {
  editor = document.createElement('div');
  editor.className = 'mk-editor kein-druck';
  editor.hidden = true;
  editor.innerHTML =
    '<div class="mk-flaeche"><canvas></canvas></div>' +
    '<div class="mk-leiste">' +
    '<span class="mk-hinweis">Kreis aufziehen, um eine Stelle rot zu markieren</span>' +
    '<button data-mk="zurueck" title="Letzten Kreis entfernen">↶ Zurück</button>' +
    '<button data-mk="abbrechen">Abbrechen</button>' +
    '<button data-mk="fertig" class="mk-fertig">Fertig</button>' +
    '</div>';
  document.body.appendChild(editor);

  const c = editor.querySelector('canvas');
  c.addEventListener('pointerdown', (e) => {
    if (!sitzung) return;
    c.setPointerCapture(e.pointerId);
    sitzung.start = punkt(e);
    sitzung.vorschau = null;
  });
  c.addEventListener('pointermove', (e) => {
    if (!sitzung || !sitzung.start) return;
    sitzung.vorschau = ellipseAus(sitzung.start, punkt(e));
    neuZeichnen();
  });
  c.addEventListener('pointerup', (e) => {
    if (!sitzung || !sitzung.start) return;
    const k = ellipseAus(sitzung.start, punkt(e));
    sitzung.start = null;
    sitzung.vorschau = null;
    // Versehentliche Klicks (fast keine Ausdehnung) nicht als Kreis werten.
    if (k.rx > 0.01 || k.ry > 0.01) sitzung.kreise.push(k);
    neuZeichnen();
  });

  editor.addEventListener('click', (e) => {
    const knopf = e.target.closest('[data-mk]');
    if (!knopf || !sitzung) return;
    if (knopf.dataset.mk === 'zurueck') { sitzung.kreise.pop(); neuZeichnen(); }
    if (knopf.dataset.mk === 'abbrechen') schliessen();
    if (knopf.dataset.mk === 'fertig') uebernehmen();
  });

  document.addEventListener('keydown', (e) => {
    if (!sitzung) return;
    if (e.key === 'Escape') schliessen();
    if (e.key === 'Enter') { e.preventDefault(); uebernehmen(); }
  });
}

function oeffnen(img) {
  if (!editor) editorBauen();
  if (!originale.has(img)) originale.set(img, img.src);

  const bild = new Image();
  bild.onload = () => {
    const c = editor.querySelector('canvas');
    c.width = bild.naturalWidth;
    c.height = bild.naturalHeight;
    sitzung = { img, bild, kreise: (kreise.get(img) || []).slice(), vorschau: null, start: null };
    editor.hidden = false;
    document.body.style.overflow = 'hidden';
    neuZeichnen();
  };
  bild.src = originale.get(img);
}

export function markierenInit(root) {
  (root || document).addEventListener('click', (e) => {
    const img = e.target.closest('.abb-bilder img');
    if (img) oeffnen(img);
  });
}
