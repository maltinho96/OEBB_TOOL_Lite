// Übersicht-Reiter: HTML-Gerüst, Statistik-Kacheln, Projekttabelle,
// Einrichtung (Grundordner). Das Projektformular selbst lebt in
// ui/projektformular.js, die Team-Verwaltung in ui/team.js, die
// Shapefile-Flächen in ui/shapefiles.js – diese Datei bindet alle drei
// nur noch ein und kümmert sich um Laden/Rendern der Übersicht.

import { esc, statusText } from '../core/util.js';
import { grundordnerHolen, waehleGrundordner } from '../core/storage/index.js';
import { dbLesen } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { logo } from '../schema/felder.js';
import { teamAnzeigen, teamInit } from './team.js';
import { shapefilesInit } from './shapefiles.js';
import {
  projektformularInit,
  setAufAenderung,
  projektBearbeiten,
  projektOrdnerVerknuepfen,
  projektScannenUndSpeichern,
  projektStatusSetzen,
  projektLoeschenMitBestaetigung,
} from './projektformular.js';
import { statusIcon, stundenSumme, projektStundenzeilen, nachMonat, monatsName } from '../domain/stunden.js';

// ---------- HTML des Übersicht-Reiters ----------

function uebersichtTabHtml() {
  return `
${logo()}
<h1>Übersicht</h1>
<p style="margin-top:2px; color:#555">Protokolle, Projekte und Stundennachweise – alles in einer Datei, gemeinsam über den Grundordner.</p>

<h2 class="c-grau">Einrichtung</h2>
<p>Der <b>Grundordner</b> ist der Ordner, in dem diese Anwendung und die gemeinsame Datenbank
(<code>oebb_datenbank.json</code>) liegen. Beim ersten Start hier klicken – danach merkt sich der
Browser die Verknüpfung. Jedes Projekt bekommt unten einmalig seinen Protokollordner verknüpft –
danach genügt dort „Scannen“.</p>
<p class="kein-druck">
  <button class="haupt-knopf" data-aktion="grundordner-festlegen">📂 Grundordner festlegen</button>
  <span id="grundordnerStatus" style="margin-left:10px; color:#555;">Noch nicht festgelegt.</span>
</p>
<p style="font-size:11.5px; color:#777;">Ordner-Verknüpfungen merkt sich der Browser pro Person (Chromium/Chrome/Edge);
Kolleginnen verknüpfen die Ordner bei der ersten Nutzung einmal selbst.
Bei gleichzeitigem Schreiben gewinnt die zuletzt speichernde Person.</p>

<h3 style="margin:16px 0 4px; font-size:13px; color:#555;">Team (für Verantwortliche in Projekten)</h3>
<p class="kein-druck" style="display:flex; gap:6px; align-items:center;">
  <input type="text" id="teamNeuerName" placeholder="Name eingeben …" style="max-width:220px;">
  <button class="ordner-knopf" data-aktion="team-hinzufuegen">＋ Hinzufügen</button>
</p>
<div id="teamListe" style="font-size:11.5px; margin-top:6px;"></div>

<div id="uebersichtProjekteBereich" style="display:none">
<h2 class="c-grau">Projekte</h2>
<div class="dash-zahlen" id="startZahlen"></div>
<div class="aktionsleiste kein-druck">
  <button class="haupt-knopf" data-aktion="projekt-formular-oeffnen">＋ Neues Projekt anlegen</button>
  <button class="ordner-knopf" data-aktion="uebersicht-aktualisieren">🔄 Aktualisieren</button>
  <label style="font-size:12.5px; color:#555;">Anzeigen:
    <select id="projektStatusFilter" style="font:inherit; padding:3px;">
      <option value="aktuell" selected>▶ Aktuelle Projekte</option>
      <option value="geplant">🕓 Geplante Projekte</option>
      <option value="abgeschlossen">✔ Abgeschlossene Projekte</option>
      <option value="alle">Alle Projekte</option>
    </select>
  </label>
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
  <tr class="bg-grau-h"><td class="label">Status:</td><td>
    <select id="npStatus">
      <option value="aktuell">▶ Aktuell</option>
      <option value="geplant">🕓 Geplant / kommend</option>
      <option value="abgeschlossen">✔ Abgeschlossen</option>
    </select>
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Hauptverantwortlich:</td><td>
    <select id="npHauptverantwortlich"></select>
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Zweitverantwortlich <small>(optional)</small>:</td><td>
    <select id="npZweitverantwortlich"></select>
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Auftraggeber <small>(optional)</small>:</td><td><input type="text" id="npAuftraggeber"></td></tr>
  <tr class="bg-grau-h"><td class="label">Ansprechpartner (AG) <small>(optional)</small>:</td><td><input type="text" id="npAnsprechpartner" placeholder="Name"></td></tr>
  <tr class="bg-grau-h"><td class="label">Telefon Ansprechpartner <small>(optional)</small>:</td><td><input type="tel" id="npAnsprechpartnerTelefon"></td></tr>
  <tr class="bg-grau-h"><td class="label">E-Mail Ansprechpartner <small>(optional)</small>:</td><td><input type="email" id="npAnsprechpartnerEmail"></td></tr>
  <tr class="bg-grau-h"><td class="label">Landkreis <small>(optional)</small>:</td><td><input type="text" id="npLandkreis"></td></tr>
  <tr class="bg-grau-h"><td class="label">Aktenzeichen <small>(optional)</small>:</td><td><input type="text" id="npAktenzeichen"></td></tr>
  <tr class="bg-grau-h"><td class="label">Notizen <small>(optional)</small>:<textarea id="npNotizen" rows="2"></textarea></td><td style="vertical-align:bottom">
    <button class="ordner-knopf" data-aktion="projekt-anlegen"><span id="npKnopfText">＋ Anlegen &amp; Protokollordner wählen</span></button>
    <button class="ordner-knopf kein-druck" id="npAbbrechen" data-aktion="bearbeiten-abbrechen">Abbrechen</button>
  </td></tr>
</table></div>
<div id="uebersichtErgebnis"></div>
</div>
`;
}

