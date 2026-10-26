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
import { esc } from '../core/util.js';

const FARBEN = ['#7b2cbf', '#e76f00', '#00897b', '#c2185b', '#5d4037', '#1565c0'];
const ohneCors = new Set();            // WMS-Adressen ohne CORS-Freigabe
const wfsFormat = new Map();           // WFS-Adresse -> funktionierendes Ausgabeformat
const zustand = new WeakMap();         // karte -> { gruppe, ebenen }
const meldungen = new Map();           // ebene.id -> letzte Fehlermeldung
const felder = new Map();              // ebene.id -> Attributnamen (für die Nummerierung)
const MAX_NUMMERN = 600;               // mehr Beschriftungen im Ausschnitt werden unleserlich

// Attributnamen der WFS-Objekte (sobald einmal geladen).
export function ebenenFelder(id) {
  return felder.get(id) || [];
}

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
  // Nummern (Wert eines gewählten Attributs) als kleine Schilder neben den
  // Objekten. Als Marker, damit ui/kartenbild.js sie mitdruckt.
  const beschriftung = L.layerGroup();
  const ebene = L.layerGroup([gruppe, beschriftung]);
  function nummernZeigen() {
    beschriftung.clearLayers();
    if (!e.nummer) return '';
    const b = karte.getBounds();
    const liste = [];
    gruppe.eachLayer((l) => {
      const p = l.feature && l.feature.properties;
      const v = p ? p[e.nummer] : null;
      if (v == null || v === '') return;
      const ll = l.getLatLng ? l.getLatLng() : l.getBounds().getCenter();
      if (b.contains(ll)) liste.push([ll, String(v).slice(0, 14)]);
    });
    if (liste.length > MAX_NUMMERN) return 'Für die Nummern weiter hineinzoomen (' + liste.length.toLocaleString('de-DE') + ' Objekte im Ausschnitt).';
    liste.forEach(([ll, t]) => {
      const breite = Math.round(8 + t.length * 6.2);
      const m = L.marker(ll, {
        icon: L.divIcon({ className: 'eb-nummer', html: esc(t), iconSize: [breite, 14], iconAnchor: [-5, 7] }),
        interactive: false,
        keyboard: false,
      });
      m.on('add', () => { const el = m.getElement(); if (el) el.style.borderColor = farbe; });
      m.addTo(beschriftung);
    });
    return '';
  }

  let anfrage = 0;
  let timer = null;

  async function laden() {
    if (!karte._loaded || karte.getZoom() < e.minZoom) { gruppe.clearLayers(); beschriftung.clearLayers(); return; }
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
          if (start === 0) {
            gruppe.clearLayers(); ersteId = id;
            const namen = n ? Object.keys(daten.features[0].properties || {}) : [];
            if (namen.length && JSON.stringify(namen) !== JSON.stringify(felder.get(e.id) || [])) {
              felder.set(e.id, namen);
              document.dispatchEvent(new CustomEvent('fachebenen-meldung', { detail: { id: e.id, felder: namen } }));
            }
          }
          gruppe.addData(achsenPruefen(daten));
          start += n;
          if (n < WFS_SEITE || start >= WFS_HOECHSTENS) break;
        }
        const hinweis = nummernZeigen();
        melden(e.id, start >= WFS_HOECHSTENS
          ? 'Sehr viele Objekte – im Ausschnitt werden höchstens ' + WFS_HOECHSTENS.toLocaleString('de-DE') + ' gezeigt. Weiter hineinzoomen.'
          : hinweis);
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
  ebene.on('add', () => { karte.on('moveend', planen); planen(); });
  ebene.on('remove', () => {
    karte.off('moveend', planen); clearTimeout(timer);
    anfrage++; // laufende Anfrage verwerfen
    // Der Canvas-Renderer bleibt sonst als leere Fläche auf der Karte liegen.
    if (karte.hasLayer(renderer)) karte.removeLayer(renderer);
  });
  return ebene;
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
    const layer = e.typ === 'wfs' ? wfsEbene(karte, e, ebenenFarbe(i, e)) : wmsEbene(karte, e);
    layer.addTo(z.gruppe);
  });
}

// Eigene Farbe der Ebene (e.farbe) oder eine aus der Standardreihe.
export function ebenenFarbe(i, e) {
  if (e && /^#[0-9a-f]{6}$/i.test(e.farbe || '')) return e.farbe;
  return FARBEN[i % FARBEN.length];
}
