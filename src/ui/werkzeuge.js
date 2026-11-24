// Verdrahtet den Werkzeugleisten-Knopf "Drucken/PDF" (druckt den aktuell
// sichtbaren Reiter über druck.css). 'speichern' verdrahtet
// export/html-export.js.

import { PROTOKOLL_TABS } from '../config/konstanten.js';
import { aktiverTab, statusText } from '../core/util.js';
import { istDesktop, gespeicherterProjektordner, pdfSpeichern } from '../core/storage/index.js';
import { dateinameBauen } from '../export/html-export.js';

// Die Fußzeile mit "Seite x/y" (ui/fusszeile.js) beherrschen nur Chrome
// und Edge ab Version 131. Firefox und Safari lassen sie weg.
function fusszeileMoeglich() {
  const m = /Chrome\/(\d+)/.exec(navigator.userAgent);
  return !!m && Number(m[1]) >= 131 && !/Firefox\//.test(navigator.userAgent);
}

let gewarnt = false;

function drucken() {
  if (!fusszeileMoeglich() && !gewarnt) {
    gewarnt = true;
    const weiter = confirm(
      'Hinweis: Dieser Browser druckt die Fußzeile (Datum · Auftrag · Seite x/y) nicht mit.\n\n' +
      'Für das fertige PDF bitte Google Chrome oder Microsoft Edge verwenden.\n\n' +
      'Trotzdem jetzt drucken?'
    );
    if (!weiter) return;
  }
  window.print();
}

// Windows-Programm: PDF direkt in den Protokollordner des gewählten Projekts
// (der Druckdialog kann keinen Zielordner vorgeben).
async function alsPdfSpeichern() {
  const tab = aktiverTab();
  if (!tab || !PROTOKOLL_TABS.includes(tab.id)) {
    alert('Bitte zuerst einen Protokoll-Reiter öffnen (Begehung/Vorbegehung/Belehrung).');
    return;
  }
  const pid = tab.dataset.projektId;
  const start = pid ? await gespeicherterProjektordner(pid).catch(() => null) : null;
  const name = dateinameBauen(tab).replace(/\.html$/, '.pdf');
  let vorbereitet = false;
  try {
    const ziel = await pdfSpeichern(name, start, async () => {
      // Dieselben Vorbereitungen wie beim Drucken (Kartenbilder, Fußzeile, Textfelder).
      window.dispatchEvent(new Event('beforeprint'));
      vorbereitet = true;
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300)));
    });
    if (ziel) statusText('📄 PDF gespeichert: ' + ziel);
  } catch (e) {
    alert('PDF konnte nicht gespeichert werden:\n' + (e && e.message ? e.message : e));
  } finally {
    if (vorbereitet) window.dispatchEvent(new Event('afterprint'));
  }
}

export function werkzeugeInit() {
  const leiste = document.querySelector('.werkzeuge');
  if (!leiste) return;
  if (istDesktop() && /Windows/.test(navigator.userAgent)) {
    leiste.querySelectorAll('[data-aktion="pdf-speichern"]').forEach((btn) => {
      btn.hidden = false;
      btn.addEventListener('click', alsPdfSpeichern);
    });
  }
  leiste.querySelectorAll('[data-aktion="drucken"]').forEach((btn) => {
    btn.addEventListener('click', drucken);
  });
}
