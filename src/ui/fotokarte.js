// Kleine Karte ueber der Fotodokumentation: zeigt je einen Pin fuer jedes
// eingefuegte Foto, das GPS-Daten hatte (ausgelesen in core/exif.js, bevor
// das Bild verkleinert wurde). Ein Pin pro Foto. Fotos ohne GPS erzeugen
// keinen Pin. Ist gar kein verortetes Foto dabei, bleibt die Karte
// ausgeblendet und ein dezenter Hinweis steht an ihrer Stelle.
//
// Die Karte lebt im Protokoll-DOM (Container aus schema/felder.js) und wird
// beim Speichern/Drucken mit ausgegeben – dokumentiert die Aufnahmeorte.

import L from 'leaflet';
import { KARTE_START } from '../config/konstanten.js';
import { nadelIcon, osmEbene } from './karte.js';

// Pro Karten-Container (es kann je Protokoll-Reiter einen geben) eine
// eigene Leaflet-Instanz und Pin-Liste vorhalten.
const instanzen = new Map(); // container-Element -> { karte, marker: [], gruppe }

function karteFuerContainer(container) {
  if (instanzen.has(container)) return instanzen.get(container);

  const kartenDiv = container.querySelector('.fotokarte-map');
  if (!kartenDiv) return null;

  const karte = L.map(kartenDiv, { attributionControl: false }).setView(
    [KARTE_START.lat, KARTE_START.lng],
    KARTE_START.zoom
  );
  osmEbene().addTo(karte);
  const gruppe = L.layerGroup().addTo(karte);
  const eintrag = { karte, marker: [], gruppe };
  instanzen.set(container, eintrag);
  setTimeout(() => karte.invalidateSize(), 150);
  return eintrag;
}

// Einen Foto-Pin zur Karte des angegebenen Containers hinzufuegen.
// nummer = laufende Foto-/Abbildungsnummer (fuer die Pin-Beschriftung).
export function fotoPinHinzufuegen(container, lat, lng, nummer) {
  const wrapper = container.querySelector('.fotokarte');
  const hinweis = container.querySelector('.fotokarte-hinweis');
  if (wrapper) wrapper.style.display = '';
  if (hinweis) hinweis.style.display = 'none';

  const eintrag = karteFuerContainer(container);
  if (!eintrag) return;

  const m = L.marker([lat, lng], { icon: nadelIcon() });
  if (nummer != null) m.bindTooltip('Foto ' + nummer, { permanent: false });
  m.addTo(eintrag.gruppe);
  eintrag.marker.push(m);

  // Kartenausschnitt an alle bisherigen Pins anpassen.
  const punkte = eintrag.marker.map((mk) => mk.getLatLng());
  if (punkte.length === 1) {
    eintrag.karte.setView(punkte[0], 16);
  } else {
    eintrag.karte.fitBounds(L.latLngBounds(punkte), { padding: [25, 25], maxZoom: 17 });
  }
  setTimeout(() => eintrag.karte.invalidateSize(), 100);
}