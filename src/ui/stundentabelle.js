// Stunden-Reiter: Stundenerfassung je Protokoll + Stundenzettel-Vorschau.
// Der eigentliche Excel-/PDF-Export (arbeitsmappeBauen, exPdf, exXlsx) lebt
// in export/xlsx-export.js (Stufe 5) – hier nur Erfassung und Vorschau.
// Originalgetreu portiert.

import { esc, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbLesen, dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { logo } from '../schema/felder.js';
import {
  statusIcon,
  stundenSumme,
  stVorschlag,
  projektStundenzeilen,
  nachMonat,
  monatsName,
  smNummer,
} from '../domain/stunden.js';

// ---------- HTML des Stunden-Reiters ----------

function stundenTabHtml() {
  return `
${logo()}
<h1>Stunden</h1>
<div class="sub-tabs kein-druck">
  <button class="sub2-knopf aktiv" data-st="erfassen">🕒 Stunden erfassen</button>
  <button class="sub2-knopf" data-st="export">📄 Stundenzettel exportieren</button>
</div>

<div id="st-erfassen">
  <p class="kein-druck" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <b>Projekt:</b>
    <select id="stProjekt" style="font:inherit; padding:4px; min-width:240px;"></select>
    <button class="ordner-knopf" data-aktion="st-speichern">💾 Alle Stunden speichern</button>
    <span id="stStatus" style="color:#555;"></span>
  </p>
  <div id="stundenTabelle"></div>
</div>

<div id="st-export" style="display:none">
  <p class="kein-druck" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <b>Projekt:</b>
    <select id="exProjekt" style="font:inherit; padding:4px; min-width:240px;"></select>
    <b>Monat:</b>
    <select id="exMonat" style="font:inherit; padding:4px; min-width:150px;"></select>
    <button class="ordner-knopf" data-aktion="ex-pdf">🖨 Als PDF drucken</button>
    <button class="ordner-knopf" data-aktion="ex-xlsx">📥 Als Excel</button>
    <button class="ordner-knopf" data-aktion="ex-abrechnen">✔ Als abgerechnet markieren</button>
    <span id="exStatus" style="color:#555;"></span>
  </p>
  <details class="kein-druck" style="margin:8px 0"><summary style="cursor:pointer; font-weight:600">⚙ Export-Einstellungen (Kopf des Stundennachweises)</summary>
  <table class="form" style="max-width:640px; margin-top:6px">
    <tr class="bg-grau-h"><td class="label" style="width:240px">Adresse Zeile 1:</td><td><input type="text" id="einstAdresse1"></td></tr>
    <tr class="bg-grau-h"><td class="label">Adresse Zeile 2:</td><td><input type="text" id="einstAdresse2"></td></tr>
    <tr class="bg-grau-h"><td class="label">Kundennummer:</td><td><input type="text" id="einstKundennr"></td></tr>
    <tr class="bg-grau-h"><td class="label">Leistungsnummer:</td><td><input type="text" id="einstLeistungsnr"></td></tr>
    <tr class="bg-grau-h"><td class="label">Lfd. Nr. (Stundensatz):</td><td><input type="text" id="einstLfdnr"></td></tr>
    <tr class="bg-grau-h"><td class="label">Asp BvT (Ansprechpartner):</td><td><input type="text" id="einstAsp"></td></tr>
    <tr class="bg-grau-h"><td colspan="2"><button class="ordner-knopf" data-aktion="einst-speichern">💾 Einstellungen in Datenbank speichern</button></td></tr>
  </table></details>
  <div id="exVorschau"></div>
</div>
`;
}

// ---------- Sub-Reiter (erfassen / export) ----------

function stBereich(name) {
  document.getElementById('st-erfassen').style.display = name === 'erfassen' ? '' : 'none';
  document.getElementById('st-export').style.display = name === 'export' ? '' : 'none';
  document.querySelectorAll('.sub2-knopf').forEach((b) => {
    b.classList.toggle('aktiv', b.dataset.st === name);
  });
  if (name === 'export') exProjekteFuellen();
}

// ---------- Laden / Projektauswahl ----------

async function stundenTabAnzeigen(interaktiv) {
  const ordner = await grundordnerHolen(interaktiv);
  const status = document.getElementById('stStatus');
  if (!ordner) {
    status.textContent = 'Grundordner noch nicht freigegeben – Übersicht öffnen oder „Aktualisieren“.';
    return;
  }
  const db = await dbLesen(ordner);
  dbSetzen(db);
  const sel = document.getElementById('stProjekt');
  const vorher = sel.value;
  const ids = Object.keys(db.projekte).sort((a, b) =>
    (db.projekte[a].name || '').localeCompare(db.projekte[b].name || '')
  );
  sel.innerHTML = ids
    .map((pid) => {
      const p = db.projekte[pid];
      return '<option value="' + pid + '">' + esc(p.name || p.projektnummer || pid) + '</option>';
    })
    .join('');
  if (vorher && db.projekte[vorher]) sel.value = vorher;
  status.textContent = '';
  einstellungenLaden(db);
  stTabRendern();
  exProjekteFuellen();
}

function einstellungenLaden(db) {
  const e = db.einstellungen || {};
  const setzen = (id, wert) => {
    const el = document.getElementById(id);
    if (el && wert !== undefined) el.value = wert;
  };
  setzen('einstAdresse1', e.adresse1);
  setzen('einstAdresse2', e.adresse2);
  setzen('einstKundennr', e.kundennr);
  setzen('einstLeistungsnr', e.leistungsnr);
  setzen('einstLfdnr', e.lfdnr);
  setzen('einstAsp', e.asp);
}

async function einstellungenSpeichern() {
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    db.einstellungen = {
      adresse1: document.getElementById('einstAdresse1').value,
      adresse2: document.getElementById('einstAdresse2').value,
      kundennr: document.getElementById('einstKundennr').value,
      leistungsnr: document.getElementById('einstLeistungsnr').value,
      lfdnr: document.getElementById('einstLfdnr').value,
      asp: document.getElementById('einstAsp').value,
    };
  });
  dbSetzen(db);
  statusText('Export-Einstellungen gespeichert.');
}

