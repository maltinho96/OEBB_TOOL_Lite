// Karten im Protokoll, alle aus dem aktuellen DOM-Zustand aufgebaut:
//
//  1. Übersichtsplan (.plankarte-map): Projekt-Flächen (Shapes) + je Foto-
//     Gruppe ein nummeriertes blaues Rechteck.
//  2. Über jedem Foto-Block (.abb-karte): eine 3:1-Karte mit den Standorten
//     der Fotos dieses Blocks (Punkte mit Abbildungsnummer) + Shapes.
//     Blöcke ohne GPS-Fotos zeigen keine Karte.
//
// Die GPS-Koordinaten hängen als data-lat/data-lng an den <img> (gesetzt
// in ui/fotos.js). Welche Shapes gezeichnet werden, bestimmt das im
// Protokoll gewählte Projekt (tab.dataset.projektId, ui/projektwahl.js).
//
// karteAktualisieren(tab) nach JEDER Änderung aufrufen (Foto rein/raus,
// Projekt gewählt, Reiter angezeigt) – es baut alles neu auf, dadurch
// stimmen Karten und Nummern immer.

import L from 'leaflet';
import { KARTE_START } from '../config/konstanten.js';
import { osmEbene } from './karte.js';
import { dbHolen } from '../core/zustand.js';

const GRUPPEN_ABSTAND_M = 50;   // Übersicht: ab hier neues Rechteck
const MIN_KASTEN_M = 45;        // Übersicht: Mindest-Kantenlänge
const GLEICHER_ORT_M = 5;       // Block-Karte: Fotos so nah = ein Punkt

// Shapes gestrichelt rot-orange, damit sie sich von den blauen
// Foto-Bereichen klar abheben.
const FLAECHEN_STIL = { color: '#c0392b', weight: 2, dashArray: '6 4', fillColor: '#c0392b', fillOpacity: 0.08 };

const uebersichten = new Map();      // tab   -> { karte, flaechen, rechtecke }
const blockKarten = new WeakMap();   // .abb  -> { karte, gruppe }

// ---------- Hilfen ----------

function distanzM(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * R;
}

// Ketten-Clustering: Elemente landen in einer Gruppe, sobald eines davon
// höchstens maxM von einem Element der Gruppe entfernt ist.
function gruppieren(punkte, maxM) {
  const gruppen = punkte.map((p) => [p]);
  let veraendert = true;
  while (veraendert) {
    veraendert = false;
    for (let i = 0; i < gruppen.length && !veraendert; i++) {
      for (let j = i + 1; j < gruppen.length; j++) {
        if (gruppen[i].some((a) => gruppen[j].some((b) => distanzM(a, b) <= maxM))) {
          gruppen[i] = gruppen[i].concat(gruppen[j]);
          gruppen.splice(j, 1);
          veraendert = true;
          break;
        }
      }
    }
  }
  return gruppen;
}

function gruppenRechteck(gruppe) {
  const lats = gruppe.map((p) => p.lat);
  const lngs = gruppe.map((p) => p.lng);
  let sued = Math.min(...lats);
  let nord = Math.max(...lats);
  let west = Math.min(...lngs);
  let ost = Math.max(...lngs);
  // Mindestgröße, damit dicht beieinanderliegende Fotos kein Strich werden.
  const mitteLat = (sued + nord) / 2;
  const mitteLng = (west + ost) / 2;
  const halbLat = (MIN_KASTEN_M / 2) / 111320;
  const halbLng = (MIN_KASTEN_M / 2) / (111320 * Math.cos(mitteLat * Math.PI / 180));
  if ((nord - sued) < 2 * halbLat) { sued = mitteLat - halbLat; nord = mitteLat + halbLat; }
  if ((ost - west) < 2 * halbLng) { west = mitteLng - halbLng; ost = mitteLng + halbLng; }
  return [[sued, west], [nord, ost]];
}

function karteErzeugen(div) {
  const karte = L.map(div, {
    // OSM-Daten stehen unter der ODbL – Quellenangabe ist Pflicht, auch im Druck.
    attributionControl: true,
    // Mausrad zoomt sonst die Karte statt die Seite zu scrollen.
    scrollWheelZoom: false,
  }).setView([KARTE_START.lat, KARTE_START.lng], KARTE_START.zoom);
  karte.attributionControl.setPrefix('');
  osmEbene().addTo(karte);
  return karte;
}

// Flächen des im Protokoll gewählten Projekts (aus der Datenbank).
function projektFlaechen(tab) {
  const pid = tab.dataset.projektId;
  const db = dbHolen();
  const p = pid && db && db.projekte ? db.projekte[pid] : null;
  return (p && p.flaechen) || [];
}

// Zeichnet die Shapes in eine LayerGroup, gibt ihre Eckpunkte zurück.
function flaechenZeichnen(gruppe, flaechen) {
  const ecken = [];
  flaechen.forEach((f) => {
    const layer = L.geoJSON(f.geojson, {
      style: FLAECHEN_STIL,
      interactive: false,
      pointToLayer: (_, ll) => L.circleMarker(ll, { ...FLAECHEN_STIL, radius: 4, dashArray: null }),
    }).addTo(gruppe);
    const b = layer.getBounds();
    if (b.isValid()) ecken.push(b.getSouthWest(), b.getNorthEast());
  });
  return ecken;
}

