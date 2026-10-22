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
import { grundordnerHolen, waehleProjektordner, projektOrdnerHolen, gespeicherterProjektordner } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { nadelIcon, osmEbene } from './karte.js';
import { teamAnzeigen } from './team.js';
import { listenFuellen, listenLesen } from './projektlisten.js';
import { flaechenLayerInit, flaechenLeeren, flaechenLaden, flaechenAktuelle } from './shapefiles.js';
import {
  projektSchreiben,
  projektLoeschen as projektAusDbLoeschen,
  neueProjektId,
  projektScannen as projektOrdnerScannen,
  eintraegeZusammenfuehren,
  aktenzeichenListe,
  hauptAktenzeichen,
  verteilerListe,
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
  ['npName', 'npNummer', 'npOrt', 'npAuftraggeber', 'npBaufirma', 'npAnsprechpartner', 'npAnsprechpartnerTelefon', 'npAnsprechpartnerEmail', 'npLandkreis', 'npNotizen', 'npStart', 'npEnde'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  document.getElementById('npStatus').value = 'aktuell';
  teamAnzeigen();
  listenFuellen([], []);
  nadelEntfernen();
  flaechenLeeren();
  bearbeitePid = null;
  document.getElementById('npKnopfText').innerHTML = '＋ Anlegen &amp; Protokollordner wählen';
  const na = document.getElementById('npAbbrechen');
  if (na) na.style.display = '';
  const t = document.getElementById('npTitel');
  if (t) t.textContent = 'Neues Projekt anlegen';
  // Beim Anlegen wird der Ordner ohnehin abgefragt – Zeile nur beim Bearbeiten.
  document.getElementById('npOrdnerZeile').style.display = 'none';
}

function projektFormularOeffnen() {
  // Neues Projekt: je eine leere Zeile in den Tabellen anbieten.
  if (!document.querySelector('#npAzZeilen tr')) listenFuellen([], []);
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
  document.getElementById('npStart').value = p.start || '';
  document.getElementById('npEnde').value = p.ende || '';
  teamAnzeigen(p.hauptverantwortlich || '', p.zweitverantwortlich || '');
  const i = p.infos || {};
  document.getElementById('npAuftraggeber').value = i.auftraggeber || '';
  document.getElementById('npAnsprechpartner').value = i.ansprechpartner || '';
  document.getElementById('npAnsprechpartnerTelefon').value = i.ansprechpartnerTelefon || '';
  document.getElementById('npAnsprechpartnerEmail').value = i.ansprechpartnerEmail || '';
  document.getElementById('npBaufirma').value = i.baufirma || '';
  document.getElementById('npLandkreis').value = i.landkreis || '';
  listenFuellen(aktenzeichenListe(p), verteilerListe(p));
  document.getElementById('npNotizen').value = i.notizen || '';
  if (p.lat != null && p.lng != null) { nadelSetzen(p.lat, p.lng); npKarte.setView([p.lat, p.lng], 12); }
  else nadelEntfernen();
  flaechenLaden(p.flaechen);
  bearbeitePid = pid;
  ordnerAnzeigen(pid);
  document.getElementById('npKnopfText').textContent = '💾 Änderungen speichern';
  const t2 = document.getElementById('npTitel');
  if (t2) t2.textContent = 'Projekt bearbeiten';
  document.getElementById('npAbbrechen').style.display = '';
}

// Zeile "Protokollordner" im Bearbeiten-Formular: Name des verknüpften Ordners.
async function ordnerAnzeigen(pid) {
  const zeile = document.getElementById('npOrdnerZeile');
  const name = document.getElementById('npOrdnerName');
  zeile.style.display = '';
  const h = await gespeicherterProjektordner(pid);
  name.textContent = h ? '📁 ' + h.name : 'noch keiner verknüpft';
}

async function ordnerAendern() {
  if (!bearbeitePid) return;
  const pid = bearbeitePid;
  const h = await waehleProjektordner(pid);
  if (!h) return;
  await ordnerAnzeigen(pid);
  statusText('Protokollordner geändert: ' + h.name + ' – wird gescannt …');
  await projektScannenUndSpeichern(pid);
}

// ---------- Anlegen / Ordner verknüpfen / Löschen / Scannen / Status ----------

async function projektAnlegen() {
  const name = document.getElementById('npName').value.trim();
  const nummer = document.getElementById('npNummer').value.trim();
  if (!name && !nummer) { alert('Bitte mindestens Projektname oder Projektnummer angeben.'); return; }
  const { aktenzeichen, verteiler, ungueltig } = listenLesen();
  if (ungueltig.length) {
    alert('Diese E-Mail-Adressen im Verteiler sind ungültig:\n' + ungueltig.join('\n') + '\n\nBitte korrigieren.');
    return;
  }

  const daten = {
    name,
    projektnummer: nummer,
    ort: document.getElementById('npOrt').value.trim(),
    status: document.getElementById('npStatus').value,
    start: document.getElementById('npStart').value,
    ende: document.getElementById('npEnde').value,
    hauptverantwortlich: document.getElementById('npHauptverantwortlich').value,
    zweitverantwortlich: document.getElementById('npZweitverantwortlich').value,
    lat: npLat,
    lng: npLng,
    flaechen: flaechenAktuelle(),
    aktenzeichen,
    verteiler,
    infos: {
      auftraggeber: document.getElementById('npAuftraggeber').value.trim(),
      ansprechpartner: document.getElementById('npAnsprechpartner').value.trim(),
      ansprechpartnerTelefon: document.getElementById('npAnsprechpartnerTelefon').value.trim(),
      ansprechpartnerEmail: document.getElementById('npAnsprechpartnerEmail').value.trim(),
      baufirma: document.getElementById('npBaufirma').value.trim(),
      landkreis: document.getElementById('npLandkreis').value.trim(),
      // Haupt-Aktenzeichen zusätzlich als Text (für ältere Auswertungen).
      aktenzeichen: hauptAktenzeichen({ aktenzeichen }),
      notizen: document.getElementById('npNotizen').value.trim(),
    },
  };
  const neuId = bearbeitePid || neueProjektId();
  const warBearbeitung = !!bearbeitePid;

  // Neues Projekt: den Protokollordner ZUERST wählen lassen. Der Browser
  // öffnet den Ordner-Dialog nur direkt nach einem Klick – nach dem
  // Speichern (das auf Netzlaufwerken ein paar Sekunden dauern kann) wäre
  // diese Frist abgelaufen und der Dialog ginge nicht mehr auf.
  let protokollOrdner = null;
  if (!warBearbeitung) {
    statusText('Bitte den Protokollordner des Projekts wählen …');
    protokollOrdner = await waehleProjektordner(neuId);
    if (!protokollOrdner) statusText('Kein Protokollordner gewählt – später in der Tabelle über 📂 verknüpfen.');
  }

  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbAendern(ordner, (db) => {
    projektSchreiben(db, neuId, daten, warBearbeitung);
  });
  dbSetzen(db);
  aufAenderung(db);

  formularLeeren();
  projektFormularSchliessen();
  if (protokollOrdner) await projektScannenUndSpeichern(neuId);
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
      case 'projekt-ordner-aendern': ordnerAendern(); break;
    }
  });
}
