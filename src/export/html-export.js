// "Speichern unter…": exportiert den aktiven Protokoll-Reiter als
// eigenständige HTML-Datei (Speicherdialog, mit Download-Fallback für
// Firefox). Originalgetreu in der Logik (Zustand sichern, Dateiname
// bauen, Metadaten aktualisieren); die Serialisierung selbst nutzt
// export/html-vorlage.js statt document.documentElement.outerHTML, weil
// die modulare App kein monolithisches Dokument mehr ist (siehe dort).

import { baueMeta, metaSerialisieren } from '../core/meta.js';
import { htmlVorlage } from './html-vorlage.js';
import { bildElementeEinbetten } from '../core/bilder.js';

// Aktuell sichtbarer Protokoll-Tab.
function aktiverTab() {
  return document.querySelector('.tab.aktiv');
}

// Live-Werte (Inputs/Textareas/Checkboxen/Selects) als Attribute im DOM
// festschreiben, damit sie beim outerHTML-Export erhalten bleiben.
// Nur innerhalb des zu exportierenden Tabs nötig – hier wie im Original
// leicht großzügiger über das ganze Dokument, das schadet nicht.
function zustandSichern(scope) {
  scope.querySelectorAll('input[type=text],input[type=date],input[type=tel],input[type=email]').forEach((i) => {
    i.setAttribute('value', i.value);
  });
  scope.querySelectorAll('textarea').forEach((t) => { t.textContent = t.value; });
  scope.querySelectorAll('input[type=checkbox],input[type=radio]').forEach((c) => {
    if (c.checked) c.setAttribute('checked', '');
    else c.removeAttribute('checked');
  });
  scope.querySelectorAll('select').forEach((s) => {
    Array.from(s.options).forEach((o) => {
      if (o.selected) o.setAttribute('selected', '');
      else o.removeAttribute('selected');
    });
  });
}

// Vorschlagsdateiname nach Protokolltyp, Begehungsdatum (oder heute) und Ort.
function dateinameBauen(tab) {
  function feld(name) {
    const el = tab.querySelector('[data-feld=' + name + ']');
    return el ? (el.value || '').trim() : '';
  }
  function sauber(text) {
    return text.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
  }
  const d = feld('datum');
  const datum = d ? d.slice(2).replace(/-/g, '') : new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const ort = sauber(feld('ort')) || 'Ort';
  const typ = tab.id.replace('tab-', '');

  if (typ === 'protokoll') {
    const nr = sauber(feld('nummer')) || 'XX';
    return datum + '_' + nr + '.Protokoll_' + ort + '.html';
  }
  if (typ === 'vorbegehung') return datum + '_Vorbegehungsprotokoll_' + ort + '.html';
  if (typ === 'belehrung') return datum + '_Belehrungsprotokoll_' + ort + '.html';
  return datum + '_OEBB_Protokoll.html';
}

// Meta-Objekt aus den Formularfeldern des aktiven Tabs bauen.
function metaAusTab(tab) {
  function feld(name) {
    const el = tab.querySelector('[data-feld=' + name + ']');
    return el ? (el.value || '').trim() : '';
  }
  return baueMeta({
    typ: tab.id.replace('tab-', ''),
    firma: document.documentElement.classList.contains('firma-ing')
      ? 'NET-TEC Ingenieurgesellschaft mbH'
      : 'NET-TEC GREENgineers GmbH',
    nummer: feld('nummer'),
    projekt: feld('projekt'),
    projektnummer: feld('projektnummer'),
    ort: feld('ort'),
    datum: feld('datum'),
  });
}

export async function alsHtmlSpeichern() {
  const tab = aktiverTab();
  if (!tab || !tab.id.startsWith('tab-') || ['tab-uebersicht', 'tab-karte', 'tab-stunden'].includes(tab.id)) {
    alert('Bitte zuerst einen Protokoll-Reiter öffnen (Begehung/Vorbegehung/Belehrung).');
    return;
  }

  zustandSichern(tab);
  await bildElementeEinbetten(tab);
  const meta = metaAusTab(tab);
  const metaScriptTag =
    '<script type="application/json" id="protokollMeta">' + metaSerialisieren(meta) + '</script>';
  const firmaKlasse = document.documentElement.classList.contains('firma-ing') ? 'firma-ing' : 'firma-greens';

  const inhalt = htmlVorlage({
    firmaKlasse,
    titel: meta.projekt || meta.typ,
    bodyHtml: tab.outerHTML,
    metaScriptTag,
  });
  const vorschlag = dateinameBauen(tab);

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: vorschlag,
        types: [{ description: 'HTML-Protokoll', accept: { 'text/html': ['.html'] } }],
      });
      const schreibbar = await handle.createWritable();
      await schreibbar.write(inhalt);
      await schreibbar.close();
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // Dialog abgebrochen
      // sonst auf Download zurückfallen
    }
  }
  // Fallback (z. B. Firefox): klassischer Download
  const blob = new Blob([inhalt], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = vorschlag;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// Verdrahtet den Werkzeugleisten-Knopf data-aktion="speichern" (index.html).
export function htmlExportInit() {
  document.querySelectorAll('[data-aktion="speichern"]').forEach((btn) => {
    btn.addEventListener('click', alsHtmlSpeichern);
  });
}