// Stundenzettel-Export: Excel-Arbeitsmappe (ein Blatt je Monat, formatiert),
// PDF-Druck des Stunden-Reiters, "als abgerechnet markieren" und der
// Monatsauswahl-Dialog, den die Übersichtstabelle beim Sprung aus einem
// Projekt öffnet. Originalgetreu portiert; xlsx-js-style ersetzt die im
// Original eingebettete Kopie derselben Bibliothek (kommt jetzt aus npm).

import * as XLSX from 'xlsx-js-style';
import { statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbLesen, dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { projektStundenzeilen, nachMonat, monatsName, smNummer } from '../domain/stunden.js';
import { tabZeigen } from '../ui/tabs.js';
import { stBereich, exMonateFuellen, exVorschau } from '../ui/stundentabelle.js';

// ---------- Excel-Arbeitsmappe bauen ----------

function arbeitsmappeBauen(db, pid, mkey) {
  const p = db.projekte[pid];
  let zeilen = projektStundenzeilen(p);
  if (mkey && mkey !== 'alle') {
    zeilen = zeilen.filter((z) => (z.datum || '').slice(0, 7) === mkey);
  }
  if (!zeilen.length) return null;

  const monate = nachMonat(zeilen);
  const einst = db.einstellungen || {};
  const wb = XLSX.utils.book_new();

  const duenn = { style: 'thin', color: { rgb: '000000' } };
  const rand = { top: duenn, bottom: duenn, left: duenn, right: duenn };
  const basis = { font: { name: 'Arial', sz: 10 }, alignment: { vertical: 'top', wrapText: true } };
  const st = (extra) => Object.assign({}, basis, extra || {});

  Object.keys(monate).sort().forEach((mk) => {
    const mz = monate[mk];
    const aoa = [
      [], [einst.adresse1 || ''], [einst.adresse2 || ''], [einst.kundennr || ''], [],
      ['Stundennachweis', '', '', '', '', 'Stundenverrechnungssatz\nIngenieurkräfte'],
      ['Leistungsnummer', '', '', '', '', einst.leistungsnr || ''],
      ['Lfd. Nr.', '', '', '', '', einst.lfdnr || ''],
      ['Pos', 'SM Nr.:', 'Ort Bvh', 'Asp BvT', 'Bezeichnung', '(LE) Std.', 'Datum', 'Beschreibung'],
      [],
    ];
    let summe = 0;
    mz.forEach((z, i) => {
      const d = z.datum ? z.datum.split('-').reverse().join('.') : '';
      summe += z.std;
      if (i === 0) aoa.push([1, smNummer(p), p.ort || '', einst.asp || '', 'ÖBB', z.std, d, z.beschreibung]);
      else aoa.push(['', '', '', '', '', z.std, d, z.beschreibung]);
    });
    aoa.push(['Summe', '', '', '', '', summe, '', '']);
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const erste = 10;
    const letzte = 9 + mz.length;
    const summeZ = letzte + 1;

    const zelle = (r, c) => {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { t: 's', v: '' };
      return ws[a];
    };

    for (let r = 1; r <= 3; r++) zelle(r, 0).s = st({ font: { name: 'Arial', sz: 10, color: { rgb: '555555' } } });
    zelle(5, 0).s = st({ font: { name: 'Arial', sz: 14, bold: true } });
    zelle(5, 5).s = st({
      font: { name: 'Arial', sz: 9, bold: true },
      alignment: { wrapText: true, vertical: 'center' },
      border: rand,
      fill: { fgColor: { rgb: 'F2F2F2' } },
    });
    [[6, 'Leistungsnummer'], [7, 'Lfd. Nr.']].forEach((x) => {
      zelle(x[0], 0).s = st({ font: { name: 'Arial', sz: 10, bold: true } });
      zelle(x[0], 5).s = st({ border: rand, alignment: { horizontal: 'center', vertical: 'center' } });
    });
    for (let c = 0; c < 8; c++) {
      zelle(8, c).s = st({
        font: { name: 'Arial', sz: 10, bold: true },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        border: rand,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      });
      zelle(9, c).s = st({ fill: { fgColor: { rgb: 'D9D9D9' } }, border: rand });
    }
    for (let r2 = erste; r2 <= letzte; r2++) {
      for (let c2 = 0; c2 < 8; c2++) {
        const ausricht = c2 === 0 || c2 === 5 ? 'center' : 'left';
        zelle(r2, c2).s = st({ border: rand, alignment: { horizontal: ausricht, vertical: 'top', wrapText: c2 === 7 } });
      }
    }
    for (let c3 = 0; c3 < 8; c3++) {
      zelle(summeZ, c3).s = st({
        font: { name: 'Arial', sz: 10, bold: true },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        border: rand,
        alignment: { horizontal: c3 === 5 ? 'center' : 'left' },
      });
    }

    ws['!merges'] = [
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
      { s: { r: 8, c: 2 }, e: { r: 9, c: 2 } },
      { s: { r: 8, c: 4 }, e: { r: 9, c: 4 } },
      { s: { r: summeZ, c: 0 }, e: { r: summeZ, c: 4 } },
    ];
    if (mz.length > 1) {
      for (let sp = 0; sp < 5; sp++) ws['!merges'].push({ s: { r: erste, c: sp }, e: { r: letzte, c: sp } });
    }
    ws['!cols'] = [{ wch: 6 }, { wch: 13 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 9 }, { wch: 12 }, { wch: 64 }];
    ws['!rows'] = [{ hpt: 6 }, { hpt: 14 }, { hpt: 14 }, { hpt: 14 }, { hpt: 6 }, { hpt: 26 }, { hpt: 16 }, { hpt: 16 }, { hpt: 22 }, { hpt: 6 }];
    XLSX.utils.book_append_sheet(wb, ws, monatsName(mk).slice(0, 31));
  });

  return wb;
}

// ---------- Monatsauswahl-Dialog ----------

let monatDialogAufloeser = null;

// Legt das Dialog-Overlay einmalig an (index.html enthält es im Original
// fest; hier erzeugen wir es bei Bedarf, analog zu ui/fotos.js).
function monatDialogElement() {
  let el = document.getElementById('monatDialog');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'monatDialog';
  el.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; align-items:center; justify-content:center;';
  el.innerHTML =
    '<div style="background:#fff; border-radius:10px; padding:20px 24px; min-width:300px; box-shadow:0 4px 24px rgba(0,0,0,.3);">' +
    '<div style="font-weight:700; margin-bottom:10px;">Monat wählen</div>' +
    '<select id="monatDialogSelect" style="font:inherit; padding:6px; width:100%;"></select>' +
    '<div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">' +
    '<button class="ordner-knopf" data-aktion="monat-dialog-abbrechen">Abbrechen</button>' +
    '<button class="ordner-knopf" style="background:var(--firma); color:#fff; border-color:var(--firma);" data-aktion="monat-dialog-ok">OK</button>' +
    '</div></div>';
  document.body.appendChild(el);
  el.querySelector('[data-aktion="monat-dialog-abbrechen"]').addEventListener('click', () => monatDialogSchliessen(null));
  el.querySelector('[data-aktion="monat-dialog-ok"]').addEventListener('click', () =>
    monatDialogSchliessen(document.getElementById('monatDialogSelect').value)
  );
  return el;
}

function monatDialog(p) {
  const monate = Object.keys(nachMonat(projektStundenzeilen(p))).sort();
  if (!monate.length) {
    alert('Für dieses Projekt sind noch keine Stunden eingetragen.');
    return Promise.resolve(null);
  }
  const el = monatDialogElement();
  const sel = document.getElementById('monatDialogSelect');
  sel.innerHTML = '<option value="alle">Alle Monate</option>' +
    monate.map((m) => `<option value="${m}">${monatsName(m)}</option>`).join('');
  sel.value = monate[monate.length - 1];
  el.style.display = 'flex';
  return new Promise((res) => { monatDialogAufloeser = res; });
}

function monatDialogSchliessen(wert) {
  const el = document.getElementById('monatDialog');
  if (el) el.style.display = 'none';
  if (monatDialogAufloeser) { monatDialogAufloeser(wert); monatDialogAufloeser = null; }
}

// ---------- Aktionen ----------

async function projektExportieren(pid, mkey) {
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbLesen(ordner);
  dbSetzen(db);
  if (!mkey) { mkey = await monatDialog(db.projekte[pid]); if (!mkey) return; }
  const wb = arbeitsmappeBauen(db, pid, mkey);
  if (!wb) { alert('Für diese Auswahl sind keine Stunden eingetragen.'); return; }
  const p = db.projekte[pid];
  const ort = (p.ort || p.name || 'Projekt').replace(/[^\wäöüÄÖÜß-]+/g, '-');
  const sm = smNummer(p);
  const monat = mkey && mkey !== 'alle' ? '_' + monatsName(mkey).replace(' ', '-') : '';
  XLSX.writeFile(wb, 'Stundennachweis_' + ort + (sm ? '_SM' + sm : '') + monat + '.xlsx');
}

function exPdf() {
  const st = document.createElement('style');
  st.textContent = '@media print{ .blatt > section:not(#tab-stunden){display:none !important;} ' +
    '#st-erfassen{display:none !important;} .sub-tabs{display:none !important;} h1{display:none !important;} details{display:none !important;} }';
  document.head.appendChild(st);
  window.print();
  setTimeout(() => st.remove(), 500);
}

async function exXlsx() {
  const pid = document.getElementById('exProjekt').value;
  const mkey = document.getElementById('exMonat').value;
  if (!pid || !mkey) return;
  await projektExportieren(pid, mkey);
}

async function exAbrechnen() {
  const pid = document.getElementById('exProjekt').value;
  const mkey = document.getElementById('exMonat').value;
  if (!pid || !mkey) return;
  const mkeys = mkey === 'alle' ? null : [mkey];
  let anzahl = 0;
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    const p = db.projekte[pid];
    Object.keys(p.eintraege).forEach((datei) => {
      const e = p.eintraege[datei];
      const betroffen = (e.stunden || []).some((z) =>
        parseFloat(z.std) && (!mkeys || mkeys.indexOf((z.datum || '').slice(0, 7)) >= 0)
      );
      if (betroffen && !e.abgerechnet) {
        e.abgerechnet = true;
        e.abgerechnetAm = new Date().toISOString().slice(0, 10);
        anzahl++;
      }
    });
  });
  dbSetzen(db);
  document.getElementById('exStatus').textContent = anzahl + ' Protokoll(e) als abgerechnet markiert.';
}

