// Firmenwahl: Name, Logo und Akzentfarbe der gewählten Firma.
//
// Die Firmen kommen aus firmen.txt im Grundordner, die Logos aus dessen
// Unterordner logos/ (Aufbau siehe config/firmen.js). Solange kein
// Grundordner verbunden ist, gelten die STANDARD_FIRMEN (ohne Logo).
//
// Die Farbe wird als CSS-Variable --firma am <html> gesetzt; das Logo als
// data:-URL in alle .logo-Bilder – dadurch steckt es beim Speichern auch
// automatisch in der Protokolldatei.

import { STANDARD_FIRMEN, FIRMEN_VORLAGE, firmenAusText } from '../config/firmen.js';
import { dateiLesen, dateiSchreiben, dateiAlsDataUrl, unterordnerHolen } from '../core/storage/index.js';

const DATEI = 'firmen.txt';
const LOGO_ORDNER = 'logos';

let firmen = STANDARD_FIRMEN.map((f) => ({ ...f, logoUrl: null }));
let aktuell = 0;

export function aktuelleFirma() {
  return firmen[aktuell] || firmen[0];
}

// Logo der gewählten Firma in alle Protokolle einsetzen (oder leeren).
function logosEinsetzen() {
  const url = aktuelleFirma().logoUrl;
  document.querySelectorAll('.logo img').forEach((img) => {
    if (url) img.src = url;
    else img.removeAttribute('src');
    img.alt = aktuelleFirma().name + ' Logo';
  });
}

// Wählt die Firma Nr. i: Farbe, Logo, Auswahlfeld und Seitentitel (der
// Browser zeigt den Titel als Fenster-/Tab-Namen).
export function firmaSetzen(i) {
  aktuell = Math.max(0, Math.min(firmen.length - 1, Number(i) || 0));
  const f = aktuelleFirma();
  document.documentElement.style.setProperty('--firma', f.farbe);
  const select = document.getElementById('firmenSelect');
  if (select) select.value = String(aktuell);
  document.title = f.name;
  logosEinsetzen();
}

function auswahlFuellen() {
  const select = document.getElementById('firmenSelect');
  if (!select) return;
  select.replaceChildren(...firmen.map((f, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = f.name;
    return o;
  }));
}

export function firmaInit() {
  auswahlFuellen();
  const select = document.getElementById('firmenSelect');
  if (select) select.addEventListener('change', () => firmaSetzen(select.value));
  firmaSetzen(0);
}

// Firmen + Logos aus dem Grundordner lesen. Fehlt firmen.txt, legt die App
// sie mit den Standard-Firmen an (dann kann man sie direkt anpassen).
// Gibt Zeilen für die Statusanzeige zurück.
export async function firmenLaden(ordner) {
  if (!ordner) return [];
  const status = [];
  let text = await dateiLesen(ordner, DATEI);
  if (text == null) {
    try {
      await dateiSchreiben(ordner, DATEI, FIRMEN_VORLAGE);
      text = FIRMEN_VORLAGE;
      status.push('firmen.txt war nicht da und wurde mit den Standard-Firmen angelegt.');
    } catch {
      status.push('firmen.txt fehlt – Standard-Firmen werden verwendet.');
    }
  }
  const { firmen: gelesen, fehler } = firmenAusText(text || '');
  fehler.forEach((f) => status.push('⚠ firmen.txt ' + f));
  const liste = gelesen.length ? gelesen : STANDARD_FIRMEN;

  const logoOrdner = await unterordnerHolen(ordner, LOGO_ORDNER);
  const neu = [];
  for (const f of liste) {
    let logoUrl = null;
    if (f.logo) {
      // Im Ordner logos/ – zur Sicherheit auch direkt im Grundordner (alter Ort).
      logoUrl = (logoOrdner && await dateiAlsDataUrl(logoOrdner, f.logo)) || await dateiAlsDataUrl(ordner, f.logo);
      status.push(logoUrl ? '✅ ' + f.name + ': ' + f.logo : '⚠ ' + f.name + ': Logo „' + f.logo + '“ nicht im Ordner logos gefunden');
    } else {
      status.push('⚠ ' + f.name + ': kein Logo angegeben');
    }
    neu.push({ ...f, logoUrl });
  }

  // Gewählte Firma beibehalten, wenn es sie noch gibt.
  const vorher = aktuelleFirma().name;
  firmen = neu;
  auswahlFuellen();
  const i = firmen.findIndex((f) => f.name === vorher);
  firmaSetzen(i >= 0 ? i : 0);
  return status;
}
