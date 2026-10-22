// Druckbild der Karten: Jede Protokoll-Karte (Übersichtsplan, Karte über
// dem Foto-Block) bekommt ein festes Bild ihres aktuellen Ausschnitts
// (<img class="karte-druckbild"> direkt hinter der Karte).
//
// Warum? Eine lebende Leaflet-Karte druckt nicht zuverlässig: Firefox
// zeigt graue Streifen statt Kacheln oder verschiebt Marker, und in einer
// gespeicherten Protokoll-Datei läuft gar kein Leaflet mehr. Ein Bild
// druckt dagegen überall gleich.
//
// Gezeichnet wird, was gerade zu sehen ist: Kacheln, Flächen/Rechtecke
// (SVG der Karte), Nummern-Marker und die OSM-Quellenangabe (Pflicht).
// Am Bildschirm bleibt die bedienbare Karte sichtbar; im Druck (und in der
// gespeicherten Datei) erscheint stattdessen das Bild – gesteuert über die
// Klasse .hat-druckbild an der Hülle (siehe druck.css).

import { aktiverTab } from '../core/util.js';

const AUFLOESUNG = 2;        // doppelte Pixeldichte → scharf im Druck
const QUALITAET = 0.85;      // JPEG
const karten = new WeakMap(); // Karten-Container -> Leaflet-Karte
const geplant = new WeakMap(); // Karte -> Timer

// Rechteck eines Elements relativ zur Karte.
function relativ(el, basis) {
  const r = el.getBoundingClientRect();
  return { x: r.left - basis.left, y: r.top - basis.top, w: r.width, h: r.height };
}

function kachelnZeichnen(g, c, basis) {
  // Ältere Zoomstufen liegen darunter (kleinerer z-index) – in dieser
  // Reihenfolge zeichnen, damit die aktuelle Stufe oben liegt.
  const ebenen = Array.from(c.querySelectorAll('.leaflet-tile-container'))
    .sort((a, b) => (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0));
  ebenen.forEach((ebene) => {
    ebene.querySelectorAll('img.leaflet-tile-loaded').forEach((img) => {
      if (!img.complete || !img.naturalWidth) return;
      const t = relativ(img, basis);
      g.drawImage(img, t.x, t.y, t.w, t.h);
    });
  });
}

function flaechenZeichnen(g, c, basis) {
  c.querySelectorAll('.leaflet-overlay-pane svg').forEach((svg) => {
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const r = relativ(svg, basis);
    if (!vb || !vb.width || !r.w) return;
    const sx = r.w / vb.width;
    const sy = r.h / vb.height;
    svg.querySelectorAll('path').forEach((p) => {
      const d = p.getAttribute('d');
      if (!d || d === 'M0 0') return;
      const pfad = new Path2D(d);
      g.save();
      g.translate(r.x, r.y);
      g.scale(sx, sy);
      g.translate(-vb.x, -vb.y);
      const fill = p.getAttribute('fill');
      if (fill && fill !== 'none') {
        g.globalAlpha = parseFloat(p.getAttribute('fill-opacity') || '1');
        g.fillStyle = fill;
        g.fill(pfad, p.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero');
      }
      const stroke = p.getAttribute('stroke');
      if (stroke && stroke !== 'none') {
        g.globalAlpha = parseFloat(p.getAttribute('stroke-opacity') || '1');
        g.strokeStyle = stroke;
        g.lineWidth = parseFloat(p.getAttribute('stroke-width') || '1');
        g.lineJoin = 'round';
        g.lineCap = 'round';
        const dash = (p.getAttribute('stroke-dasharray') || '').split(/[\s,]+/).map(parseFloat).filter((n) => n > 0);
        g.setLineDash(dash);
        g.stroke(pfad);
      }
      g.restore();
    });
  });
}

function rundesRechteck(g, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function sichtbareFarbe(f) {
  return f && f !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(f);
}

// Nummern-Marker (DivIcons) mit ihrem tatsächlichen Aussehen nachzeichnen.
function markerZeichnen(g, c, basis) {
  c.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon').forEach((el) => {
    const m = relativ(el, basis);
    const cs = getComputedStyle(el);
    const rand = parseFloat(cs.borderTopWidth) || 0;
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (sichtbareFarbe(cs.backgroundColor)) {
      g.save();
      g.shadowColor = 'rgba(0,0,0,.4)';
      g.shadowBlur = 2;
      g.shadowOffsetY = 1;
      rundesRechteck(g, m.x, m.y, m.w, m.h, radius);
      g.fillStyle = cs.backgroundColor;
      g.fill();
      g.restore();
    }
    if (rand && sichtbareFarbe(cs.borderTopColor)) {
      rundesRechteck(g, m.x + rand / 2, m.y + rand / 2, m.w - rand, m.h - rand, Math.max(0, radius - rand / 2));
      g.lineWidth = rand;
      g.strokeStyle = cs.borderTopColor;
      g.stroke();
    }
    const text = (el.textContent || '').trim();
    if (text) {
      g.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      g.fillStyle = cs.color;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, m.x + m.w / 2, m.y + m.h / 2 + 0.5);
    }
  });
}

