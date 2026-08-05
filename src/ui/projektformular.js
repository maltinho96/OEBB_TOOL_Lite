// Projektformular: Anlegen/Bearbeiten mit Kartennadel, Ordner-Verknüpfung,
// Scannen, Löschen, Statuswechsel. Nutzt domain/projekt.js für die DB-
// Logik, ui/karte.js für die Leaflet-Helfer, ui/team.js und
// ui/shapefiles.js für die jeweiligen Formularabschnitte.
//
// projektScannenUndSpeichern, projektStatusSetzen und
// projektLoeschenMitBestaetigung sind exportiert, weil ui/dashboard.js
// (Tabellen-Aktionen) und ui/stundentabelle.js (🔍 Scannen-Knopf) sie
// wiederverwenden.

import L from 'leaflet';
import { statusText } from '../core/util.js';
import { KARTE_START } from '../config/konstanten.js';
import { grundordnerHolen, waehleProjektordner, projektOrdnerHolen } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { nadelIcon, osmEbene } from './karte.js';
import { teamAnzeigen } from './team.js';
import { flaechenLayerInit, flaechenLeeren, flaechenLaden, flaechenAktuelle } from './shapefiles.js';
import {
  projektSchreiben,
  projektLoeschen as projektAusDbLoeschen,
  neueProjektId,
  projektScannen as projektOrdnerScannen,
  eintraegeZusammenfuehren,
} from '../domain/projekt.js';

// Wird von ui/dashboard.js gesetzt: nach jeder Datenänderung hier soll
// die Tabelle/die Kacheln neu gezeichnet werden. Vermeidet einen
// Rück-Import von dashboard.js hierher (keine Zirkularität).
let aufAenderung = () => {};
export function setAufAenderung(fn) {
  aufAenderung = fn;
}

// ---------- Kartennadel ----------

let npKarte = null;
let npMarker = null;
let npLat = null;
let npLng = null;
let bearbeitePid = null;

function npKarteInit() {
  if (npKarte) { setTimeout(() => npKarte.invalidateSize(), 120); return; }
  npKarte = L.map('npKarte').setView([KARTE_START.lat, KARTE_START.lng], 9);
  osmEbene().addTo(npKarte);
  flaechenLayerInit(npKarte);
  npKarte.on('click', (ev) => nadelSetzen(ev.latlng.lat, ev.latlng.lng));
  setTimeout(() => npKarte.invalidateSize(), 120);
}

function nadelSetzen(lat, lng) {
  npLat = Math.round(lat * 1e5) / 1e5;
  npLng = Math.round(lng * 1e5) / 1e5;
  if (npMarker) npMarker.setLatLng([npLat, npLng]);
  else npMarker = L.marker([npLat, npLng], { icon: nadelIcon() }).addTo(npKarte);
  document.getElementById('npKoord').textContent = '📍 ' + npLat + ', ' + npLng;
}

function nadelEntfernen() {
  if (npMarker) { npKarte.removeLayer(npMarker); npMarker = null; }
  npLat = npLng = null;
  document.getElementById('npKoord').textContent = 'Noch keine Nadel gesetzt – auf die Karte klicken.';
}

// ---------- Formular öffnen/schließen/leeren ----------

