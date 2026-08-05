// Flächen (Shapefiles) im Projektformular: Upload, Zeichnung auf der
// Formular-Karte, Liste mit Entfernen-Knöpfen. Hält den Flächen-Zustand
// selbst; ui/projektformular.js ruft nur die exportierten Funktionen auf
// (flaechenLayerInit beim Erzeugen der Karte, flaechenLaden/-Leeren beim
// Bearbeiten/Leeren des Formulars, flaechenAktuelle beim Speichern).

import L from 'leaflet';
import { esc } from '../core/util.js';
import { shapefilesEinlesen } from '../core/shapefile.js';

let flaechen = []; // [{name, geojson}]
let layerGroup = null; // Leaflet-LayerGroup für die Anzeige
let karteRef = null; // Referenz auf die Formular-Karte (für fitBounds)

// Von ui/projektformular.js aufgerufen, sobald die Formular-Karte (npKarte)
// erzeugt wurde.
export function flaechenLayerInit(karte) {
  karteRef = karte;
  layerGroup = L.layerGroup().addTo(karte);
}

// Zeichnet alle aktuell gehaltenen Flächen neu und aktualisiert die Liste
// mit Entfernen-Knöpfen darunter.
function neuZeichnenUndAnzeigen() {
  if (layerGroup) layerGroup.clearLayers();
  const ziel = document.getElementById('npFlaechenListe');
  if (!flaechen.length) { if (ziel) ziel.innerHTML = ''; return; }

  let alleGrenzen = null;
  flaechen.forEach((f) => {
    const layer = L.geoJSON(f.geojson, { style: { color: '#1f3864', weight: 2, fillOpacity: 0.15 } });
    layer.bindTooltip(esc(f.name));
    if (layerGroup) layer.addTo(layerGroup);
    const b = layer.getBounds();
    if (b.isValid()) alleGrenzen = alleGrenzen ? alleGrenzen.extend(b) : b;
  });
  if (alleGrenzen && alleGrenzen.isValid() && karteRef) {
    karteRef.fitBounds(alleGrenzen, { padding: [20, 20], maxZoom: 15 });
  }

  if (ziel) {
    ziel.innerHTML = flaechen
      .map((f, idx) => `<span style="display:inline-flex; align-items:center; gap:4px; margin:2px 6px 2px 0; padding:2px 6px; background:#eef; border-radius:4px;">
        🗺 ${esc(f.name)} <button data-aktion="flaeche-entfernen" data-idx="${idx}" style="border:none;background:none;color:#a00;cursor:pointer;font-size:12px;">✕</button>
      </span>`)
      .join('');
  }
}

export async function flaechenHinzufuegen(files) {
  if (!files || !files.length) return;
  try {
    const neue = await shapefilesEinlesen(files);
    flaechen.push(...neue);
    neuZeichnenUndAnzeigen();
  } catch (err) {
    alert('Shapefile konnte nicht gelesen werden: ' + err.message);
  }
}

export function flaechenEntfernen(idx) {
  flaechen.splice(idx, 1);
  neuZeichnenUndAnzeigen();
}

export function flaechenLeeren() {
  flaechen = [];
  neuZeichnenUndAnzeigen();
}

// Beim Bearbeiten eines Projekts dessen gespeicherte Flächen laden.
export function flaechenLaden(gespeicherteListe) {
  flaechen = (gespeicherteListe || []).map((f) => ({ name: f.name, geojson: f.geojson }));
  neuZeichnenUndAnzeigen();
}

// Für projektAnlegen(): die aktuellen Flächen zum Speichern in die DB.
export function flaechenAktuelle() {
  return flaechen.map((f) => ({ name: f.name, geojson: f.geojson }));
}

// Verdrahtet den Datei-Upload und die Entfernen-Knöpfe.
export function shapefilesInit(section) {
  section.addEventListener('change', (e) => {
    if (e.target.id === 'npShapeInput') {
      flaechenHinzufuegen(e.target.files);
      e.target.value = '';
    }
  });
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion="flaeche-entfernen"]');
    if (btn) flaechenEntfernen(parseInt(btn.dataset.idx, 10));
  });
}