// ---------- Laden + Rendern ----------

async function grundordnerFestlegen() {
  const h = await waehleGrundordner();
  if (!h) return;
  statusText('Grundordner: ' + h.name);
  uebersichtAktualisieren(false);
}

async function uebersichtAktualisieren(interaktiv) {
  const ordner = await grundordnerHolen(interaktiv !== false);
  const bereich = document.getElementById('uebersichtProjekteBereich');
  const status = document.getElementById('grundordnerStatus');
  if (!ordner) {
    if (bereich) bereich.style.display = 'none';
    if (status) status.textContent = 'Noch nicht festgelegt.';
    return;
  }
  if (bereich) bereich.style.display = '';
  if (status) status.textContent = '✅ verknüpft: ' + ordner.name;
  const db = await dbLesen(ordner);
  dbSetzen(db);
  statusText(Object.keys(db.projekte).length + ' Projekte in der Datenbank (' + ordner.name + ').');
  neuZeichnen(db);
  teamAnzeigen();
}

function neuZeichnen(db) {
  uebersichtRendern(db);
  startRendern(db);
}

function uebersichtRendern(db) {
  const ziel = document.getElementById('uebersichtErgebnis');
  const filterSel = document.getElementById('projektStatusFilter');
  const filter = filterSel ? filterSel.value : 'aktuell';
  const alleIds = Object.keys(db.projekte);
  const ids = alleIds.filter((pid) => {
    const s = db.projekte[pid].status || 'aktuell';
    return filter === 'alle' || s === filter;
  });
  if (!alleIds.length) {
    ziel.innerHTML = '<p>Noch keine Projekte angelegt. Über „＋ Projekt anlegen“ starten.</p>';
    return;
  }
  if (!ids.length) {
    ziel.innerHTML = '<p>Keine Projekte mit diesem Status. <button class="ordner-knopf" data-aktion="filter-alle">Alle anzeigen</button></p>';
    return;
  }
  const typNamen = { protokoll: 'Protokoll', vorbegehung: 'Vorbegehung', belehrung: 'Belehrung' };
  const statusLabel = { aktuell: '▶ Aktuell', geplant: '🕓 Geplant', abgeschlossen: '✔ Abgeschlossen' };
  let html = '<table class="uebersicht"><tr>' +
    '<th>Projekt</th><th>Projektnummer</th><th>Ort</th><th>Status</th><th>Prot.</th><th>Vorb.</th><th>Bel.</th>' +
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
      (p.infos && (p.infos.auftraggeber || p.infos.landkreis || p.infos.aktenzeichen || p.infos.ansprechpartner) || p.hauptverantwortlich
        ? '<div style="font-size:11px;color:#666">' +
          (p.infos && p.infos.auftraggeber ? 'AG: ' + esc(p.infos.auftraggeber) + ' ' : '') +
          (p.infos && p.infos.ansprechpartner ? '· AP: ' + esc(p.infos.ansprechpartner) +
            (p.infos.ansprechpartnerTelefon ? ' (Tel. ' + esc(p.infos.ansprechpartnerTelefon) + ')' : '') + ' ' : '') +
          (p.infos && p.infos.landkreis ? '· LK ' + esc(p.infos.landkreis) + ' ' : '') +
          (p.infos && p.infos.aktenzeichen ? '· Az. ' + esc(p.infos.aktenzeichen) + ' ' : '') +
          (p.hauptverantwortlich ? '· 👤 ' + esc(p.hauptverantwortlich) +
            (p.zweitverantwortlich ? ' (Vertr.: ' + esc(p.zweitverantwortlich) + ')' : '') : '') + '</div>'
        : '') + '</td>' +
      '<td class="mitte">' + statusLabel[p.status || 'aktuell'] + '</td>' +
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
      ((p.status || 'aktuell') === 'abgeschlossen'
        ? '<button class="ordner-knopf" data-aktion="projekt-reaktivieren" data-pid="' + pid + '">↩ Reaktivieren</button>'
        : (p.status === 'geplant'
          ? '<button class="ordner-knopf" data-aktion="projekt-starten" data-pid="' + pid + '">▶ Starten</button>'
          : '') +
          '<button class="ordner-knopf" data-aktion="projekt-abschliessen" data-pid="' + pid + '">✔ Abschließen</button>') +
      '<button class="ordner-knopf" style="color:#a00" data-aktion="projekt-loeschen" data-pid="' + pid + '">✕</button>' +
      '</div></td></tr>';
  });
  html += '</table>';
  ziel.innerHTML = '<div style="overflow-x:auto; max-width:100%;">' + html + '</div>';
}

