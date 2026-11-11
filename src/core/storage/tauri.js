// Speicher-Backend der Desktop-App (Tauri). Gleiche Funktionen wie fsa.js,
// aber statt Browser-Handles werden Ordner als { pfad, name, kind } geführt
// und alle Zugriffe laufen über die Rust-Befehle in src-tauri/src/lib.rs.
//
// Das Programm lässt nur Zugriffe auf freigegebene Ordner zu: den
// Grundordner aus oebb-konfig.txt und Ordner/Dateien, die in einem Dialog
// des Programms gewählt wurden (siehe „Zugriffsschutz“ in lib.rs).

import { DB_NAME } from '../../config/konstanten.js';

const T = () => window.__TAURI__;
const aufruf = (befehl, args) => T().core.invoke(befehl, args);

let grundOrdner = null;

function ordnerHandle(pfad) {
  const teile = String(pfad).replace(/[\\/]+$/, '').split(/[\\/]/);
  return { pfad, name: teile[teile.length - 1] || pfad, kind: 'directory' };
}

// Projektordner (Projekt-ID -> Pfad) verwaltet das Programm selbst
// (projektordner.json) – nur dort gemerkte Ordner sind freigegeben.
let projektPfadeCache = null;
async function projektPfade() {
  if (!projektPfadeCache) projektPfadeCache = await aufruf('projektordner_lesen').catch(() => ({}));
  return projektPfadeCache;
}

// Ordner-Dialog: öffnet das Programm (Rust), nicht die Oberfläche. Nur so
// gewählte Ordner gibt das Programm für den Dateizugriff frei.
async function ordnerDialog(titel, start) {
  const p = await aufruf('ordner_waehlen', { titel, start: start || null });
  return typeof p === 'string' ? p : null;
}

// ---------- Grundordner ----------
export async function konfigLesen() {
  return aufruf('konfig_lesen');
}

export async function waehleGrundordner(pruefen) {
  const k = await konfigLesen().catch(() => ({}));
  const pfad = await ordnerDialog('Gemeinsamen Grundordner wählen', k.grundordner);
  if (!pfad) return null;
  const h = ordnerHandle(pfad);
  if (pruefen && !(await pruefen(h))) return null;
  await aufruf('konfig_speichern', { grundordner: pfad });
  grundOrdner = h;
  return h;
}

export async function grundordnerHolen() {
  if (grundOrdner) return grundOrdner;
  const k = await konfigLesen().catch(() => null);
  if (!k || !k.grundordner) return null;
  if (!(await aufruf('ordner_existiert', { pfad: k.grundordner }))) return null; // z. B. Netzlaufwerk nicht verbunden
  grundOrdner = ordnerHandle(k.grundordner);
  return grundOrdner;
}

export async function gespeicherterGrundordner() {
  if (grundOrdner) return grundOrdner;
  const k = await konfigLesen().catch(() => null);
  return k && k.grundordner ? ordnerHandle(k.grundordner) : null;
}

// ---------- Projektordner ----------
export async function waehleProjektordner(id) {
  const pfad = await ordnerDialog('Protokollordner des Projekts wählen', grundOrdner && grundOrdner.pfad);
  if (!pfad) return null;
  await aufruf('projektordner_setzen', { id, pfad });
  (await projektPfade())[id] = pfad;
  return ordnerHandle(pfad);
}
export async function gespeicherterProjektordner(id) {
  const p = (await projektPfade())[id];
  return p ? ordnerHandle(p) : null;
}
export async function projektOrdnerHolen(id) {
  const h = await gespeicherterProjektordner(id);
  if (!h) return null;
  return (await aufruf('ordner_existiert', { pfad: h.pfad })) ? h : null;
}

// ---------- Dateien ----------
export async function dateiLesen(ordner, name) {
  return aufruf('datei_lesen', { ordner: ordner.pfad, name }).catch(() => null);
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', gif: 'image/gif', webp: 'image/webp' };
export async function dateiAlsDataUrl(ordner, name) {
  const b64 = await aufruf('datei_lesen_base64', { ordner: ordner.pfad, name }).catch(() => null);
  if (b64 == null) return null;
  const endung = String(name).split('.').pop().toLowerCase();
  return 'data:' + (MIME[endung] || 'application/octet-stream') + ';base64,' + b64;
}
export async function dateiSchreiben(ordner, name, text) {
  return aufruf('datei_schreiben', { ordner: ordner.pfad, name, text });
}
export async function dateiLoeschen(ordner, name) {
  return aufruf('datei_loeschen', { ordner: ordner.pfad, name }).catch(() => {});
}
export async function unterordnerHolen(ordner, name) {
  const p = await aufruf('unterordner', { ordner: ordner.pfad, name }).catch(() => null);
  return p ? ordnerHandle(p) : null;
}
export async function leseDbText(ordner) {
  // Ohne catch: Lesefehler (nicht „fehlt“) gehen an db.js weiter.
  return aufruf('datei_lesen', { ordner: ordner.pfad, name: DB_NAME });
}
export async function schreibeDbText(ordner, text) {
  return dateiSchreiben(ordner, DB_NAME, text);
}
export async function scanneHtmlDateien(ordner) {
  return aufruf('html_scannen', { ordner: ordner.pfad });
}

// ---------- Speichern-Dialog (Protokoll, Excel) ----------
// inhalt: { text } oder { base64 }. Gibt true zurück, wenn gespeichert.
export async function speichernUnter(vorschlag, startOrdner, inhalt, filter) {
  const ziel = await aufruf('speicherort_waehlen', {
    vorschlag,
    start: startOrdner && startOrdner.pfad ? startOrdner.pfad : null,
    name: filter ? filter.name : 'Datei',
    endungen: filter ? filter.extensions : [],
  });
  if (!ziel) return false;
  await aufruf('pfad_schreiben', { pfad: ziel, text: inhalt.text ?? null, base64: inhalt.base64 ?? null });
  return true;
}
