// Fachdaten-Ebenen (WMS/WFS) – reine Logik ohne Oberfläche.
//
// Pro Projekt gespeichert in p.ebenen:
//   { id, name, typ: 'wms'|'wfs', url, layer, minZoom, an }
//   url   = Dienst-Adresse ohne die OGC-Standardparameter
//   layer = WMS: LAYERS (auch mehrere, durch Komma) / WFS: TYPENAMES
//   an    = in den Karten anzeigen

export const STANDARD_MINZOOM = 15;

// Parameter, die wir selbst setzen – aus eingefügten Links entfernen.
const OGC_PARAMETER = ['service', 'request', 'version', 'layers', 'layer', 'typename', 'typenames', 'bbox',
  'width', 'height', 'srs', 'crs', 'srsname', 'format', 'styles', 'transparent', 'outputformat', 'count',
  'maxfeatures', 'exceptions', 'format_options', 'tiled', 'startindex'];

export function ebenenListe(p) {
  return p && Array.isArray(p.ebenen) ? p.ebenen : [];
}

// Eingefügten Link zerlegen (GetCapabilities-, GetMap- oder GetFeature-Link
// oder nur die Dienst-Adresse). Gibt { typ, url, layer } oder { fehler }.
export function dienstAusLink(text) {
  let u;
  try {
    u = new URL(String(text || '').trim());
  } catch {
    return { fehler: 'Das ist kein gültiger Link (er muss mit https:// beginnen).' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { fehler: 'Nur http(s)-Links sind möglich.' };
  const p = {};
  u.searchParams.forEach((v, k) => { p[k.toLowerCase()] = v; });
  let typ = (p.service || '').toLowerCase();
  if (typ !== 'wms' && typ !== 'wfs') {
    const s = (u.pathname + u.search).toLowerCase();
    typ = /wfs/.test(s) ? 'wfs' : /wms/.test(s) ? 'wms' : '';
  }
  if (p.request && /getfeature/i.test(p.request)) typ = 'wfs';
  if (p.request && /getmap/i.test(p.request)) typ = 'wms';
  const layer = typ === 'wfs' ? (p.typenames || p.typename || '') : (p.layers || p.layer || '');

  [...u.searchParams.keys()].forEach((k) => { if (OGC_PARAMETER.includes(k.toLowerCase())) u.searchParams.delete(k); });
  // Ein http-Dienst würde auf der https-Seite blockiert – direkt auf https
  // umstellen (außer bei einem Dienst auf dem eigenen Rechner).
  if (u.protocol === 'http:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) u.protocol = 'https:';
  return { typ, url: u.toString().replace(/\?$/, ''), layer };
}

function mitParametern(url, params) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export function capabilitiesUrl(e) {
  return mitParametern(e.url, { SERVICE: e.typ.toUpperCase(), REQUEST: 'GetCapabilities' });
}

// Ebenen aus einem GetCapabilities-Dokument (XML-Text) lesen.
// WMS: <Layer><Name>, WFS: <FeatureType><Name> – jeweils mit <Title>.
export function ebenenAusCapabilities(xmlText, typ, parser) {
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const knoten = typ === 'wfs' ? 'FeatureType' : 'Layer';
  const liste = [];
  Array.from(doc.getElementsByTagNameNS('*', knoten)).forEach((n) => {
    const kind = (name) => Array.from(n.children).find((c) => c.localName === name);
    const name = kind('Name');
    if (!name || !name.textContent.trim()) return;
    const titel = kind('Title');
    liste.push({ name: name.textContent.trim(), titel: titel ? titel.textContent.trim() : '' });
  });
  return liste;
}

// GetFeature-Anfrage für einen Kartenausschnitt (WGS84). Achsenfolge bei
// EPSG:4326 im WFS 2.0 ist Breite,Länge – deshalb die URN-Schreibweise.
export function getFeatureUrl(e, grenzen, format) {
  return mitParametern(e.url, {
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: e.layer,
    TYPENAME: e.layer,
    OUTPUTFORMAT: format,
    SRSNAME: 'urn:ogc:def:crs:EPSG::4326',
    BBOX: [grenzen.sued, grenzen.west, grenzen.nord, grenzen.ost].join(',') + ',urn:ogc:def:crs:EPSG::4326',
    COUNT: '2000',
  });
}

// Ausgabeformate, die WFS-Server für GeoJSON üblicherweise verstehen.
export const GEOJSON_FORMATE = ['application/json', 'application/geo+json', 'json', 'geojson'];

// GeoJSON mit evtl. vertauschten Achsen (manche Server liefern Breite,Länge)
// korrigieren: Liegt die erste Koordinate offensichtlich als (lat, lng) vor
// (Deutschland: lat 47–55, lng 5–15), werden alle Paare getauscht.
export function achsenPruefen(geojson) {
  let erste = null;
  const finde = (c) => { if (erste) return; if (typeof c[0] === 'number') erste = c; else c.forEach(finde); };
  (geojson.features || []).some((f) => { if (f.geometry && f.geometry.coordinates) finde(f.geometry.coordinates); return erste; });
  if (!erste || !(erste[0] > 40 && erste[1] < 20)) return geojson;
  const tausche = (c) => (typeof c[0] === 'number' ? [c[1], c[0]] : c.map(tausche));
  (geojson.features || []).forEach((f) => { if (f.geometry && f.geometry.coordinates) f.geometry.coordinates = tausche(f.geometry.coordinates); });
  return geojson;
}