// Sprungziel aus der Übersichtstabelle (🖨-Knopf je Projekt).
function stundenzettelDrucken(pid, mkey) {
  tabZeigen('tab-stunden');
  stBereich('export');
  setTimeout(() => {
    const ps = document.getElementById('exProjekt');
    const db = dbHolen();
    if (ps && db && db.projekte[pid]) { ps.value = pid; exMonateFuellen(); }
    if (mkey) {
      const ms = document.getElementById('exMonat');
      if (ms) { ms.value = mkey; exVorschau(); }
    }
  }, 100);
}

// ---------- Initialisierung ----------

// Verdrahtet die Export-Knöpfe im Stunden-Reiter (data-aktion="ex-*") und
// die Sprung-Knöpfe in der Übersichtstabelle (data-aktion="projekt-exportieren"
// / "stundenzettel-drucken"), per Delegation auf document, da beide
// Bereiche unabhängig voneinander gemountet werden.
export function xlsxExportInit() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'ex-pdf': exPdf(); break;
      case 'ex-xlsx': exXlsx(); break;
      case 'ex-abrechnen': exAbrechnen(); break;
      case 'projekt-exportieren': projektExportieren(btn.dataset.pid); break;
      case 'stundenzettel-drucken': {
        const monatSel = document.getElementById('mon_' + btn.dataset.pid);
        stundenzettelDrucken(btn.dataset.pid, monatSel ? monatSel.value : null);
        break;
      }
    }
  });
}