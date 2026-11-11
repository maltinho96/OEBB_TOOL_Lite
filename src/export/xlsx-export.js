// Stundenzettel-Export: Excel-Arbeitsmappe (ein Blatt je Monat, formatiert),
// PDF-Druck des Stunden-Reiters und der
// Monatsauswahl-Dialog, den die Übersichtstabelle beim Sprung aus einem
// Projekt öffnet. Originalgetreu portiert; xlsx-js-style ersetzt die im
// Original eingebettete Kopie derselben Bibliothek (kommt jetzt aus npm).

import * as XLSX from 'xlsx-js-style';
import { istAndroidApp, androidSpeichern } from '../core/android.js';
import { statusText } from '../core/util.js';
import { grundordnerHolen, istDesktop, speichernUnter } from '../core/storage/index.js';
import { dbLesen } from '../core/db.js';
import { dbSetzen } from '../core/zustand.js';
import { projektStundenzeilen, nachMonat, monatsName, smNummer } from '../domain/stunden.js';

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
      if (i === 0) aoa.push([1, smNummer(p), p.ort || '', (p.infos && p.infos.ansprechpartner) || '', 'ÖBB', z.std, d, z.beschreibung]);
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

async function projektExportieren(pid, mkey) {
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbLesen(ordner);
  dbSetzen(db);
  const wb = arbeitsmappeBauen(db, pid, mkey);
  if (!wb) { alert('Für diese Auswahl sind keine Stunden eingetragen.'); return; }
  const p = db.projekte[pid];
  const ort = (p.ort || p.name || 'Projekt').replace(/[^\wäöüÄÖÜß-]+/g, '-');
  const sm = smNummer(p);
  const monat = mkey && mkey !== 'alle' ? '_' + monatsName(mkey).replace(' ', '-') : '';
  const name = 'Stundennachweis_' + ort + (sm ? '_SM' + sm : '') + monat + '.xlsx';
  if (istDesktop()) {
    await speichernUnter(name, ordner, { base64: XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) },
      { name: 'Excel', extensions: ['xlsx'] }).catch((e) => alert('Speichern fehlgeschlagen:\n' + e));
    return;
  }
  if (istAndroidApp()) {
    await androidSpeichern(name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), true);
    return;
  }
  XLSX.writeFile(wb, name);
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

// ---------- Initialisierung ----------

// Verdrahtet die Export-Knöpfe im Stunden-Reiter (data-aktion="ex-*").
export function xlsxExportInit() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'ex-pdf': exPdf(); break;
      case 'ex-xlsx': exXlsx(); break;
    }
  });
}