// ---------- Stundentabelle (Erfassung) ----------

function stTabRendern() {
  const ziel = document.getElementById('stundenTabelle');
  const pid = document.getElementById('stProjekt').value;
  const db = dbHolen();
  if (!db || !pid || !db.projekte[pid]) {
    ziel.innerHTML = '<p>Kein Projekt gewählt – ggf. zuerst in der Übersicht ein Projekt anlegen und scannen.</p>';
    return;
  }
  const p = db.projekte[pid];
  const typNamen = { protokoll: 'Protokoll', vorbegehung: 'Vorbegehung', belehrung: 'Belehrung' };
  const dateien = Object.keys(p.eintraege)
    .map((k) => { const e = p.eintraege[k]; e.datei = k; return e; })
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || '') || a.datei.localeCompare(b.datei));

  if (!dateien.length) {
    ziel.innerHTML = '<p>Dieses Projekt hat noch keine Protokolle – in der Übersicht „🔍 Scannen“ klicken.</p>';
    return;
  }

  let summe = 0;
  let html = '<table class="form"><tr class="bg-grau">' +
    '<td class="label" style="width:80px">Std.</td><td class="label" style="width:150px">Datum</td>' +
    '<td class="label">Beschreibung</td><td style="width:36px"></td></tr>';

  dateien.forEach((e) => {
    const zeilen = e.stunden && e.stunden.length ? e.stunden : stVorschlag(e);
    const dat = e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '';
    const su = stundenSumme(e);
    summe += su;
    html += '<tr class="bg-blau-h"><td colspan="3" style="font-weight:700">' +
      '<span class="st-status">' + statusIcon(e) + '</span> ' + (typNamen[e.typ] || esc(e.typ)) +
      (e.nummer ? ' Nr. ' + esc(e.nummer) : '') + (dat ? ' · Begehung am ' + dat : '') +
      ' <span style="font-weight:400;color:#666">(' + esc(e.datei) + ')</span>' +
      ' <label class="kein-druck" style="font-weight:400; margin-left:10px; cursor:pointer">' +
      '<input type="checkbox" style="width:14px;height:14px;vertical-align:-2px" ' + (e.abgerechnet ? 'checked ' : '') +
      'data-aktion="st-abgerechnet" data-datei="' + encodeURIComponent(e.datei) + '"> abgerechnet' +
      (e.abgerechnet && e.abgerechnetAm ? ' <span style="color:#666">(am ' + esc(new Date(e.abgerechnetAm).toLocaleDateString('de-DE')) + ')</span>' : '') +
      '</label></td>' +
      '<td><button class="kein-druck" title="Zeile hinzufügen" data-aktion="st-zeile-plus" data-datei="' + encodeURIComponent(e.datei) + '">＋</button></td></tr>';

    zeilen.forEach((z) => {
      html += '<tr class="bg-grau-h" data-datei="' + encodeURIComponent(e.datei) + '">' +
        '<td><input type="text" class="st-std" value="' + esc(z.std) + '" style="width:60px"></td>' +
        '<td><input type="date" class="st-datum" value="' + esc(z.datum) + '"></td>' +
        '<td><input type="text" class="st-beschr" value="' + esc(z.beschreibung) + '"></td>' +
        '<td><button class="kein-druck" data-aktion="st-zeile-entfernen" style="color:#a00">✕</button></td></tr>';
    });
  });

  html += '<tr class="bg-grau"><td class="label">Σ ' + summe + '</td><td colspan="3" style="font-size:11.5px;color:#555">' +
    'Gespeicherte Summe – nach Änderungen „💾 Alle Stunden speichern“ klicken.</td></tr></table>';
  ziel.innerHTML = html;
}

