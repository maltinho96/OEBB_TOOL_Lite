// Rote Markierungen in Fotos einzeichnen (z. B. verletzte Wurzeln).
//
// Bedienung: Foto in der Fotodokumentation anklicken → Fenster öffnet sich →
// Werkzeug wählen: "◯ Ellipse" (aufziehen) oder "╱ Strich" (von Punkt zu
// Punkt ziehen) → beliebig viele zeichnen → "Fertig".
// "↶" nimmt die letzte Markierung zurück, Esc bricht ab, Enter übernimmt.
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
// img -> Markierungen, Koordinaten als Anteile 0..1 der Bildgröße:
//   Ellipse: { x, y, rx, ry }   Strich: { typ: 'strich', x1, y1, x2, y2 }
const kreise = new WeakMap();

let werkzeug = 'ellipse'; // zuletzt gewähltes Werkzeug (bleibt für das nächste Foto)
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
  ctx.lineCap = 'round';
  const alle = vorschau ? liste.concat([vorschau]) : liste;
  alle.forEach((k) => {
    ctx.beginPath();
    if (k.typ === 'strich') {
      ctx.moveTo(k.x1 * w, k.y1 * h);
      ctx.lineTo(k.x2 * w, k.y2 * h);
    } else {
      ctx.ellipse(k.x * w, k.y * h, Math.max(k.rx * w, 1), Math.max(k.ry * h, 1), 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  });
}

function neuZeichnen() {
  const c = editor.querySelector('canvas');
  zeichnen(c.getContext('2d'), sitzung.bild, sitzung.kreise, sitzung.vorschau);
  editor.querySelector('[data-mk="zurueck"]').disabled = !sitzung.kreise.length;
}

function werkzeugZeigen() {
  editor.querySelectorAll('[data-werkzeug]').forEach((b) => b.classList.toggle('aktiv', b.dataset.werkzeug === werkzeug));
  editor.querySelector('.mk-hinweis').textContent = werkzeug === 'strich'
    ? 'Strich ziehen, um eine Stelle rot zu markieren'
    : 'Ellipse aufziehen, um eine Stelle rot zu markieren';
}

// Zeigerposition als Anteil (0..1) der Bildfläche.
function punkt(e) {
  const r = editor.querySelector('canvas').getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
  };
}

// Gezogene Strecke (Start bis aktueller Punkt) -> Ellipse im Rechteck
// dazwischen bzw. gerader Strich.
function formAus(a, b) {
  if (werkzeug === 'strich') return { typ: 'strich', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    rx: Math.abs(b.x - a.x) / 2,
    ry: Math.abs(b.y - a.y) / 2,
  };
}

// Versehentliche Klicks (fast keine Ausdehnung) nicht als Markierung werten.
function grossGenug(k) {
  if (k.typ === 'strich') return Math.hypot(k.x2 - k.x1, k.y2 - k.y1) > 0.01;
  return k.rx > 0.01 || k.ry > 0.01;
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
    '<span class="mk-werkzeuge">' +
    '<button data-mk="werkzeug" data-werkzeug="ellipse" title="Ellipse aufziehen">◯ Ellipse</button>' +
    '<button data-mk="werkzeug" data-werkzeug="strich" title="Geraden Strich ziehen">╱ Strich</button>' +
    '</span>' +
    '<span class="mk-hinweis"></span>' +
    '<button data-mk="zurueck" title="Letzte Markierung entfernen">↶ Zurück</button>' +
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
    sitzung.vorschau = formAus(sitzung.start, punkt(e));
    neuZeichnen();
  });
  c.addEventListener('pointerup', (e) => {
    if (!sitzung || !sitzung.start) return;
    const k = formAus(sitzung.start, punkt(e));
    sitzung.start = null;
    sitzung.vorschau = null;
    if (grossGenug(k)) sitzung.kreise.push(k);
    neuZeichnen();
  });

  editor.addEventListener('click', (e) => {
    const knopf = e.target.closest('[data-mk]');
    if (!knopf || !sitzung) return;
    if (knopf.dataset.mk === 'werkzeug') { werkzeug = knopf.dataset.werkzeug; werkzeugZeigen(); }
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
    werkzeugZeigen();
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
