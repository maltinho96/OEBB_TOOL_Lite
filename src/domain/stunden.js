// Reine Rechenlogik rund um Stunden – KEINE DOM-Zugriffe.
// Dadurch in tests/ ohne Browser prüfbar.

import { MONATE } from '../config/konstanten.js';

// Statussymbol eines Eintrags: hat Stunden / nur Protokoll.
export function statusIcon(e) {
  return stundenSumme(e) > 0 ? '🕒' : '📄';
}

// Summe aller Stunden eines Eintrags.
export function stundenSumme(e) {
  return (e.stunden || []).reduce((a, z) => a + (parseFloat(z.std) || 0), 0);
}

// Vorschlagszeilen für einen Eintrag (AD-/ID-Standardzeilen).
export function stVorschlag(eintrag) {
  const nr = eintrag.nummer
    ? (eintrag.nummer.length < 2 ? '0' + eintrag.nummer : eintrag.nummer)
    : '';
  const praefix = nr ? nr + '.ÖBB' : 'ÖBB';
  return [
    {
      std: '',
      datum: eintrag.datum || '',
      beschreibung:
        praefix + ' AD inkl. An- und Abfahrt' +
        (eintrag.typ === 'vorbegehung' ? ' + Vorbegehung' : ''),
    },
    {
      std: '',
      datum: eintrag.datum || '',
      beschreibung: praefix + ' ID Protokollerstellung inkl. Emails, Telefonate mit AG, Amt, etc.',
    },
  ];
}

// Alle Stundenzeilen eines Projekts (nur mit Std > 0), nach Datum sortiert.
export function projektStundenzeilen(p) {
  const zeilen = [];
  Object.keys(p.eintraege).forEach((datei) => {
    (p.eintraege[datei].stunden || []).forEach((z, idx) => {
      if (parseFloat(z.std)) {
        zeilen.push({
          std: parseFloat(z.std),
          datum: z.datum || '',
          beschreibung: z.beschreibung || '',
          datei,
          idx,
        });
      }
    });
  });
  zeilen.sort((a, b) => a.datum.localeCompare(b.datum));
  return zeilen;
}

// Zeilen nach Monat (Schlüssel "JJJJ-MM" bzw. "ohne-Datum") gruppieren.
export function nachMonat(zeilen) {
  const monate = {};
  zeilen.forEach((z) => {
    const key = z.datum ? z.datum.slice(0, 7) : 'ohne-Datum';
    (monate[key] = monate[key] || []).push(z);
  });
  return monate;
}

// Lesbarer Monatsname aus dem Schlüssel.
export function monatsName(key) {
  if (key === 'ohne-Datum') return 'ohne Datum';
  return MONATE[parseInt(key.slice(5, 7), 10) - 1] + ' ' + key.slice(0, 4);
}

// SM-Nr. für den Stundennachweis: exakt das, was beim Projekt-Anlegen
// als Projektnummer eingetragen wurde – keine Umformung.
export function smNummer(p) {
  return p.projektnummer || '';
}