function stZeilePlus(btn) {
  const datei = btn.dataset.datei;
  const kopfzeile = btn.closest('tr');
  const tr = document.createElement('tr');
  tr.className = 'bg-grau-h';
  tr.dataset.datei = datei;
  tr.innerHTML = '<td><input type="text" class="st-std" style="width:60px"></td>' +
    '<td><input type="date" class="st-datum"></td>' +
    '<td><input type="text" class="st-beschr"></td>' +
    '<td><button class="kein-druck" data-aktion="st-zeile-entfernen" style="color:#a00">✕</button></td>';
  let ref = kopfzeile;
  while (ref.nextElementSibling && ref.nextElementSibling.dataset.datei === datei) {
    ref = ref.nextElementSibling;
  }
  ref.parentNode.insertBefore(tr, ref.nextElementSibling);
}

async function abgerechnetSetzen(kasten) {
  const pid = document.getElementById('stProjekt').value;
  const datei = decodeURIComponent(kasten.dataset.datei);
  const neu = kasten.checked;
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    const e = db.projekte[pid] && db.projekte[pid].eintraege[datei];
    if (e) {
      e.abgerechnet = neu;
      e.abgerechnetAm = neu ? new Date().toISOString().slice(0, 10) : '';
    }
  });
  dbSetzen(db);
  const status = kasten.closest('tr').querySelector('.st-status');
  if (status) {
    const e2 = db.projekte[pid].eintraege[datei];
    status.textContent = statusIcon(e2);
  }
  statusText(neu ? 'Als abgerechnet markiert: ' + datei : 'Abrechnungs-Markierung entfernt: ' + datei);
}

async function stTabSpeichern() {
  const pid = document.getElementById('stProjekt').value;
  if (!pid) return;
  const proDatei = {};
  document.querySelectorAll('#stundenTabelle tr[data-datei]').forEach((tr) => {
    const datei = decodeURIComponent(tr.dataset.datei);
    const std = tr.querySelector('.st-std');
    const dat = tr.querySelector('.st-datum');
    const b = tr.querySelector('.st-beschr');
    if (!std) return;
    proDatei[datei] = proDatei[datei] || [];
    if (std.value.trim() || (b && b.value.trim())) {
      proDatei[datei].push({
        std: std.value.trim().replace(',', '.'),
        datum: dat ? dat.value : '',
        beschreibung: b ? b.value : '',
      });
    }
  });

  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  let gesamt = 0;
  const db = await dbAendern(ordner, (db) => {
    const p = db.projekte[pid];
    if (!p) return;
    Object.keys(proDatei).forEach((datei) => {
      if (p.eintraege[datei]) {
        p.eintraege[datei].stunden = proDatei[datei];
        gesamt += stundenSumme(p.eintraege[datei]);
      }
    });
  });
  dbSetzen(db);
  document.getElementById('stStatus').textContent = 'Gespeichert – ' + gesamt + ' Std. im Projekt.';
  stTabRendern();
}

// ---------- Export-Vorschau (Auswahl + Stundenzettel-HTML) ----------

function exProjekteFuellen() {
  const sel = document.getElementById('exProjekt');
  const db = dbHolen();
  if (!db) { document.getElementById('exStatus').textContent = 'Noch keine Projektdaten geladen.'; return; }
  const vorher = sel.value;
  const ids = Object.keys(db.projekte).sort((a, b) =>
    (db.projekte[a].name || '').localeCompare(db.projekte[b].name || '')
  );
  sel.innerHTML = ids
    .map((pid) => {
      const p = db.projekte[pid];
      return '<option value="' + pid + '">' + esc(p.name || p.projektnummer || pid) + '</option>';
    })
    .join('');
  if (vorher && db.projekte[vorher]) sel.value = vorher;
  exMonateFuellen();
}

function exMonateFuellen() {
  const pid = document.getElementById('exProjekt').value;
  const sel = document.getElementById('exMonat');
  const db = dbHolen();
  if (!db || !db.projekte[pid]) { sel.innerHTML = ''; return; }
  const monate = Object.keys(nachMonat(projektStundenzeilen(db.projekte[pid]))).sort();
  sel.innerHTML = monate.map((m) => '<option value="' + m + '">' + monatsName(m) + '</option>').join('') +
    (monate.length > 1 ? '<option value="alle">Alle Monate</option>' : '');
  if (monate.length) sel.value = monate[monate.length - 1];
  exVorschau();
}