function punktAusImg(img) {
  const lat = parseFloat(img.dataset.lat);
  const lng = parseFloat(img.dataset.lng);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };
}

// ---------- 1. Übersichtsplan ----------

function uebersichtAktualisieren(tab) {
  const div = tab.querySelector('.plankarte-map');
  if (!div) return;
  let e = uebersichten.get(tab);
  if (!e) {
    const karte = karteErzeugen(div);
    e = { karte, flaechen: L.layerGroup().addTo(karte), rechtecke: L.layerGroup().addTo(karte) };
    uebersichten.set(tab, e);
  }
  e.flaechen.clearLayers();
  e.rechtecke.clearLayers();

  const ecken = flaechenZeichnen(e.flaechen, projektFlaechen(tab));

  const punkte = [];
  tab.querySelectorAll('.abb-bilder img[data-lat][data-lng]').forEach((img) => {
    const p = punktAusImg(img);
    if (p) punkte.push(p);
  });

  gruppieren(punkte, GRUPPEN_ABSTAND_M)
    .sort((a, b) => Math.max(...b.map((p) => p.lat)) - Math.max(...a.map((p) => p.lat)))
    .forEach((g, i) => {
      const grenzen = gruppenRechteck(g);
      L.rectangle(grenzen, { color: '#1f6fd6', weight: 2, fillColor: '#1f6fd6', fillOpacity: 0.15 })
        .addTo(e.rechtecke);
      L.marker([(grenzen[0][0] + grenzen[1][0]) / 2, (grenzen[0][1] + grenzen[1][1]) / 2], {
        icon: L.divIcon({ className: 'bereich-nummer', html: String(i + 1), iconSize: [24, 24], iconAnchor: [12, 12] }),
        interactive: false,
      }).addTo(e.rechtecke);
      ecken.push(L.latLng(grenzen[0]), L.latLng(grenzen[1]));
    });

  const ausschnitt = () => {
    e.karte.invalidateSize();
    if (ecken.length) e.karte.fitBounds(L.latLngBounds(ecken), { padding: [30, 30], maxZoom: 17 });
    else e.karte.setView([KARTE_START.lat, KARTE_START.lng], KARTE_START.zoom);
  };
  ausschnitt();
  setTimeout(ausschnitt, 150); // falls der Reiter gerade erst sichtbar wurde
}

// ---------- 2. Karte über jedem Foto-Block ----------

function blockKarteAktualisieren(block, flaechen, nummerVon) {
  const huelle = block.querySelector('.abb-karte');
  if (!huelle) return;

  // Fotos des Blocks mit Koordinate; sehr nah beieinander = ein Punkt
  // mit mehreren Nummern ("1, 2"), sonst überdecken sich die Marker.
  const fotos = [];
  block.querySelectorAll('.abb-bilder img[data-lat][data-lng]').forEach((img) => {
    const p = punktAusImg(img);
    if (p) fotos.push({ ...p, nr: nummerVon.get(img) });
  });

  if (!fotos.length) {
    huelle.style.display = 'none';
    return;
  }
  huelle.style.display = '';

  let e = blockKarten.get(block);
  if (!e) {
    huelle.innerHTML = '<div class="abb-karte-map"></div>';
    const karte = karteErzeugen(huelle.firstChild);
    e = { karte, gruppe: L.layerGroup().addTo(karte) };
    blockKarten.set(block, e);
  }
  e.gruppe.clearLayers();
  flaechenZeichnen(e.gruppe, flaechen);

  const punkte = [];
  gruppieren(fotos, GLEICHER_ORT_M).forEach((g) => {
    const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
    const lng = g.reduce((s, p) => s + p.lng, 0) / g.length;
    const text = g.map((p) => p.nr).sort((a, b) => a - b).join(', ');
    const breite = Math.max(22, 8 + text.length * 7);
    L.marker([lat, lng], {
      icon: L.divIcon({ className: 'foto-marker', html: text, iconSize: [breite, 22], iconAnchor: [breite / 2, 11] }),
      interactive: false,
    }).addTo(e.gruppe);
    punkte.push(L.latLng(lat, lng));
  });

  const ausschnitt = () => {
    e.karte.invalidateSize();
    if (punkte.length === 1) e.karte.setView(punkte[0], 18);
    else e.karte.fitBounds(L.latLngBounds(punkte), { padding: [40, 40], maxZoom: 18 });
  };
  ausschnitt();
  setTimeout(ausschnitt, 150);
}

// ---------- Öffentlich ----------

export function karteAktualisieren(tab) {
  if (!tab) return;
  uebersichtAktualisieren(tab);

  // Fortlaufende Abbildungsnummer je Foto (wie abbNummerieren in fotos.js).
  const nummerVon = new Map();
  tab.querySelectorAll('.fotoContainer .abb-bilder img').forEach((img, i) => nummerVon.set(img, i + 1));

  const flaechen = projektFlaechen(tab);
  tab.querySelectorAll('.fotoContainer .abb').forEach((block) => {
    blockKarteAktualisieren(block, flaechen, nummerVon);
  });
}