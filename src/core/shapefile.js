// Liest gezippte Shapefiles (.zip mit .shp/.dbf/.prj) ein und wandelt sie
// in GeoJSON um. shpjs arbeitet rein im Browser (kein Server noetig) –
// passt zur Offline-/FOSS-Architektur der App.

import shp from 'shpjs';

// Eine oder mehrere .zip-Dateien einlesen. Gibt eine Liste von
// {name, geojson} zurueck (name = Dateiname ohne .zip, als Anzeigename
// fuer den Layer). Wirft einen Fehler mit Dateinamen, falls keine .zip.
export async function shapefilesEinlesen(files) {
  const ergebnisse = [];
  for (const file of Array.from(files)) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new Error(`${file.name}: bitte als .zip (shp+dbf+prj gezippt) hochladen.`);
    }
    const buffer = await file.arrayBuffer();
    const geojson = await shp(buffer);
    ergebnisse.push({
      name: file.name.replace(/\.zip$/i, ''),
      geojson,
    });
  }
  return ergebnisse;
}