// OSM-Quellenangabe unten rechts (ODbL-Pflicht).
function quelleZeichnen(g, breite, hoehe) {
  const text = '© OpenStreetMap-Mitwirkende';
  g.font = '9px system-ui, sans-serif';
  const w = g.measureText(text).width + 8;
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fillRect(breite - w, hoehe - 13, w, 13);
  g.fillStyle = '#333';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(text, breite - 4, hoehe - 6.5);
}

// Zeichnet die Karte als JPEG-DataURL. null, wenn die Karte gerade nicht
// sichtbar ist (anderer Reiter) oder die Kacheln nicht ausgelesen werden
// dürfen.
function bildErzeugen(c) {
  const basis = c.getBoundingClientRect();
  if (!basis.width || !basis.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(basis.width * AUFLOESUNG);
  canvas.height = Math.round(basis.height * AUFLOESUNG);
  const g = canvas.getContext('2d');
  g.scale(AUFLOESUNG, AUFLOESUNG);
  g.fillStyle = '#ddd';
  g.fillRect(0, 0, basis.width, basis.height);
  kachelnZeichnen(g, c, basis);
  flaechenZeichnen(g, c, basis);
  markerZeichnen(g, c, basis);
  quelleZeichnen(g, basis.width, basis.height);
  try {
    return canvas.toDataURL('image/jpeg', QUALITAET);
  } catch {
    return null; // Kacheln ohne CORS-Freigabe – dann bleibt die lebende Karte
  }
}

function druckbildSetzen(c) {
  const huelle = c.parentElement;
  if (!huelle) return;
  const url = bildErzeugen(c);
  if (!url) return; // altes Bild (falls vorhanden) behalten
  let img = c.nextElementSibling;
  if (!img || !img.classList.contains('karte-druckbild')) {
    img = document.createElement('img');
    img.className = 'karte-druckbild';
    img.alt = 'Karte';
    c.after(img);
  }
  img.src = url;
  huelle.classList.add('hat-druckbild');
}

// Neues Bild in Kürze erstellen (mehrere Änderungen kurz nacheinander
// ergeben nur ein Bild).
export function druckbildPlanen(karte) {
  clearTimeout(geplant.get(karte));
  geplant.set(karte, setTimeout(() => druckbildSetzen(karte.getContainer()), 400));
}

// Karte anmelden: aktualisiert ihr Druckbild automatisch, sobald alle
// Kacheln geladen sind oder der Ausschnitt sich ändert.
export function druckbildAnmelden(karte, kachelEbene) {
  karten.set(karte.getContainer(), karte);
  karte.on('moveend zoomend', () => druckbildPlanen(karte));
  if (kachelEbene) kachelEbene.on('load', () => druckbildPlanen(karte));
}

// Sofort (synchron) alle Druckbilder unterhalb von root neu zeichnen –
// direkt vor dem Drucken und vor dem Speichern.
export function druckbilderJetzt(root) {
  (root || document).querySelectorAll('.leaflet-container').forEach((c) => {
    if (!karten.has(c)) return;
    clearTimeout(geplant.get(karten.get(c)));
    druckbildSetzen(c);
  });
}

// Vor jedem Drucken (Knopf oder Strg+P) die Bilder des sichtbaren Reiters
// frisch zeichnen – synchron, damit der Browser sie schon mitdruckt.
export function kartenbildInit() {
  window.addEventListener('beforeprint', () => druckbilderJetzt(aktiverTab()));
}
