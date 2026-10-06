// Liest Shapefiles ein und wandelt sie in GeoJSON (WGS84) um. shpjs
// arbeitet rein im Browser (kein Server noetig) – passt zur Offline-/FOSS-
// Architektur der App.
//
// Zwei Wege werden unterstuetzt:
//   1. Einzelne Dateien: .shp (+ .dbf, .prj, .cpg) zusammen auswaehlen.
//      Dateien mit gleichem Namen gehoeren zu einem Layer. Die .prj ist
//      noetig, sobald die Daten nicht in Laengen-/Breitengrad vorliegen
//      (z. B. ETRS89/UTM33 bei Behoerdendaten) – shpjs rechnet dann um.
//   2. Weiterhin moeglich: eine .zip mit diesen Dateien.

import shp from 'shpjs';

const ERLAUBT = ['shp', 'dbf', 'prj', 'cpg', 'shx', 'zip'];

function endung(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function basisname(name) {
  return name.replace(/\.[^.]+$/, '');
}

// Prueft stichprobenartig, ob die Koordinaten im Laengen-/Breitengrad-
// Bereich liegen. Wenn nicht, fehlte vermutlich die .prj (Daten sind dann
// noch in Metern, z. B. UTM) – die Flaeche laege sonst irgendwo im Nirgendwo.
function koordinatenPlausibel(geojson) {
  let ok = true;
  const pruefen = (c) => {
    if (!ok || !Array.isArray(c)) return;
    if (typeof c[0] === 'number') {
      if (Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) ok = false;
    } else {
      c.forEach(pruefen);
    }
  };
  (geojson.features || []).slice(0, 5).forEach((f) => {
    if (f && f.geometry) pruefen(f.geometry.coordinates);
  });
  return ok;
}

// Liste von Dateien (aus <input type=file multiple>) einlesen. Gibt eine
// Liste von {name, geojson} zurueck. Wirft einen Fehler mit verstaendlicher
// Meldung, wenn etwas fehlt oder nicht passt.
export async function shapefilesEinlesen(files) {
  const liste = Array.from(files);
  const ergebnisse = [];

  // Unbekannte Dateitypen gleich abweisen.
  for (const f of liste) {
    if (!ERLAUBT.includes(endung(f.name))) {
      throw new Error(`${f.name}: kein Shapefile-Bestandteil (erlaubt: .shp, .dbf, .prj, .cpg, .shx oder .zip).`);
    }
  }

  // 1. Gezippte Shapefiles.
  for (const f of liste.filter((x) => endung(x.name) === 'zip')) {
    const ergebnis = await shp(await f.arrayBuffer());
    const layer = Array.isArray(ergebnis) ? ergebnis : [ergebnis];
    layer.forEach((gj) => {
      const name = gj.fileName || basisname(f.name);
      if (!koordinatenPlausibel(gj)) {
        throw new Error(`${name}: Koordinaten liegen nicht in Längen-/Breitengrad – in der .zip fehlt vermutlich die .prj.`);
      }
      ergebnisse.push({ name, geojson: gj });
    });
  }

  // 2. Einzelne Dateien nach Namen gruppieren (flaeche.shp + flaeche.dbf ...).
  const gruppen = new Map();
  for (const f of liste) {
    const e = endung(f.name);
    if (e === 'zip') continue;
    const b = basisname(f.name);
    if (!gruppen.has(b)) gruppen.set(b, {});
    gruppen.get(b)[e] = f;
  }

  for (const [name, g] of gruppen) {
    if (!g.shp) {
      throw new Error(`${name}: die .shp-Datei fehlt. Bitte .shp, .dbf und .prj gemeinsam auswählen.`);
    }
    const prj = g.prj ? await g.prj.text() : undefined;
    const cpg = g.cpg ? (await g.cpg.text()).trim() : undefined;
    const geometrien = shp.parseShp(await g.shp.arrayBuffer(), prj);
    const attribute = g.dbf ? shp.parseDbf(await g.dbf.arrayBuffer(), cpg) : undefined;
    const geojson = shp.combine([geometrien, attribute]);
    if (!koordinatenPlausibel(geojson)) {
      throw new Error(`${name}: Koordinaten liegen nicht in Längen-/Breitengrad. Bitte die .prj-Datei mit auswählen.`);
    }
    ergebnisse.push({ name, geojson });
  }

  if (!ergebnisse.length) throw new Error('Keine .shp-Datei ausgewählt.');
  return ergebnisse;
}
