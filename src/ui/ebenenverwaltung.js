// Kartenreiter: Fachdaten-Ebenen (WMS/WFS) pro Projekt verwalten.
//   Projekt wählen -> Link einfügen -> Typ/Ebene prüfen (GetCapabilities)
//   -> Name und Zoomstufe -> übernehmen. Gespeichert in p.ebenen der
//   gemeinsamen Datenbank; angezeigt im Kartenreiter und in den Karten über
//   den Foto-Blöcken der Protokolle (nicht im Übersichtsplan).

import L from 'leaflet';
import { esc, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import {
  ebenenListe, dienstAusLink, capabilitiesUrl, ebenenAusCapabilities, STANDARD_MINZOOM,
} from '../domain/fachebenen.js';
import { fachebenenAnwenden, ebenenMeldung, ebenenFarbe } from './fachebenen.js';

let karte = null;      // Leaflet-Karte des Reiters
let entwurf = null;    // Ebene, die gerade hinzugefügt wird

export const EBENEN_HTML = `
<h2 class="c-grau">Fachdaten-Ebenen (WMS / WFS)</h2>
<p class="kein-druck eb-kopf">
  <label>Projekt: <select id="ebProjekt"></select></label>
  <span id="ebZoom" class="eb-zoom"></span>
</p>
<p class="eb-info">Links aus Geoportalen (z. B. Schutzgebiete, Biotope, Gewässer) einfügen. Eine Ebene erscheint erst ab
ihrer Zoomstufe – auch in den Karten über den Fotos der Protokolle dieses Projekts (nicht im Übersichtsplan).</p>
<div id="ebListe"></div>
<div class="eb-neu kein-druck">
  <input type="url" id="ebLink" placeholder="WMS- oder WFS-Link einfügen, z. B. den GetCapabilities-Link aus dem Geoportal">
  <button class="ordner-knopf" data-aktion="eb-pruefen">＋ Ebene hinzufügen</button>
</div>
<div id="ebEntwurf"></div>`;

function projekt() {
  const sel = document.getElementById('ebProjekt');
  const db = dbHolen();
  return sel && sel.value && db && db.projekte ? db.projekte[sel.value] : null;
}

function listeZeigen() {
  const ziel = document.getElementById('ebListe');
  if (!ziel) return;
  const p = projekt();
  if (!p) { ziel.innerHTML = '<p style="color:#777">Zuerst oben ein Projekt wählen.</p>'; return; }
  const ebenen = ebenenListe(p);
  if (!ebenen.length) { ziel.innerHTML = '<p style="color:#777">Für dieses Projekt sind noch keine Ebenen hinterlegt.</p>'; return; }
  ziel.innerHTML = '<table class="uebersicht eb-tabelle"><tr><th>an</th><th>Ebene</th><th>Typ</th><th>ab Zoom</th><th class="kein-druck"></th></tr>' +
    ebenen.map((e, i) => {
      const m = ebenenMeldung(e.id);
      return '<tr>' +
        '<td class="mitte"><input type="checkbox" data-eb-an="' + esc(e.id) + '"' + (e.an ? ' checked' : '') + '></td>' +
        '<td><span class="eb-farbe" style="background:' + (e.typ === 'wfs' ? ebenenFarbe(i) : '#999') + '"></span>' + esc(e.name) +
        '<div class="eb-klein">' + esc(e.layer) + ' · ' + esc(new URL(e.url).host) + '</div>' +
        (m ? '<div class="eb-warn">⚠ ' + esc(m) + '</div>' : '') + '</td>' +
        '<td>' + e.typ.toUpperCase() + '</td>' +
        '<td><input type="number" min="5" max="19" value="' + Number(e.minZoom) + '" data-eb-zoom="' + esc(e.id) + '" style="width:56px"></td>' +
        '<td class="kein-druck mitte"><button class="vt-weg" data-aktion="eb-weg" data-id="' + esc(e.id) + '" title="Ebene entfernen">✕</button></td></tr>';
    }).join('') + '</table>';
}

function anwenden() {
  if (karte) fachebenenAnwenden(karte, ebenenListe(projekt()));
}

// Karte auf das gewählte Projekt zoomen – nah genug, dass Ebenen erscheinen.
function zumProjekt() {
  const p = projekt();
  if (!karte || !p) return;
  const punkte = [];
  if (p.lat != null) punkte.push([p.lat, p.lng]);
  (p.flaechen || []).forEach((f) => {
    const b = L.geoJSON(f.geojson).getBounds();
    if (b && b.isValid()) { punkte.push([b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]); }
  });
  if (punkte.length) karte.fitBounds(punkte, { padding: [40, 40], maxZoom: STANDARD_MINZOOM });
}

async function speichern(aenderung) {
  const sel = document.getElementById('ebProjekt');
  const pid = sel && sel.value;
  if (!pid) return;
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbAendern(ordner, (db) => {
    const p = db.projekte[pid];
    if (!p) return;
    p.ebenen = Array.isArray(p.ebenen) ? p.ebenen : [];
    aenderung(p.ebenen);
  });
  dbSetzen(db);
  listeZeigen();
  anwenden();
}

// ---------- Neue Ebene: prüfen und übernehmen ----------

function entwurfZeigen(meldung) {
  const ziel = document.getElementById('ebEntwurf');
  if (!entwurf) { ziel.innerHTML = ''; return; }
  const ebeneFeld = entwurf.auswahl && entwurf.auswahl.length
    ? '<select id="ebEbene">' + entwurf.auswahl.map((a) => '<option value="' + esc(a.name) + '"' + (a.name === entwurf.layer ? ' selected' : '') + '>' +
        esc(a.titel ? a.titel + ' (' + a.name + ')' : a.name) + '</option>').join('') + '</select>'
    : '<input type="text" id="ebEbene" value="' + esc(entwurf.layer || '') + '" placeholder="Ebenenname (z. B. aus dem Geoportal)">';
  ziel.innerHTML = '<div class="eb-entwurf">' +
    (meldung ? '<div class="eb-warn">' + esc(meldung) + '</div>' : '') +
    '<label>Typ <select id="ebTyp"><option value="wms"' + (entwurf.typ === 'wms' ? ' selected' : '') + '>WMS (Kartenbild)</option>' +
    '<option value="wfs"' + (entwurf.typ === 'wfs' ? ' selected' : '') + '>WFS (Objekte)</option></select></label>' +
    '<label>Ebene ' + ebeneFeld + '</label>' +
    '<label>Name <input type="text" id="ebName" value="' + esc(entwurf.name || '') + '" placeholder="z. B. Naturschutzgebiete"></label>' +
    '<label>ab Zoom <input type="number" id="ebMinZoom" min="5" max="19" value="' + STANDARD_MINZOOM + '" style="width:56px"></label>' +
    '<button class="ordner-knopf" data-aktion="eb-uebernehmen">✔ Übernehmen</button>' +
    '<button class="ordner-knopf" data-aktion="eb-abbrechen">Abbrechen</button></div>';
}

async function capabilitiesLaden() {
  entwurf.auswahl = null;
  if (!entwurf.typ) { entwurfZeigen('Typ bitte wählen – aus dem Link nicht erkennbar.'); return; }
  entwurfZeigen('Dienst wird abgefragt …');
  try {
    const antwort = await fetch(capabilitiesUrl(entwurf));
    const liste = ebenenAusCapabilities(await antwort.text(), entwurf.typ, new DOMParser());
    if (!liste.length) throw new Error('leer');
    // Ebene aus dem eingefügten Link, die der Dienst nicht auflistet, trotzdem anbieten.
    if (entwurf.layer && !liste.some((a) => a.name === entwurf.layer)) liste.unshift({ name: entwurf.layer, titel: '' });
    entwurf.auswahl = liste;
    if (!entwurf.layer) entwurf.layer = liste[0].name;
    const treffer = liste.find((a) => a.name === entwurf.layer);
    if (!entwurf.name) entwurf.name = (treffer && treffer.titel) || entwurf.layer;
    entwurfZeigen('');
  } catch {
    entwurfZeigen('Der Dienst lässt sich von hier nicht abfragen (oder der Typ passt nicht). Den Ebenennamen bitte von Hand eintragen.');
  }
}

async function pruefen() {
  if (!projekt()) { alert('Bitte zuerst oben ein Projekt wählen.'); return; }
  const link = document.getElementById('ebLink').value;
  const d = dienstAusLink(link);
  if (d.fehler) { alert(d.fehler); return; }
  entwurf = { ...d, name: '' };
  await capabilitiesLaden();
}

async function uebernehmen() {
  const ebene = document.getElementById('ebEbene').value.trim();
  if (!ebene) { alert('Bitte eine Ebene wählen oder eintragen.'); return; }
  const neu = {
    id: 'e' + Date.now(),
    name: document.getElementById('ebName').value.trim() || ebene,
    typ: document.getElementById('ebTyp').value,
    url: entwurf.url,
    layer: ebene,
    minZoom: Math.min(19, Math.max(5, parseInt(document.getElementById('ebMinZoom').value, 10) || STANDARD_MINZOOM)),
    an: true,
  };
  entwurf = null;
  entwurfZeigen();
  document.getElementById('ebLink').value = '';
  await speichern((liste) => liste.push(neu));
  zumProjekt();
}

// ---------- Anbindung an den Kartenreiter ----------

export function ebenenProjekteFuellen() {
  const sel = document.getElementById('ebProjekt');
  const db = dbHolen();
  if (!sel || !db) return;
  const vorher = sel.value;
  const ids = Object.keys(db.projekte).sort((a, b) => (db.projekte[a].name || '').localeCompare(db.projekte[b].name || ''));
  sel.innerHTML = '<option value="">– Projekt wählen –</option>' +
    ids.map((id) => '<option value="' + esc(id) + '">' + esc(db.projekte[id].name || id) + '</option>').join('');
  if (vorher && db.projekte[vorher]) sel.value = vorher;
  listeZeigen();
  anwenden();
  if (sel.value) zumProjekt();
}

export function ebenenverwaltungInit(section, leafletKarte) {
  karte = leafletKarte;
  const zoomAnzeige = () => {
    const el = document.getElementById('ebZoom');
    if (el && karte) el.textContent = 'aktuelle Zoomstufe: ' + karte.getZoom();
  };
  karte.on('zoomend', zoomAnzeige);
  zoomAnzeige();

  section.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'ebProjekt') { listeZeigen(); anwenden(); zumProjekt(); }
    if (t.id === 'ebTyp' && entwurf) { entwurf.typ = t.value; entwurf.layer = ''; entwurf.name = ''; capabilitiesLaden(); }
    if (t.id === 'ebEbene' && entwurf && entwurf.auswahl) {
      const a = entwurf.auswahl.find((x) => x.name === t.value);
      const name = document.getElementById('ebName');
      if (a && name) name.value = a.titel || a.name;
    }
    if (t.dataset.ebAn) { const id = t.dataset.ebAn; const an = t.checked; speichern((l) => { const x = l.find((e2) => e2.id === id); if (x) x.an = an; }); }
    if (t.dataset.ebZoom) {
      const id = t.dataset.ebZoom; const z = Math.min(19, Math.max(5, parseInt(t.value, 10) || STANDARD_MINZOOM));
      speichern((l) => { const x = l.find((e2) => e2.id === id); if (x) x.minZoom = z; });
    }
  });
  section.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aktion]');
    if (!b) return;
    if (b.dataset.aktion === 'eb-pruefen') pruefen();
    if (b.dataset.aktion === 'eb-uebernehmen') uebernehmen();
    if (b.dataset.aktion === 'eb-abbrechen') { entwurf = null; entwurfZeigen(); }
    if (b.dataset.aktion === 'eb-weg') {
      const id = b.dataset.id;
      if (confirm('Diese Ebene aus dem Projekt entfernen?')) speichern((l) => { const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); });
    }
  });
  section.addEventListener('keydown', (e) => {
    if (e.target.id === 'ebLink' && e.key === 'Enter') { e.preventDefault(); pruefen(); }
  });
  document.addEventListener('fachebenen-meldung', listeZeigen);
}
