// Übersichtsplan-Karte: liest die GPS-Koordinaten der aktuell im Protokoll
// vorhandenen Fotos (als data-lat/data-lng an den <img>, gesetzt in
// ui/fotos.js) und zeichnet je Foto-Gruppe ein nummeriertes blaues Rechteck
// auf eine OSM-Karte.
//
// Wichtig: Die Karte wird bei JEDER Änderung komplett neu aus dem aktuellen
// DOM-Zustand aufgebaut (karteAktualisieren). Dadurch stimmt sie immer –
// auch nach dem Löschen eines Fotos, im Gegensatz zum früheren Ansatz, der
// Punkte nur angehäuft hat.
//
// Gruppierung per Ketten-Clustering: ein Foto gehört zu einer Gruppe, wenn
// es höchstens GRUPPEN_ABSTAND_M von IRGENDEINEM Foto der Gruppe entfernt
// ist. Weiter entfernte Fotos bilden eigene Rechtecke. Ein Einzelfoto
// bekommt einen kleinen festen Kasten.

import L from 'leaflet';
import { KARTE_START } from '../config/konstanten.js';
import { osmEbene } from './karte.js';

const GRUPPEN_ABSTAND_M = 50;   // ab hier neue Gruppe
const MIN_KASTEN_M = 45;        // Mindest-Kantenlänge eines Rechtecks
                                // (auch bei Einzelfoto oder dicht
                                //  beieinanderliegenden Fotos)

const instanzen = new Map(); // container -> { karte, rechteckGruppe }

function distanzM(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * R;
}

function gruppieren(punkte) {
  const gruppen = punkte.map((p) => [p]);
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

function gruppenRechteck(gruppe) {
  const lats = gruppe.map((p) => p.lat);
  const lngs = gruppe.map((p) => p.lng);
  let sued = Math.min(...lats);
  let nord = Math.max(...lats);
  let west = Math.min(...lngs);
  let ost = Math.max(...lngs);

  // Mindestgröße erzwingen: Ist die tatsächliche Ausdehnung der Gruppe
  // kleiner als MIN_KASTEN_M (Einzelfoto oder mehrere dicht beieinander),
  // den Kasten um seinen Mittelpunkt auf die Mindestgröße aufblasen –
  // sonst schrumpft das Rechteck zu einem unbrauchbaren dünnen Strich.
  const mitteLat = (sued + nord) / 2;
  const mitteLng = (west + ost) / 2;
  const halbLat = (MIN_KASTEN_M / 2) / 111320;
  const halbLng = (MIN_KASTEN_M / 2) / (111320 * Math.cos(mitteLat * Math.PI / 180));

  if ((nord - sued) < 2 * halbLat) { sued = mitteLat - halbLat; nord = mitteLat + halbLat; }
  if ((ost - west) < 2 * halbLng) { west = mitteLng - halbLng; ost = mitteLng + halbLng; }

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
  const eintrag = { karte, rechteckGruppe };
  instanzen.set(container, eintrag);
  setTimeout(() => karte.invalidateSize(), 150);
  return eintrag;
}

// Liest alle aktuell vorhandenen Foto-Koordinaten aus dem DOM (data-lat/
// data-lng an den <img> in .abb-bilder).
function punkteAusDom(container) {
  const punkte = [];
  container.querySelectorAll('.abb-bilder img[data-lat][data-lng]').forEach((img) => {
    const lat = parseFloat(img.dataset.lat);
    const lng = parseFloat(img.dataset.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) punkte.push({ lat, lng });
  });
  return punkte;
}

// Baut die Karte des Containers komplett neu aus dem aktuellen DOM-Zustand.
// Aufzurufen nach jedem Einfügen UND Löschen von Fotos.
export function karteAktualisieren(container) {
  const eintrag = karteFuerContainer(container);
  if (!eintrag) return;

  eintrag.rechteckGruppe.clearLayers();

  const punkte = punkteAusDom(container);
  const wrapper = container.querySelector('.plankarte');
  // Ohne verortete Fotos: Karte bleibt auf Startansicht, keine Rechtecke.
  if (!punkte.length) {
    eintrag.karte.setView([KARTE_START.lat, KARTE_START.lng], KARTE_START.zoom);
    setTimeout(() => eintrag.karte.invalidateSize(), 100);
    return;
  }

  let gruppen = gruppieren(punkte).sort((a, b) => {
    const nordA = Math.max(...a.map((p) => p.lat));
    const nordB = Math.max(...b.map((p) => p.lat));
    return nordB - nordA;
  });

  const alleGrenzen = [];
  gruppen.forEach((g, i) => {
    const grenzen = gruppenRechteck(g);
    L.rectangle(grenzen, { color: '#1f6fd6', weight: 2, fillColor: '#1f6fd6', fillOpacity: 0.15 })
      .addTo(eintrag.rechteckGruppe);

    // Nummer in die MITTE des Rechtecks (reine Ziffer mit weißem Buffer,
    // Styling in grundlagen.css .bereich-nummer).
    const mitteLat = (grenzen[0][0] + grenzen[1][0]) / 2;
    const mitteLng = (grenzen[0][1] + grenzen[1][1]) / 2;
    L.marker([mitteLat, mitteLng], {
      icon: L.divIcon({
        className: 'bereich-nummer',
        html: String(i + 1),
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      interactive: false,
    }).addTo(eintrag.rechteckGruppe);

    alleGrenzen.push(grenzen[0], grenzen[1]);
  });

  if (alleGrenzen.length) {
    eintrag.karte.fitBounds(L.latLngBounds(alleGrenzen), { padding: [30, 30], maxZoom: 17 });
  }
  setTimeout(() => eintrag.karte.invalidateSize(), 100);
}