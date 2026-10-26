// Fachdaten-Ebenen (WMS/WFS) auf Leaflet-Karten zeigen.
//
// fachebenenAnwenden(karte, ebenen) setzt die eingeschalteten Ebenen eines
// Projekts auf eine Karte (vorherige werden entfernt). Jede Ebene erscheint
// erst ab ihrer Zoomstufe (minZoom), damit die Dienste nicht riesige
// Ausschnitte laden müssen.
//  - WMS: fertige Bildkacheln vom Dienst (L.tileLayer.wms).
//  - WFS: Objekte als GeoJSON für den sichtbaren Ausschnitt nachladen.
//
// Druck: Damit ui/kartenbild.js die WMS-Bilder ins Druckbild zeichnen darf,
// werden sie zuerst mit CORS-Freigabe angefragt. Erlaubt der Dienst das
// nicht, lädt die Ebene ohne – die Karte wird dann "live" gedruckt.

import L from 'leaflet';
import { getFeatureUrl, GEOJSON_FORMATE, achsenPruefen, WFS_SEITE, WFS_HOECHSTENS } from '../domain/fachebenen.js';
import { druckbildPlanen } from './kartenbild.js';

const FARBEN = ['#7b2cbf', '#e76f00', '#00897b', '#c2185b', '#5d4037', '#1565c0'];
const ohneCors = new Set();            // WMS-Adressen ohne CORS-Freigabe
const wfsFormat = new Map();           // WFS-Adresse -> funktionierendes Ausgabeformat
const zustand = new WeakMap();         // karte -> { gruppe, ebenen }
const meldungen = new Map();           // ebene.id -> letzte Fehlermeldung

export function ebenenMeldung(id) {
  return meldungen.get(id) || '';
}

function melden(id, text) {
  if ((meldungen.get(id) || '') === (text || '')) return; // nichts Neues
  if (text) meldungen.set(id, text); else meldungen.delete(id);
  document.dispatchEvent(new CustomEvent('fachebenen-meldung', { detail: { id, text } }));
}

function wmsEbene(karte, e) {
  const optionen = {
    layers: e.layer,
    format: 'image/png',
    transparent: true,
    minZoom: e.minZoom,
    maxZoom: 19,
    opacity: 0.85,
    attribution: e.name,
  };
  if (!ohneCors.has(e.url)) optionen.crossOrigin = 'anonymous';
  const ebene = L.tileLayer.wms(e.url, optionen);
  let fehler = 0;
  ebene.on('tileerror', () => {
    fehler++;
    if (fehler !== 3) return;
    if (!ohneCors.has(e.url)) {
      // Mehrere Kacheln mit CORS gescheitert -> ohne Freigabe neu laden.
      ohneCors.add(e.url);
      const z = zustand.get(karte);
      if (z) fachebenenAnwenden(karte, z.ebenen);
    } else {
      melden(e.id, 'Kacheln konnten nicht geladen werden – Link oder Ebenenname prüfen.');
    }
  });
  ebene.on('load', () => { if (fehler < 3) melden(e.id, ''); druckbildPlanen(karte); });
  return ebene;
}

function wfsEbene(karte, e, farbe) {
  // Canvas statt SVG: zeichnet auch zehntausende Objekte (z. B. Baumkataster)
  // flüssig. ui/kartenbild.js übernimmt das Canvas ins Druckbild.
  const renderer = L.canvas({ padding: 0.2 });
  const gruppe = L.geoJSON(null, {
    renderer,
    style: { color: farbe, weight: 2, fillColor: farbe, fillOpacity: 0.12 },
    pointToLayer: (_, ll) => L.circleMarker(ll, { renderer, radius: 4, color: farbe, weight: 1.5, fillOpacity: 0.45 }),
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const text = Object.keys(p).slice(0, 6).map((k) => k + ': ' + p[k]).join('\n');
      if (text) l.bindTooltip(text.replace(/[<>&]/g, ''), { sticky: true });
    },
  });
  let anfrage = 0;
  let timer = null;

  async function laden() {
    if (!karte._loaded || karte.getZoom() < e.minZoom) { gruppe.clearLayers(); return; }
    const b = karte.getBounds();
    const grenzen = { sued: b.getSouth(), west: b.getWest(), nord: b.getNorth(), ost: b.getEast() };
    const nr = ++anfrage;
    const formate = wfsFormat.has(e.url) ? [wfsFormat.get(e.url)] : GEOJSON_FORMATE;
    let letzterFehler = '';
    for (const format of formate) {
      try {
        // Seitenweise laden, bis alles im Ausschnitt da ist (höchstens WFS_HOECHSTENS).
        let start = 0;
        let ersteId = null;
        for (;;) {
          const antwort = await fetch(getFeatureUrl(e, grenzen, format, start));
          const text = await antwort.text();
          if (nr !== anfrage) return; // inzwischen neuer Ausschnitt
          const daten = JSON.parse(text);
          if (!daten || !Array.isArray(daten.features)) throw new Error('kein GeoJSON');
          wfsFormat.set(e.url, format);
          const n = daten.features.length;
          // Dienst ignoriert das Blättern (liefert dieselbe Seite)? Dann abbrechen.
          const id = n ? JSON.stringify(daten.features[0].id || daten.features[0].geometry) : null;
          if (start > 0 && id === ersteId) break;
          if (start === 0) { gruppe.clearLayers(); ersteId = id; }
          gruppe.addData(achsenPruefen(daten));
          start += n;
          if (n < WFS_SEITE || start >= WFS_HOECHSTENS) break;
        }
        melden(e.id, start >= WFS_HOECHSTENS
          ? 'Sehr viele Objekte – im Ausschnitt werden höchstens ' + WFS_HOECHSTENS.toLocaleString('de-DE') + ' gezeigt. Weiter hineinzoomen.'
          : '');
        druckbildPlanen(karte);
        return;
      } catch (err) {
        letzterFehler = err instanceof TypeError
          ? 'Der Dienst erlaubt keinen Zugriff von dieser Seite (CORS) oder ist nicht erreichbar.'
          : 'Der Dienst liefert kein GeoJSON (nur GML) – als WMS-Link versuchen.';
      }
    }
    if (nr === anfrage) melden(e.id, letzterFehler);
  }
  const planen = () => { clearTimeout(timer); timer = setTimeout(laden, 350); };
  gruppe.on('add', () => { karte.on('moveend', planen); planen(); });
  gruppe.on('remove', () => { karte.off('moveend', planen); clearTimeout(timer); });
  return gruppe;
}

// Ebenen (Liste aus p.ebenen) auf die Karte setzen; nur eingeschaltete.
export function fachebenenAnwenden(karte, ebenen) {
  let z = zustand.get(karte);
  if (!z) {
    z = { gruppe: L.layerGroup().addTo(karte), ebenen: [] };
    zustand.set(karte, z);
  }
  // Unverändert? Dann nichts neu laden (sonst flackert es bei jedem Foto).
  const schluessel = JSON.stringify((ebenen || []).filter((e) => e.an)) + '|' + [...ohneCors].join(',');
  if (z.schluessel === schluessel) return;
  z.schluessel = schluessel;
  z.gruppe.clearLayers();
  z.ebenen = ebenen || [];
  z.ebenen.forEach((e, i) => {
    if (!e.an || !e.url || !e.layer) return;
    const layer = e.typ === 'wfs' ? wfsEbene(karte, e, FARBEN[i % FARBEN.length]) : wmsEbene(karte, e);
    layer.addTo(z.gruppe);
  });
}

export function ebenenFarbe(i) {
  return FARBEN[i % FARBEN.length];
}
