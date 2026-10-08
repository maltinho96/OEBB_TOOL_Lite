// Liest GPS-Koordinaten aus den EXIF-Daten einer Bilddatei – MUSS auf der
// Original-Datei laufen, BEVOR sie in core/bilder.js per Canvas verkleinert
// wird (dabei gehen alle EXIF-Daten inkl. GPS verloren, was fuer den
// Datenschutz gewollt ist: die gespeicherte/exportierte Bilddatei bleibt
// GPS-frei, nur der Kartenpin nutzt die hier ausgelesene Koordinate).
//
// Fotos ohne GPS (z. B. Kamera ohne GPS-Modul, bereits gestrippte Bilder)
// liefern null zurueck – der Aufrufer setzt dann einfach keinen Pin.

import exifr from 'exifr';

// Gibt {lat, lng} zurueck oder null, wenn keine (gueltigen) GPS-Daten da sind.
export async function gpsAusDatei(file) {
  try {
    const daten = await exifr.gps(file);
    if (daten && typeof daten.latitude === 'number' && typeof daten.longitude === 'number') {
      // Auf 5 Nachkommastellen runden (ca. 1 m Genauigkeit) – mehr braucht
      // die Kartenanzeige nicht, und es haelt die gespeicherten Zahlen kurz.
      return {
        lat: Math.round(daten.latitude * 1e5) / 1e5,
        lng: Math.round(daten.longitude * 1e5) / 1e5,
      };
    }
  } catch {
    // Kein EXIF / Parser-Fehler / kein GPS – alles unkritisch.
  }
  return null;
}
