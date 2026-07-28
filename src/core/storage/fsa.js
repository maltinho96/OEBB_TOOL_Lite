// Speicher-Backend fuer die Browserphase: File System Access API.
// Kapselt alle FSA-Details (Ordnerauswahl, Rechte, Datei-IO, Scan) und
// persistiert die Ordner-Handles in IndexedDB, damit sie eine Sitzung
// ueberdauern. Spaeter tritt daneben ein tauri.js hinter dieselbe Fassade.
//
// Hinweis: Die Ordner-Funktionen brauchen Chromium/Chrome/Edge.

import { DB_NAME } from '../../config/konstanten.js';

// ---------- IndexedDB fuer die Ordner-Handles ----------
function idbOeffnen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('oebb-app', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('einstellungen');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbSetzen(schluessel, wert) {
  return idbOeffnen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('einstellungen', 'readwrite');
    tx.objectStore('einstellungen').put(wert, schluessel);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}
function idbHolen(schluessel) {
  return idbOeffnen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('einstellungen', 'readonly');
    const g = tx.objectStore('einstellungen').get(schluessel);
    g.onsuccess = () => res(g.result);
    g.onerror = () => rej(g.error);
  }));
}

// ---------- Zwischenspeicher fuer Handles in dieser Sitzung ----------
let grundOrdner = null;
const projektOrdnerCache = {};

// ---------- Verfuegbarkeit / Rechte ----------
export function fsaVerfuegbar() {
  if (window.showDirectoryPicker) return true;
  alert('Dieser Browser unterstuetzt die Ordner-Freigabe (File System Access API) nicht.\nBitte Chromium, Chrome oder Edge verwenden.');
  return false;
}

async function handleHolen(schluessel, zwischenspeicher, interaktiv) {
  const h = zwischenspeicher || await idbHolen(schluessel).catch(() => null);
  if (!h) return null;
  let p = await h.queryPermission({ mode: 'readwrite' });
  if (p !== 'granted' && interaktiv) p = await h.requestPermission({ mode: 'readwrite' });
  return p === 'granted' ? h : null;
}

// ---------- Grundordner ----------
export async function waehleGrundordner() {
  if (!fsaVerfuegbar()) return null;
  try {
    grundOrdner = await window.showDirectoryPicker({ mode: 'readwrite' });
    await idbSetzen('grundOrdner', grundOrdner);
    return grundOrdner;
  } catch (e) {
    return null; // abgebrochen
  }
}
export async function grundordnerHolen(interaktiv) {
  const h = await handleHolen('grundOrdner', grundOrdner, interaktiv);
  if (h) grundOrdner = h;
  return h;
}

// ---------- Projektordner ----------
export async function waehleProjektordner(id) {
  if (!fsaVerfuegbar()) return null;
  try {
    const h = await window.showDirectoryPicker({ mode: 'read' });
    projektOrdnerCache[id] = h;
    await idbSetzen('projektOrdner:' + id, h);
    return h;
  } catch (e) {
    return null; // abgebrochen
  }
}
export async function projektOrdnerHolen(id, interaktiv) {
  const h = await handleHolen('projektOrdner:' + id, projektOrdnerCache[id], interaktiv);
  if (h) projektOrdnerCache[id] = h;
  return h;
}

// ---------- Datenbank-Datei lesen/schreiben ----------
// Gibt den Rohtext der oebb_datenbank.json zurueck oder null (fehlt/leer).
export async function leseDbText(ordner) {
  try {
    const fh = await ordner.getFileHandle(DB_NAME);
    const f = await fh.getFile();
    return await f.text();
  } catch (e) {
    return null;
  }
}
export async function schreibeDbText(ordner, text) {
  const fh = await ordner.getFileHandle(DB_NAME, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

// ---------- HTML-Dateien im Projektordner scannen ----------
// Laeuft rekursiv (max. Tiefe 3) und liefert je HTML-Datei den Kopf-Text
// (erste 200 kB) plus Aenderungsdatum. Das Parsen der Metadaten macht
// die Aufrufer-Schicht (domain/projekt.js) – hier nur Datei-IO.
export async function scanneHtmlDateien(ordner) {
  const treffer = [];
  let geprueft = 0;

  async function rekursiv(handle, pfad, tiefe) {
    for await (const eintrag of handle.values()) {
      if (eintrag.kind === 'file' && eintrag.name.toLowerCase().endsWith('.html')) {
        geprueft++;
        try {
          const f = await eintrag.getFile();
          const kopf = await f.slice(0, 200000).text();
          treffer.push({ pfad: pfad + eintrag.name, kopf, geaendert: f.lastModified });
        } catch (err) { /* Datei ueberspringen */ }
      } else if (eintrag.kind === 'directory' && tiefe < 3) {
        await rekursiv(eintrag, pfad + eintrag.name + '/', tiefe + 1);
      }
    }
  }
  await rekursiv(ordner, '', 0);
  return { treffer, geprueft };
}
