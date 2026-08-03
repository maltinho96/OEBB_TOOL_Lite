// Projektkarte (tab-karte): Übersichtskarte mit einer Nadel je Projekt.
// Enthält auch die gemeinsamen Leaflet-Helfer (Nadel-Icon, OSM-Kachelebene),
// die spaeter ui/projektformular.js für die Nadel-Platzierung beim Anlegen/
// Bearbeiten eines Projekts wiederverwendet. Originalgetreu portiert.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KARTE_START } from '../config/konstanten.js';
import { esc } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbLesen } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { logo } from '../schema/felder.js';

// ---------- gemeinsame Leaflet-Helfer ----------

// 📍-Nadel als DivIcon (statt Marker-PNG).
export function nadelIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="oebb-nadel">📍</div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

// OpenStreetMap-Kachelebene.
export function osmEbene() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap-Mitwirkende',
  });
}

// ---------- Projektkarte (tab-karte) ----------

// HTML des Karten-Reiters. logo() wie bei den Protokoll-Templates.
function karteTabHtml() {
  return `
${logo()}
<h1>Projektkarte</h1>
<p class="kein-druck">
  <button class="ordner-knopf" data-aktion="karte-aktualisieren">🔄 Aktualisieren</button>
  <span id="karteStatus" style="margin-left:10px; color:#555;"></span>
</p>
<div class="karte" id="projektKarte" style="height:520px"></div>
<p style="font-size:11.5px; color:#777;">Nadeln setzt du beim Anlegen oder Bearbeiten (✎) eines Projekts in der Übersicht.
Klick auf eine Nadel zeigt Projektdetails.</p>
`;
}

let projektKarte = null;

// Zeichnet alle Projekt-Nadeln aus der zuletzt geladenen DB neu.
function projektKarteZeigen() {
  if (!projektKarte) return;
  projektKarte.eachLayer((l) => {
    if (l instanceof L.Marker) projektKarte.removeLayer(l);
  });
  const db = dbHolen();
  if (!db) return;

  const punkte = [];
  Object.keys(db.projekte).forEach((pid) => {
    const p = db.projekte[pid];
    if (p.lat != null && p.lng != null) {
      const m = L.marker([p.lat, p.lng], { icon: nadelIcon() }).addTo(projektKarte);
      const anzahl = Object.keys(p.eintraege || {}).length;
      m.bindPopup(
        '<b>' + esc(p.name || '') + '</b><br>' + esc(p.projektnummer || '') +
        (p.ort ? '<br>' + esc(p.ort) : '') + '<br>' + anzahl + ' Protokolle' +
        (p.infos && p.infos.auftraggeber ? '<br>AG: ' + esc(p.infos.auftraggeber) : '')
      );
      punkte.push([p.lat, p.lng]);
    }
  });
  if (punkte.length) projektKarte.fitBounds(punkte, { padding: [40, 40], maxZoom: 12 });
}

// Karte anzeigen/aktualisieren: Grundordner + DB lesen, Nadeln neu zeichnen.
// interaktiv=true fragt bei Bedarf aktiv nach Ordnerfreigabe (Klick auf
// "Aktualisieren"); interaktiv=false versucht es nur still (Reiterwechsel).
async function karteTabAnzeigen(interaktiv) {
  const status = document.getElementById('karteStatus');
  if (!projektKarte) {
    projektKarte = L.map('projektKarte').setView([KARTE_START.lat, KARTE_START.lng], 8);
    osmEbene().addTo(projektKarte);
  }
  setTimeout(() => projektKarte.invalidateSize(), 120);

  const ordner = await grundordnerHolen(interaktiv);
  if (!ordner) {
    if (status) status.textContent = 'Grundordner noch nicht freigegeben – „Aktualisieren“ klicken.';
    return;
  }
  const db = await dbLesen(ordner);
  dbSetzen(db);
  if (status) status.textContent = Object.keys(db.projekte).length + ' Projekte geladen.';
  projektKarteZeigen();
}

// Reiter in den Mount-Punkt einhängen und den "Aktualisieren"-Knopf
// verdrahten. Einmalig von main.js nach formularInit() aufgerufen.
export function karteTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab';
  section.id = 'tab-karte';
  section.innerHTML = karteTabHtml();
  mount.appendChild(section);

  section
    .querySelector('[data-aktion="karte-aktualisieren"]')
    .addEventListener('click', () => karteTabAnzeigen(true));
}

// Wird beim Wechsel auf den Karten-Reiter aufgerufen (siehe ui/tabs.js
// tabWechselHook). interaktiv=false: laedt nur nach, wenn der Grundordner
// bereits freigegeben ist, ohne den Nutzer zu unterbrechen.
export function karteBeiAnzeigeAktualisieren(id) {
  if (id === 'tab-karte') karteTabAnzeigen(false);
}