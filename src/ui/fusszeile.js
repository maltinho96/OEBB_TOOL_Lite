// Fußzeile im Format:   Datum    Ökologische Baubegleitung im Auftrag der „…"    Seite 1/3
//
// Zwei Darstellungen, beide aus denselben Daten:
//  - Bildschirm: Vorschau-Zeile am Ende des Protokolls (.dok-fusszeile).
//  - Druck/PDF: CSS-Seitenränder (@page @bottom-left/-center/-right). Der
//    Browser setzt die Zeile damit auf JEDE Seite und zählt die Seiten
//    selbst (counter(page) / counter(pages)). Unterstützt von Chrome und
//    Edge ab Version 131.
//
// Da sich Text, Datum und Firmenfarbe ändern können, wird die @page-Regel
// als <style id="druckFussStil"> erzeugt und bei jeder relevanten Änderung
// neu geschrieben (Eingabe in Datum/Auftraggeber, Reiterwechsel, Firma).

import { PROTOKOLL_TABS } from '../config/konstanten.js';

function datumDeutsch(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (m) return m[3] + '.' + m[2] + '.' + m[1];
  const d = new Date();
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
}

function daten(tab) {
  const ag = tab.querySelector('[data-feld="auftraggeber-fuss"]');
  const dt = tab.querySelector('[data-feld="datum"]');
  const auftraggeber = ag ? ag.value.trim() : '';
  return {
    datum: datumDeutsch(dt ? dt.value : ''),
    text: auftraggeber
      ? 'Ökologische Baubegleitung im Auftrag der „' + auftraggeber + '“'
      : 'Ökologische Baubegleitung',
  };
}

// Text sicher als CSS-Zeichenkette ("…") schreiben.
function cssText(s) {
  return '"' + String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function vorschauFuellen(tab) {
  const el = tab.querySelector('[data-dok-fusszeile]');
  if (!el) return;
  const d = daten(tab);
  const datum = el.querySelector('.fz-datum');
  const text = el.querySelector('.fz-text');
  if (datum) datum.textContent = d.datum;
  if (text) text.textContent = d.text;
}

function druckStilSchreiben() {
  let stil = document.getElementById('druckFussStil');
  if (!stil) {
    stil = document.createElement('style');
    stil.id = 'druckFussStil';
    document.head.appendChild(stil);
  }
  const aktiv = document.querySelector('.tab.aktiv');
  const istProtokoll = aktiv && PROTOKOLL_TABS.includes(aktiv.id);
  const d = istProtokoll ? daten(aktiv) : { datum: '', text: '' };
  const farbe = getComputedStyle(document.documentElement).getPropertyValue('--firma').trim() || '#333';
  const box = 'font-family:"Segoe UI",system-ui,sans-serif; font-size:8pt; color:' + farbe + ';';

  stil.textContent =
    '@media print { @page {' +
    '@bottom-left { content:' + cssText(d.datum) + '; ' + box + ' text-align:left; }' +
    '@bottom-center { content:' + cssText(d.text) + '; ' + box + ' text-align:center; }' +
    '@bottom-right { content:"Seite " counter(page) "/" counter(pages); ' + box + ' text-align:right; }' +
    '} }';
}

function aktualisieren(tab) {
  if (tab) vorschauFuellen(tab);
  druckStilSchreiben();
}

// Als tabWechselHook registrieren: der Druck nutzt immer den sichtbaren Reiter.
export function fusszeileBeiAnzeige(id) {
  aktualisieren(document.getElementById(id));
}

export function fusszeileInit() {
  document.querySelectorAll('.tab').forEach(vorschauFuellen);
  druckStilSchreiben();

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('[data-feld="auftraggeber-fuss"], [data-feld="datum"]')) {
      aktualisieren(t.closest('.tab'));
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t) return;
    if (t.id === 'firmenSelect') {
      // Firmenfarbe wechselt erst nach dem Umschalten der Klasse am <html>.
      setTimeout(druckStilSchreiben, 0);
    } else if (t.matches && t.matches('[data-feld="datum"]')) {
      aktualisieren(t.closest('.tab'));
    }
  });
  // Sicherheitshalber direkt vor dem Drucken nochmal (z. B. nach Import).
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.tab').forEach(vorschauFuellen);
    druckStilSchreiben();
  });
}