function formularLeeren() {
  ['npName', 'npNummer', 'npOrt', 'npAuftraggeber', 'npLandkreis', 'npAktenzeichen', 'npNotizen'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  document.getElementById('npStatus').value = 'aktuell';
  teamAnzeigen();
  nadelEntfernen();
  flaechenLeeren();
  bearbeitePid = null;
  document.getElementById('npKnopfText').innerHTML = '＋ Anlegen &amp; Protokollordner wählen';
  const na = document.getElementById('npAbbrechen');
  if (na) na.style.display = '';
  const t = document.getElementById('npTitel');
  if (t) t.textContent = 'Neues Projekt anlegen';
}

function projektFormularOeffnen() {
  const d = document.getElementById('npDetails');
  d.style.display = '';
  npKarteInit();
  d.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function projektFormularSchliessen() {
  document.getElementById('npDetails').style.display = 'none';
}

function bearbeitenAbbrechen() {
  formularLeeren();
  projektFormularSchliessen();
}

export function projektBearbeiten(pid) {
  const db = dbHolen();
  if (!db || !db.projekte[pid]) return;
  const p = db.projekte[pid];
  projektFormularOeffnen();
  document.getElementById('npName').value = p.name || '';
  document.getElementById('npNummer').value = p.projektnummer || '';
  document.getElementById('npOrt').value = p.ort || '';
  document.getElementById('npStatus').value = p.status || 'aktuell';
  teamAnzeigen(p.hauptverantwortlich || '', p.zweitverantwortlich || '');
  const i = p.infos || {};
  document.getElementById('npAuftraggeber').value = i.auftraggeber || '';
  document.getElementById('npLandkreis').value = i.landkreis || '';
  document.getElementById('npAktenzeichen').value = i.aktenzeichen || '';
  document.getElementById('npNotizen').value = i.notizen || '';
  if (p.lat != null && p.lng != null) { nadelSetzen(p.lat, p.lng); npKarte.setView([p.lat, p.lng], 12); }
  else nadelEntfernen();
  flaechenLaden(p.flaechen);
  bearbeitePid = pid;
  document.getElementById('npKnopfText').textContent = '💾 Änderungen speichern';
  const t2 = document.getElementById('npTitel');
  if (t2) t2.textContent = 'Projekt bearbeiten';
  document.getElementById('npAbbrechen').style.display = '';
}

// ---------- Anlegen / Ordner verknüpfen / Löschen / Scannen / Status ----------

async function projektAnlegen() {
  const name = document.getElementById('npName').value.trim();
  const nummer = document.getElementById('npNummer').value.trim();
  if (!name && !nummer) { alert('Bitte mindestens Projektname oder Projektnummer angeben.'); return; }

  const daten = {
    name,
    projektnummer: nummer,
    ort: document.getElementById('npOrt').value.trim(),
    status: document.getElementById('npStatus').value,
    hauptverantwortlich: document.getElementById('npHauptverantwortlich').value,
    zweitverantwortlich: document.getElementById('npZweitverantwortlich').value,
    lat: npLat,
    lng: npLng,
    flaechen: flaechenAktuelle(),
    infos: {
      auftraggeber: document.getElementById('npAuftraggeber').value.trim(),
      landkreis: document.getElementById('npLandkreis').value.trim(),
      aktenzeichen: document.getElementById('npAktenzeichen').value.trim(),
      notizen: document.getElementById('npNotizen').value.trim(),
    },
  };
  const neuId = bearbeitePid || neueProjektId();
  const warBearbeitung = !!bearbeitePid;

  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbAendern(ordner, (db) => {
    projektSchreiben(db, neuId, daten, warBearbeitung);
  });
  dbSetzen(db);
  aufAenderung(db);

  formularLeeren();
  projektFormularSchliessen();
  if (!warBearbeitung) await projektOrdnerVerknuepfen(neuId, true);
}

export async function projektOrdnerVerknuepfen(id, danachScannen) {
  const h = await waehleProjektordner(id);
  if (!h) return;
  statusText('Protokollordner verknüpft: ' + h.name);
  if (danachScannen) await projektScannenUndSpeichern(id);
}

export async function projektStatusSetzen(id, neuerStatus) {
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    if (db.projekte[id]) db.projekte[id].status = neuerStatus;
  });
  dbSetzen(db);
  aufAenderung(db);
}

export async function projektLoeschenMitBestaetigung(id) {
  const db0 = dbHolen();
  const p = db0 && db0.projekte[id];
  if (!p) return;
  if (!confirm('Projekt „' + (p.name || p.projektnummer) + '“ mit ' + Object.keys(p.eintraege).length +
    ' Einträgen aus der Datenbank löschen?\n(Die Protokoll-Dateien selbst bleiben unberührt.)')) return;

  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    projektAusDbLoeschen(db, id);
  });
  dbSetzen(db);
  aufAenderung(db);
}

export async function projektScannenUndSpeichern(id) {
  const ordner = await projektOrdnerHolen(id, true);
  if (!ordner) { await projektOrdnerVerknuepfen(id, true); return; }
  statusText('Scanne …');
  const { neu, gefunden, geprueft } = await projektOrdnerScannen(ordner);

  const grundOrdner = await grundordnerHolen(true);
  if (!grundOrdner) return;
  const db = await dbAendern(grundOrdner, (db) => {
    const p = db.projekte[id];
    if (!p) return;
    eintraegeZusammenfuehren(p, neu);
  });
  dbSetzen(db);
  aufAenderung(db);
  statusText(geprueft + ' HTML-Dateien geprüft, ' + gefunden + ' Protokolle im Projekt.');
}

// ---------- Initialisierung ----------

// Verdrahtet ausschließlich die formular-internen Knöpfe. Die Zeilen-
// Aktionen der Projekttabelle (Scannen/Bearbeiten/Löschen/Status-Wechsel)
// verdrahtet ui/dashboard.js selbst und ruft dafür die oben exportierten
// Funktionen auf.
export function projektformularInit(section) {
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'projekt-formular-oeffnen': projektFormularOeffnen(); break;
      case 'nadel-entfernen': nadelEntfernen(); break;
      case 'projekt-anlegen': projektAnlegen(); break;
      case 'bearbeiten-abbrechen': bearbeitenAbbrechen(); break;
    }
  });
}