function startRendern(db) {
  if (!document.getElementById('startZahlen')) return;
  const filterSel = document.getElementById('projektStatusFilter');
  const filter = filterSel ? filterSel.value : 'aktuell';
  const ids = Object.keys(db.projekte).filter((pid) => {
    const s = db.projekte[pid].status || 'aktuell';
    return filter === 'alle' || s === filter;
  });
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
}

// ---------- Initialisierung ----------

export function uebersichtTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab aktiv';
  section.id = 'tab-uebersicht';
  section.innerHTML = uebersichtTabHtml();
  mount.appendChild(section);

  // Untermodule verdrahten. Jedes hört selbst auf `section`, nur nach
  // seinen eigenen data-aktion-Werten filternd – keine Überschneidung.
  projektformularInit(section);
  teamInit(section);
  shapefilesInit(section);
  // Wenn das Formular etwas an der DB ändert, hier neu zeichnen (statt
  // dass projektformular.js dashboard.js importieren müsste).
  setAufAenderung(neuZeichnen);

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    const pid = btn.dataset.pid;
    switch (btn.dataset.aktion) {
      case 'uebersicht-aktualisieren': uebersichtAktualisieren(true); break;
      case 'grundordner-festlegen': grundordnerFestlegen(); break;
      case 'projekt-scannen': projektScannenUndSpeichern(pid); break;
      case 'projekt-ordner-verknuepfen': projektOrdnerVerknuepfen(pid, false); break;
      case 'projekt-bearbeiten': projektBearbeiten(pid); break;
      case 'projekt-loeschen': projektLoeschenMitBestaetigung(pid); break;
      case 'projekt-abschliessen': projektStatusSetzen(pid, 'abgeschlossen'); break;
      case 'projekt-starten': projektStatusSetzen(pid, 'aktuell'); break;
      case 'projekt-reaktivieren': projektStatusSetzen(pid, 'aktuell'); break;
      case 'filter-alle': {
        const sel = document.getElementById('projektStatusFilter');
        if (sel) { sel.value = 'alle'; neuZeichnen(dbHolen()); }
        break;
      }
      // stundenzettel-drucken / projekt-exportieren: verdrahtet in export/xlsx-export.js (Stufe 5)
    }
  });

  section.addEventListener('change', (e) => {
    if (e.target.id === 'projektStatusFilter') {
      const db = dbHolen();
      if (db) neuZeichnen(db);
    }
  });
}

// Wird beim Wechsel auf den Übersicht-Reiter aufgerufen (siehe ui/tabs.js
// tabWechselHook) und beim ersten Laden der App (wie im Original).
export function uebersichtBeiAnzeigeAktualisieren(id) {
  if (id === 'tab-uebersicht') uebersichtAktualisieren(false);
}