function exVorschau() {
  const pid = document.getElementById('exProjekt').value;
  const mkey = document.getElementById('exMonat').value;
  const ziel = document.getElementById('exVorschau');
  const db = dbHolen();
  if (!db || !pid || !mkey) {
    ziel.innerHTML = '<p>Für dieses Projekt sind noch keine Stunden eingetragen.</p>';
    return;
  }
  const p = db.projekte[pid];
  const alle = nachMonat(projektStundenzeilen(p));
  const keys = mkey === 'alle' ? Object.keys(alle).sort() : [mkey];
  ziel.innerHTML = keys.map((k) => zettelBlock(p, db.einstellungen || {}, k, alle[k] || [])).join('') ||
    '<p>Keine Stunden in diesem Zeitraum.</p>';
}

// Baut den Druck-/Vorschau-HTML-Block eines Stundenzettels (ein Monat).
// Wird auch vom PDF-Export (export/xlsx-export.js, Stufe 5) wiederverwendet.
export function zettelBlock(p, einst, mkey, mz) {
  if (!mz.length) return '';
  const summe = mz.reduce((a, z) => a + z.std, 0);
  let html = '<div class="sz-block">' +
    '<div class="sz-kopf">' + esc(einst.adresse1 || '') + '<br>' + esc(einst.adresse2 || '') +
    (einst.kundennr ? '<br>Kundennummer: ' + esc(einst.kundennr) : '') + '</div>' +
    '<div class="sz-titel">Stundennachweis – ' + esc(p.name || '') + ' – ' + monatsName(mkey) + '</div>' +
    '<div class="sz-kopf">' +
    (einst.leistungsnr ? 'Leistungsnummer: ' + esc(einst.leistungsnr) + ' &nbsp;·&nbsp; ' : '') +
    (einst.lfdnr ? 'Lfd. Nr. (Stundenverrechnungssatz Ingenieurkräfte): ' + esc(einst.lfdnr) : '') + '</div>' +
    '<table class="sz"><colgroup>' +
    '<col style="width:4%"><col style="width:11%"><col style="width:12%"><col style="width:12%">' +
    '<col style="width:8%"><col style="width:7%"><col style="width:10%"><col style="width:36%">' +
    '</colgroup><tr>' +
    '<th class="mitte">Pos</th><th>SM Nr.:</th><th>Ort Bvh</th><th>Asp BvT</th><th>Bezeichnung</th>' +
    '<th class="mitte">(LE) Std.</th><th>Datum</th><th>Beschreibung</th></tr>';

  mz.forEach((z, i) => {
    const d = z.datum ? z.datum.split('-').reverse().join('.') : '';
    const rest = '<td class="mitte">' + z.std + '</td><td>' + d + '</td><td>' + esc(z.beschreibung) + '</td>';
    if (i === 0) {
      html += '<tr><td class="mitte" rowspan="' + mz.length + '">1</td>' +
        '<td rowspan="' + mz.length + '">' + esc(smNummer(p)) + '</td>' +
        '<td rowspan="' + mz.length + '">' + esc(p.ort || '') + '</td>' +
        '<td rowspan="' + mz.length + '">' + esc(einst.asp || '') + '</td>' +
        '<td rowspan="' + mz.length + '">ÖBB</td>' + rest + '</tr>';
    } else {
      html += '<tr>' + rest + '</tr>';
    }
  });

  html += '<tr class="summe"><td colspan="5">Summe</td><td class="mitte">' + summe + '</td><td></td><td></td></tr></table></div>';
  return html;
}

// ---------- Initialisierung ----------

export function stundenTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab';
  section.id = 'tab-stunden';
  section.innerHTML = stundenTabHtml();
  mount.appendChild(section);

  section.querySelectorAll('[data-st]').forEach((btn) => {
    btn.addEventListener('click', () => stBereich(btn.dataset.st));
  });
  document.getElementById('stProjekt').addEventListener('change', stTabRendern);
  document.getElementById('exProjekt').addEventListener('change', exMonateFuellen);
  document.getElementById('exMonat').addEventListener('change', exVorschau);

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'st-speichern': stTabSpeichern(); break;
      case 'st-zeile-plus': stZeilePlus(btn); break;
      case 'st-zeile-entfernen': btn.closest('tr').remove(); break;
      case 'einst-speichern': einstellungenSpeichern(); break;
      // ex-pdf / ex-xlsx / ex-abrechnen: verdrahtet in export/xlsx-export.js (Stufe 5)
    }
  });
  section.addEventListener('change', (e) => {
    if (e.target.closest('[data-aktion="st-abgerechnet"]')) {
      abgerechnetSetzen(e.target);
    }
  });
}

// Wird beim Wechsel auf den Stunden-Reiter aufgerufen (siehe ui/tabs.js
// tabWechselHook), analog zu ui/karte.js.
export function stundenBeiAnzeigeAktualisieren(id) {
  if (id === 'tab-stunden') stundenTabAnzeigen(false);
}