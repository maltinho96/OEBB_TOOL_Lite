// Automatische Entwurfs-Sicherung der Protokolle.
//
// Ein angefangenes Protokoll ging bisher verloren, wenn das Fenster zuging –
// auf dem Handy passiert das leicht (Android beendet die App im Hintergrund,
// z. B. während die Kamera offen ist). Deshalb wird jedes Protokoll, an dem
// gearbeitet wird, laufend als Entwurf im Gerät gesichert (IndexedDB – nur
// lokal, verlässt den Rechner nicht):
//   - kurz nach Änderungen (höchstens alle 15 s)
//   - sofort, wenn die App in den Hintergrund geht
// Beim nächsten Start bietet der Reiter an, den Entwurf zurückzuholen.
// Nach „Speichern unter…“ wird der Entwurf gelöscht.

import { PROTOKOLL_TABS } from '../config/konstanten.js';
import { protokollInhalt } from '../export/html-export.js';
import { protokollAusText } from '../export/html-import.js';

const DB = 'oebb-entwuerfe';
const TABELLE = 'entwuerfe';
const PAUSE_MS = 15000;

const geaendert = new Set();     // Reiter mit ungesicherten Änderungen
const timer = {};
let pausiert = false;            // während des Zurückholens nicht sichern

function db() {
  return new Promise((ok, fehler) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TABELLE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}
async function tx(modus, fn) {
  const d = await db();
  return new Promise((ok, fehler) => {
    const t = d.transaction(TABELLE, modus);
    const anfrage = fn(t.objectStore(TABELLE));
    t.oncomplete = () => { d.close(); ok(anfrage && anfrage.result); };
    t.onerror = () => { d.close(); fehler(t.error); };
  });
}
const entwurfLesen = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);
const entwurfSchreiben = (id, wert) => tx('readwrite', (s) => s.put(wert, id)).catch(() => {});
const entwurfLoeschen = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});

// Hat der Reiter überhaupt Inhalt, der sich zu sichern lohnt?
function hatInhalt(tab) {
  if (tab.querySelector('.fotoContainer .abb-bilder img')) return true;
  return Array.from(tab.querySelectorAll('textarea, input[type=text]'))
    .some((el) => !el.dataset.auto && !el.readOnly && el.value.trim() && el.dataset.feld !== 'anlass' &&
      el.dataset.feld !== 'baubegleiter' && el.dataset.feld !== 'baubegleiter-telefon');
}

async function sichern(tabId) {
  clearTimeout(timer[tabId]);
  timer[tabId] = null;
  if (pausiert || !geaendert.has(tabId)) return;
  const tab = document.getElementById(tabId);
  if (!tab || !hatInhalt(tab)) return;
  geaendert.delete(tabId);
  try {
    const text = await protokollInhalt(tab, true);
    await entwurfSchreiben(tabId, { text, zeit: Date.now() });
  } catch {
    geaendert.add(tabId); // beim nächsten Anlass erneut versuchen
  }
}

function vormerken(tabId) {
  if (pausiert) return;
  geaendert.add(tabId);
  if (!timer[tabId]) timer[tabId] = setTimeout(() => sichern(tabId), PAUSE_MS);
}

function zeitText(ms) {
  const d = new Date(ms);
  const z = (n) => String(n).padStart(2, '0');
  return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + z(d.getHours()) + ':' + z(d.getMinutes()) + ' Uhr';
}

function hinweisZeigen(tab, entwurf) {
  const alt = tab.querySelector('.entwurf-hinweis');
  if (alt) alt.remove();
  const box = document.createElement('div');
  box.className = 'entwurf-hinweis kein-druck';
  box.innerHTML = '<span>📝 Nicht gespeicherter Entwurf vom <b>' + zeitText(entwurf.zeit) + '</b> gefunden.</span> ' +
    '<button type="button" class="haupt-knopf" data-entwurf="holen">Wiederherstellen</button> ' +
    '<button type="button" class="ordner-knopf" data-entwurf="weg">Verwerfen</button>';
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-entwurf]');
    if (!b) return;
    if (b.dataset.entwurf === 'holen') {
      pausiert = true;
      try {
        await protokollAusText(entwurf.text, true);
      } finally {
        // Die beim Einsetzen ausgelösten Änderungs-Ereignisse abwarten.
        setTimeout(() => { pausiert = false; }, 500);
      }
      box.remove(); // Entwurf bleibt gesichert, bis gespeichert wird
    } else if (confirm('Den Entwurf wirklich verwerfen?')) {
      await entwurfLoeschen(tab.id);
      box.remove();
    }
  });
  tab.insertBefore(box, tab.firstChild);
}

export async function entwurfInit() {
  if (!('indexedDB' in window)) return;
  for (const id of PROTOKOLL_TABS) {
    const tab = document.getElementById(id);
    if (!tab) continue;
    const entwurf = await entwurfLesen(id);
    if (entwurf && entwurf.text) hinweisZeigen(tab, entwurf);

    // Änderungen erkennen: Eingaben, Häkchen, Fotos rein/raus, Markierungen.
    // Nur echte Eingaben (isTrusted) – automatisches Vorbelegen zählt nicht.
    ['input', 'change'].forEach((ev) => tab.addEventListener(ev, (e) => { if (e.isTrusted) vormerken(id); }));
    const foto = tab.querySelector('.fotoContainer');
    if (foto) new MutationObserver(() => vormerken(id)).observe(foto, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    tab.querySelectorAll('.unterschrift-feld').forEach((u) => new MutationObserver(() => vormerken(id)).observe(u, { childList: true, subtree: true }));
  }

  // App geht in den Hintergrund / wird geschlossen: sofort sichern.
  const allesSichern = () => PROTOKOLL_TABS.forEach((id) => { if (geaendert.has(id)) sichern(id); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') allesSichern(); });
  window.addEventListener('pagehide', allesSichern);

  // Gespeichert -> Entwurf nicht mehr nötig.
  document.addEventListener('protokoll-gespeichert', (e) => {
    const id = e.detail && e.detail.tabId;
    if (!id) return;
    clearTimeout(timer[id]); timer[id] = null;
    geaendert.delete(id);
    entwurfLoeschen(id);
    const h = document.querySelector('#' + id + ' .entwurf-hinweis');
    if (h) h.remove();
  });
}
