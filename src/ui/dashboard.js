// Übersicht-Reiter: Start-Dashboard, Projekttabelle, Projektformular
// (Anlegen/Bearbeiten mit Kartennadel), Ordner-Verknüpfung und Scannen.
// Originalgetreu portiert; nutzt domain/projekt.js für die DB-Logik und
// ui/karte.js für die gemeinsamen Leaflet-Helfer (Icon, OSM-Ebene).

import L from 'leaflet';
import { esc, statusText } from '../core/util.js';
import { KARTE_START } from '../config/konstanten.js';
import { grundordnerHolen, waehleGrundordner, waehleProjektordner, projektOrdnerHolen } from '../core/storage/index.js';
import { dbLesen, dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { shapefilesEinlesen } from '../core/shapefile.js';
import { logo } from '../schema/felder.js';
import { nadelIcon, osmEbene } from './karte.js';
import {
  projektSchreiben,
  projektLoeschen as projektAusDbLoeschen,
  neueProjektId,
  projektScannen as projektOrdnerScannen,
  eintraegeZusammenfuehren,
} from '../domain/projekt.js';
import { statusIcon, stundenSumme, projektStundenzeilen, nachMonat, monatsName } from '../domain/stunden.js';

// ---------- HTML des Übersicht-Reiters ----------

function uebersichtTabHtml() {
  return `
${logo()}
<h1>Übersicht</h1>
<p style="margin-top:2px; color:#555">Protokolle, Projekte und Stundennachweise – alles in einer Datei, gemeinsam über den Grundordner.</p>

<h2 class="c-grau">Auf einen Blick</h2>
<p class="kein-druck">
  <button class="ordner-knopf" data-aktion="uebersicht-aktualisieren">🔄 Projektdaten laden</button>
  <span id="startStatus" style="margin-left:10px; color:#555;"></span>
</p>
<div class="dash-zahlen" id="startZahlen"></div>
<div id="startProjekte"></div>

<h2 class="c-grau">Projekte</h2>
<div class="aktionsleiste kein-druck">
  <button class="haupt-knopf" data-aktion="projekt-formular-oeffnen">＋ Neues Projekt anlegen</button>
  <span id="scanStatus" style="color:#555;"></span>
</div>
<div class="kein-druck projektformular" id="npDetails" style="display:none">
<h3 id="npTitel">Neues Projekt anlegen</h3>
<table class="form" style="max-width:640px; margin-top:6px">
  <tr class="bg-grau-h"><td class="label" style="width:200px">Projektname:</td><td><input type="text" id="npName" placeholder="z. B. Telekom Treuenbrietzen"></td></tr>
  <tr class="bg-grau-h"><td class="label">Projektnummer:</td><td><input type="text" id="npNummer" placeholder="z. B. SM4214114269"></td></tr>
  <tr class="bg-grau-h"><td class="label">Ort Bvh:</td><td><input type="text" id="npOrt" placeholder="z. B. Treuenbrietzen"></td></tr>
  <tr class="bg-grau-h"><td class="label">Ort auf Karte:</td><td>
    <div class="karte" id="npKarte"></div>
    <span class="koord-anzeige" id="npKoord">Noch keine Nadel gesetzt – auf die Karte klicken.</span>
    <button style="font-size:11px; margin-left:8px" data-aktion="nadel-entfernen">Nadel entfernen</button>
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Flächen <small>(optional, .zip-Shapefiles)</small>:</td><td>
    <input type="file" id="npShapeInput" accept=".zip" multiple>
    <div id="npFlaechenListe" style="font-size:11.5px; margin-top:6px;"></div>
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Auftraggeber <small>(optional)</small>:</td><td><input type="text" id="npAuftraggeber"></td></tr>
  <tr class="bg-grau-h"><td class="label">Landkreis <small>(optional)</small>:</td><td><input type="text" id="npLandkreis"></td></tr>
  <tr class="bg-grau-h"><td class="label">Aktenzeichen <small>(optional)</small>:</td><td><input type="text" id="npAktenzeichen"></td></tr>
  <tr class="bg-grau-h"><td class="label">Notizen <small>(optional)</small>:<textarea id="npNotizen" rows="2"></textarea></td><td style="vertical-align:bottom">
    <button class="ordner-knopf" data-aktion="projekt-anlegen"><span id="npKnopfText">＋ Anlegen &amp; Protokollordner wählen</span></button>
    <button class="ordner-knopf kein-druck" id="npAbbrechen" data-aktion="bearbeiten-abbrechen">Abbrechen</button>
  </td></tr>
</table></div>
<div id="uebersichtErgebnis"></div>

<h2 class="c-grau">Einrichtung</h2>
<p>Der <b>Grundordner</b> ist der Ordner, in dem diese Anwendung und die gemeinsame Datenbank
(<code>oebb_datenbank.json</code>) liegen. Jedes Projekt bekommt oben einmalig seinen Protokollordner
verknüpft – danach genügt dort „Scannen“.</p>
<p class="kein-druck">
  <button class="ordner-knopf" data-aktion="grundordner-festlegen">📂 Grundordner festlegen</button>
</p>
<p style="font-size:11.5px; color:#777;">Ordner-Verknüpfungen merkt sich der Browser pro Person (Chromium/Chrome/Edge);
Kolleginnen verknüpfen die Ordner bei der ersten Nutzung einmal selbst.
Bei gleichzeitigem Schreiben gewinnt die zuletzt speichernde Person.</p>
`;
}

// ---------- Kartennadel im Projektformular (Anlegen/Bearbeiten) ----------

let npKarte = null;
let npMarker = null;
let npLat = null;
let npLng = null;
let bearbeitePid = null;
let npFlaechen = []; // [{name, geojson}] – hochgeladene Shapefiles des Formulars
let npFlaechenLayer = null; // Leaflet-LayerGroup für die Anzeige auf npKarte

function npKarteInit() {
  if (npKarte) { setTimeout(() => npKarte.invalidateSize(), 120); return; }
  npKarte = L.map('npKarte').setView([KARTE_START.lat, KARTE_START.lng], 9);
  osmEbene().addTo(npKarte);
  npFlaechenLayer = L.layerGroup().addTo(npKarte);
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

// ---------- Flächen (Shapefiles) im Projektformular ----------

// Zeichnet alle aktuell im Formular gehaltenen Flächen neu und aktualisiert
// die Liste mit Entfernen-Knöpfen darunter.
function flaechenAnzeigen() {
  if (npFlaechenLayer) npFlaechenLayer.clearLayers();
  const ziel = document.getElementById('npFlaechenListe');
  if (!npFlaechen.length) { ziel.innerHTML = ''; return; }

  let alleGrenzen = null;
  npFlaechen.forEach((f, idx) => {
    const layer = L.geoJSON(f.geojson, { style: { color: '#1f3864', weight: 2, fillOpacity: 0.15 } });
    layer.bindTooltip(esc(f.name));
    layer.addTo(npFlaechenLayer);
    const b = layer.getBounds();
    if (b.isValid()) alleGrenzen = alleGrenzen ? alleGrenzen.extend(b) : b;
    void idx;
  });
  if (alleGrenzen && alleGrenzen.isValid()) npKarte.fitBounds(alleGrenzen, { padding: [20, 20], maxZoom: 15 });

  ziel.innerHTML = npFlaechen
    .map((f, idx) => `<span style="display:inline-flex; align-items:center; gap:4px; margin:2px 6px 2px 0; padding:2px 6px; background:#eef; border-radius:4px;">
      🗺 ${esc(f.name)} <button data-aktion="flaeche-entfernen" data-idx="${idx}" style="border:none;background:none;color:#a00;cursor:pointer;font-size:12px;">✕</button>
    </span>`)
    .join('');
}

async function flaechenHinzufuegen(files) {
  if (!files || !files.length) return;
  try {
    const neue = await shapefilesEinlesen(files);
    npFlaechen.push(...neue);
    flaechenAnzeigen();
  } catch (err) {
    alert('Shapefile konnte nicht gelesen werden: ' + err.message);
  }
}

function flaechenEntfernen(idx) {
  npFlaechen.splice(idx, 1);
  flaechenAnzeigen();
}

function flaechenLeeren() {
  npFlaechen = [];
  if (npFlaechenLayer) npFlaechenLayer.clearLayers();
  const ziel = document.getElementById('npFlaechenListe');
  if (ziel) ziel.innerHTML = '';
}

// ---------- Projektformular öffnen/schließen/leeren ----------

function formularLeeren() {
  ['npName', 'npNummer', 'npOrt', 'npAuftraggeber', 'npLandkreis', 'npAktenzeichen', 'npNotizen'].forEach((id) => {
    document.getElementById(id).value = '';
  });
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

function projektBearbeiten(pid) {
  const db = dbHolen();
  if (!db || !db.projekte[pid]) return;
  const p = db.projekte[pid];
  projektFormularOeffnen();
  document.getElementById('npName').value = p.name || '';
  document.getElementById('npNummer').value = p.projektnummer || '';
  document.getElementById('npOrt').value = p.ort || '';
  const i = p.infos || {};
  document.getElementById('npAuftraggeber').value = i.auftraggeber || '';
  document.getElementById('npLandkreis').value = i.landkreis || '';
  document.getElementById('npAktenzeichen').value = i.aktenzeichen || '';
  document.getElementById('npNotizen').value = i.notizen || '';
  if (p.lat != null && p.lng != null) { nadelSetzen(p.lat, p.lng); npKarte.setView([p.lat, p.lng], 12); }
  else nadelEntfernen();
  npFlaechen = (p.flaechen || []).map((f) => ({ name: f.name, geojson: f.geojson }));
  flaechenAnzeigen();
  bearbeitePid = pid;
  document.getElementById('npKnopfText').textContent = '💾 Änderungen speichern';
  const t2 = document.getElementById('npTitel');
  if (t2) t2.textContent = 'Projekt bearbeiten';
  document.getElementById('npAbbrechen').style.display = '';
}

// ---------- Anlegen / Ordner verknüpfen / Löschen / Scannen ----------

async function projektAnlegen() {
  const name = document.getElementById('npName').value.trim();
  const nummer = document.getElementById('npNummer').value.trim();
  if (!name && !nummer) { alert('Bitte mindestens Projektname oder Projektnummer angeben.'); return; }

  const daten = {
    name,
    projektnummer: nummer,
    ort: document.getElementById('npOrt').value.trim(),
    lat: npLat,
    lng: npLng,
    flaechen: npFlaechen.map((f) => ({ name: f.name, geojson: f.geojson })),
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
  neuZeichnen(db);

  formularLeeren();
  projektFormularSchliessen();
  if (!warBearbeitung) await projektOrdnerVerknuepfen(neuId, true);
}

async function projektOrdnerVerknuepfen(id, danachScannen) {
  const h = await waehleProjektordner(id);
  if (!h) return;
  statusText('Protokollordner verknüpft: ' + h.name);
  if (danachScannen) await projektScannenUndSpeichern(id);
}

async function projektLoeschenMitBestaetigung(id) {
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
  neuZeichnen(db);
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
  neuZeichnen(db);
  statusText(geprueft + ' HTML-Dateien geprüft, ' + gefunden + ' Protokolle im Projekt.');
}

async function grundordnerFestlegen() {
  const h = await waehleGrundordner();
  if (!h) return;
  statusText('Grundordner: ' + h.name);
  uebersichtAktualisieren(false);
}

// ---------- Laden + Rendern ----------

async function uebersichtAktualisieren(interaktiv) {
  const ordner = await grundordnerHolen(interaktiv !== false);
  if (!ordner) { statusText('Noch kein Grundordner festgelegt.'); return; }
  const db = await dbLesen(ordner);
  dbSetzen(db);
  statusText(Object.keys(db.projekte).length + ' Projekte in der Datenbank (' + ordner.name + ').');
  neuZeichnen(db);
}

function neuZeichnen(db) {
  uebersichtRendern(db);
  startRendern(db);
}

function uebersichtRendern(db) {
  const ziel = document.getElementById('uebersichtErgebnis');
  const ids = Object.keys(db.projekte);
  if (!ids.length) {
    ziel.innerHTML = '<p>Noch keine Projekte angelegt. Über „＋ Projekt anlegen“ starten.</p>';
    return;
  }
  const typNamen = { protokoll: 'Protokoll', vorbegehung: 'Vorbegehung', belehrung: 'Belehrung' };
  let html = '<table class="uebersicht"><tr>' +
    '<th>Projekt</th><th>Projektnummer</th><th>Ort</th><th>Prot.</th><th>Vorb.</th><th>Bel.</th>' +
    '<th>Abgerechnet</th><th>Σ Std.</th><th class="kein-druck">Stundenzettel</th><th class="kein-druck">Aktionen</th></tr>';

  ids.sort((a, b) => (db.projekte[a].name || '').localeCompare(db.projekte[b].name || '')).forEach((pid) => {
    const p = db.projekte[pid];
    const dateien = Object.keys(p.eintraege).map((k) => { const e = p.eintraege[k]; e.datei = k; return e; });
    const z = { protokoll: 0, vorbegehung: 0, belehrung: 0 };
    let abgerechnet = 0;
    let stdSumme = 0;
    dateien.forEach((e) => {
      if (z[e.typ] !== undefined) z[e.typ]++;
      const su = stundenSumme(e);
      stdSumme += su;
      if (e.abgerechnet) abgerechnet++;
    });
    const monate = Object.keys(nachMonat(projektStundenzeilen(p))).sort();
    const monatOpts = monate.map((m) => '<option value="' + m + '">' + monatsName(m) + '</option>').join('');
    const liste = dateien
      .sort((a, b) => (b.geaendert || 0) - (a.geaendert || 0))
      .map((d) => {
        const dat = d.datum ? new Date(d.datum).toLocaleDateString('de-DE') : '';
        const su = stundenSumme(d);
        return '<li>' + statusIcon(d) + ' ' + esc(d.datei) + ' – ' + (typNamen[d.typ] || esc(d.typ)) +
          (d.nummer ? ' Nr. ' + esc(d.nummer) : '') +
          (dat ? ', Begehung am ' + dat : '') +
          (su > 0 ? ' – <b>' + su + ' Std.</b>' : ' – <i>noch keine Stunden → Reiter „🕒 Stunden“</i>') +
          (d.abgerechnet ? ' – abgerechnet' + (d.abgerechnetAm ? ' am ' + esc(new Date(d.abgerechnetAm).toLocaleDateString('de-DE')) : '') : '') + '</li>';
      })
      .join('');

    html += '<tr>' +
      '<td><details><summary>' + (esc(p.name) || '<i>ohne Namen</i>') + ' <span style="color:#777">(' + dateien.length + ' Protokolle)</span></summary>' +
      (dateien.length ? '<ul class="datei-liste">' + liste + '</ul>' : '<p style="font-size:11.5px">Noch keine Protokolle – „Scannen“ klicken.</p>') + '</details></td>' +
      '<td>' + esc(p.projektnummer) + '</td>' +
      '<td>' + esc(p.ort) + (p.lat != null ? ' <span title="' + p.lat + ', ' + p.lng + '">📍</span>' : '') +
      (p.infos && (p.infos.auftraggeber || p.infos.landkreis || p.infos.aktenzeichen)
        ? '<div style="font-size:11px;color:#666">' +
          (p.infos.auftraggeber ? 'AG: ' + esc(p.infos.auftraggeber) + ' ' : '') +
          (p.infos.landkreis ? '· LK ' + esc(p.infos.landkreis) + ' ' : '') +
          (p.infos.aktenzeichen ? '· Az. ' + esc(p.infos.aktenzeichen) : '') + '</div>'
        : '') + '</td>' +
      '<td class="mitte">' + z.protokoll + '</td>' +
      '<td class="mitte">' + z.vorbegehung + '</td>' +
      '<td class="mitte">' + z.belehrung + '</td>' +
      '<td class="mitte">' + abgerechnet + ' / ' + dateien.length + '</td>' +
      '<td class="mitte"><b>' + stdSumme + '</b></td>' +
      '<td class="kein-druck"><div class="projekt-aktionen">' +
      (monate.length ? '<select id="mon_' + pid + '"><option value="alle">Alle Monate</option>' + monatOpts + '</select>' +
        '<button class="ordner-knopf" data-aktion="stundenzettel-drucken" data-pid="' + pid + '">🖨</button>' +
        '<button class="ordner-knopf" data-aktion="projekt-exportieren" data-pid="' + pid + '">📥 xlsx</button>'
        : '<i style="font-size:11px">noch keine Stunden</i>') +
      '</div></td>' +
      '<td class="kein-druck"><div class="projekt-aktionen">' +
      '<button class="ordner-knopf" data-aktion="projekt-scannen" data-pid="' + pid + '">🔍 Scannen</button>' +
      '<button class="ordner-knopf" data-aktion="projekt-ordner-verknuepfen" data-pid="' + pid + '">📂</button>' +
      '<button class="ordner-knopf" data-aktion="projekt-bearbeiten" data-pid="' + pid + '">✎</button>' +
      '<button class="ordner-knopf" style="color:#a00" data-aktion="projekt-loeschen" data-pid="' + pid + '">✕</button>' +
      '</div></td></tr>';
  });
  html += '</table>';
  ziel.innerHTML = html;
}

function startRendern(db) {
  if (!document.getElementById('startZahlen')) return;
  const ids = Object.keys(db.projekte);
  let protokolle = 0;
  let stunden = 0;
  let offen = 0;
  let abger = 0;
  ids.forEach((pid) => {
    const p = db.projekte[pid];
    Object.keys(p.eintraege || {}).forEach((k) => {
      protokolle++;
      const su = stundenSumme(p.eintraege[k]);
      stunden += su;
      if (su === 0) offen++;
      if (p.eintraege[k].abgerechnet) abger++;
    });
  });
  document.getElementById('startZahlen').innerHTML =
    '<div class="dash-kachel"><b>' + ids.length + '</b><span>Projekte</span></div>' +
    '<div class="dash-kachel"><b>' + protokolle + '</b><span>Protokolle</span></div>' +
    '<div class="dash-kachel"><b>' + stunden + '</b><span>Σ Stunden</span></div>' +
    '<div class="dash-kachel"><b>' + offen + '</b><span>ohne Stunden</span></div>' +
    '<div class="dash-kachel"><b>' + abger + ' / ' + protokolle + '</b><span>abgerechnet</span></div>';

  const liste = ids
    .map((pid) => {
      const p = db.projekte[pid];
      const dateien = Object.keys(p.eintraege || {});
      let su = 0;
      let off = 0;
      dateien.forEach((k) => { const x = stundenSumme(p.eintraege[k]); su += x; if (x === 0) off++; });
      return {
        pid, p, anzahl: dateien.length, stunden: su, offen: off,
        letzte: dateien.reduce((a, k) => Math.max(a, p.eintraege[k].geaendert || 0), 0),
      };
    })
    .sort((a, b) => b.letzte - a.letzte)
    .slice(0, 6);

  document.getElementById('startProjekte').innerHTML = liste.map((e) => {
    return '<div class="dash-projekt" data-aktion="dash-projekt-springen">' +
      '<div class="dp-name">' + (esc(e.p.name) || esc(e.p.projektnummer) || 'Projekt') +
      (e.p.lat != null ? ' 📍' : '') + '</div>' +
      '<div class="dp-detail">' + esc(e.p.projektnummer || '') + (e.p.ort ? ' · ' + esc(e.p.ort) : '') +
      ' · ' + e.anzahl + ' Protokolle · ' + e.stunden + ' Std.' +
      (e.offen ? ' · <b style="color:#c05f10">' + e.offen + ' ohne Stunden</b>' : ' · ✅ alle abgerechnet') +
      '</div></div>';
  }).join('') || '<p style="color:#777">Noch keine Projekte – im Reiter „Übersicht“ anlegen.</p>';
}

// ---------- Initialisierung ----------

export function uebersichtTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab aktiv';
  section.id = 'tab-uebersicht';
  section.innerHTML = uebersichtTabHtml();
  mount.appendChild(section);

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    const pid = btn.dataset.pid;
    switch (btn.dataset.aktion) {
      case 'uebersicht-aktualisieren': uebersichtAktualisieren(true); break;
      case 'projekt-formular-oeffnen': projektFormularOeffnen(); break;
      case 'nadel-entfernen': nadelEntfernen(); break;
      case 'projekt-anlegen': projektAnlegen(); break;
      case 'bearbeiten-abbrechen': bearbeitenAbbrechen(); break;
      case 'grundordner-festlegen': grundordnerFestlegen(); break;
      case 'projekt-scannen': projektScannenUndSpeichern(pid); break;
      case 'projekt-ordner-verknuepfen': projektOrdnerVerknuepfen(pid, false); break;
      case 'projekt-bearbeiten': projektBearbeiten(pid); break;
      case 'projekt-loeschen': projektLoeschenMitBestaetigung(pid); break;
      case 'flaeche-entfernen': flaechenEntfernen(parseInt(btn.dataset.idx, 10)); break;
      case 'dash-projekt-springen':
        document.getElementById('uebersichtErgebnis').scrollIntoView({ behavior: 'smooth' });
        break;
      // stundenzettel-drucken / projekt-exportieren: verdrahtet in export/xlsx-export.js (Stufe 5)
    }
  });

  section.addEventListener('change', (e) => {
    if (e.target.id === 'npShapeInput') {
      flaechenHinzufuegen(e.target.files);
      e.target.value = '';
    }
  });
}

// Wird beim Wechsel auf den Übersicht-Reiter aufgerufen (siehe ui/tabs.js
// tabWechselHook) und beim ersten Laden der App (wie im Original).
export function uebersichtBeiAnzeigeAktualisieren(id) {
  if (id === 'tab-uebersicht') uebersichtAktualisieren(false);
}