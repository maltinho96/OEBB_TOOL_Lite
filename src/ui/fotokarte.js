// Übersichtsplan-Karte: sammelt die GPS-Koordinaten der eingefügten Fotos
// (ausgelesen in core/exif.js, bevor das Bild verkleinert wird) und zeichnet
// je Foto-Gruppe ein blaues Rechteck auf eine OSM-Karte. Gruppierung per
// einfachem Ketten-Clustering: ein Foto gehört zu einer Gruppe, wenn es
// höchstens GRUPPEN_ABSTAND_M von IRGENDEINEM Foto der Gruppe entfernt ist.
// Liegen Fotos weiter auseinander, entstehen mehrere Rechtecke.
//
// Ein Einzelfoto (Gruppe mit nur einem Punkt) bekommt einen kleinen festen
// Kasten, damit es auf der Karte sichtbar ist.
//
// Die Koordinaten werden pro Protokoll-Reiter (container) gesammelt; bei
// jedem neuen Foto werden die Gruppen und Rechtecke neu berechnet.

import L from 'leaflet';
import { KARTE_START } from '../config/konstanten.js';
import { osmEbene } from './karte.js';

const GRUPPEN_ABSTAND_M = 50;   // ab hier neue Gruppe
const EINZEL_KASTEN_M = 30;     // Kantenlänge für Einzelfoto-Kasten

// Pro Container eine Leaflet-Instanz + gesammelte Punkte vorhalten.
const instanzen = new Map(); // container -> { karte, punkte: [{lat,lng}], rechteckGruppe }

// Grobe Entfernung zweier Koordinaten in Metern (Äquirektangular-Näherung,
// für wenige-100-m-Distanzen völlig ausreichend, kein Bedarf an Haversine).
function distanzM(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * R;
}

// Punkte per Ketten-Clustering gruppieren: verschmelze Gruppen, sobald zwei
// Punkte aus verschiedenen Gruppen näher als GRUPPEN_ABSTAND_M sind.
function gruppieren(punkte) {
  const gruppen = punkte.map((p) => [p]); // jede Punkt zunächst eigene Gruppe
  let veraendert = true;
  while (veraendert) {
    veraendert = false;
    for (let i = 0; i < gruppen.length; i++) {
      for (let j = i + 1; j < gruppen.length; j++) {
        const nah = gruppen[i].some((a) => gruppen[j].some((b) => distanzM(a, b) <= GRUPPEN_ABSTAND_M));
        if (nah) {
          gruppen[i] = gruppen[i].concat(gruppen[j]);
          gruppen.splice(j, 1);
          veraendert = true;
          break;
        }
      }
      if (veraendert) break;
    }
  }
  return gruppen;
}

// Rechteck-Grenzen einer Gruppe (Bounding-Box). Bei nur einem Punkt einen
// kleinen festen Kasten drumlegen.
function gruppenRechteck(gruppe) {
  const lats = gruppe.map((p) => p.lat);
  const lngs = gruppe.map((p) => p.lng);
  let sued = Math.min(...lats);
  let nord = Math.max(...lats);
  let west = Math.min(...lngs);
  let ost = Math.max(...lngs);

  if (gruppe.length === 1) {
    // Halbe Kantenlänge in Grad umrechnen.
    const dLat = (EINZEL_KASTEN_M / 2) / 111320;
    const dLng = (EINZEL_KASTEN_M / 2) / (111320 * Math.cos(sued * Math.PI / 180));
    sued -= dLat; nord += dLat; west -= dLng; ost += dLng;
  }
  return [[sued, west], [nord, ost]];
}

function karteFuerContainer(container) {
  if (instanzen.has(container)) return instanzen.get(container);
  const kartenDiv = container.querySelector('.plankarte-map');
  if (!kartenDiv) return null;

  const karte = L.map(kartenDiv, { attributionControl: false }).setView(
    [KARTE_START.lat, KARTE_START.lng],
    KARTE_START.zoom
  );
  osmEbene().addTo(karte);
  const rechteckGruppe = L.layerGroup().addTo(karte);
  const eintrag = { karte, punkte: [], rechteckGruppe };
  instanzen.set(container, eintrag);
  setTimeout(() => karte.invalidateSize(), 150);
  return eintrag;
}

// Wird pro eingefügtem Foto MIT GPS aufgerufen. Fügt den Punkt hinzu und
// zeichnet alle Gruppen-Rechtecke neu.
export function fotoPinHinzufuegen(container, lat, lng /*, nummer (ungenutzt) */) {
  const eintrag = karteFuerContainer(container);
  if (!eintrag) return;

  eintrag.punkte.push({ lat, lng });

  // Rechtecke neu zeichnen.
  eintrag.rechteckGruppe.clearLayers();
  const gruppen = gruppieren(eintrag.punkte);
  const alleGrenzen = [];
  gruppen.forEach((g) => {
    const grenzen = gruppenRechteck(g);
    L.rectangle(grenzen, { color: '#1f6fd6', weight: 2, fillColor: '#1f6fd6', fillOpacity: 0.15 })
      .addTo(eintrag.rechteckGruppe);
    alleGrenzen.push(grenzen[0], grenzen[1]);
  });

  // Kartenausschnitt an alle Rechtecke anpassen.
  if (alleGrenzen.length) {
    eintrag.karte.fitBounds(L.latLngBounds(alleGrenzen), { padding: [25, 25], maxZoom: 17 });
  }
  setTimeout(() => eintrag.karte.invalidateSize(), 100);
}