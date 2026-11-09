// Nur im Desktop-Programm (Tauri):
//  - externe Links und mailto: im Standardprogramm öffnen (Browser, Outlook)
//  - beim Start auf GitHub nach einer neuen Version suchen und anbieten
//  - Versionsnummer in der Statuszeile

import { istDesktop } from '../core/storage/index.js';

export function externOeffnen(url) {
  if (istDesktop() && window.__TAURI__.opener) {
    return window.__TAURI__.opener.openUrl(url);
  }
  window.location.href = url;
  return Promise.resolve();
}

async function nachUpdateSuchen() {
  const u = window.__TAURI__.updater;
  if (!u) return;
  let update;
  try {
    update = await u.check();
  } catch {
    return; // offline o. ä. – beim nächsten Start wieder
  }
  if (!update) return;
  const ja = window.confirm('Neue Version des ÖBB-Tools verfügbar: ' + update.version +
    (update.body ? '\n\n' + update.body : '') + '\n\nJetzt installieren? (Das Programm startet danach neu.)');
  if (!ja) return;
  try {
    await update.downloadAndInstall();
    await window.__TAURI__.process.relaunch();
  } catch (e) {
    alert('Update fehlgeschlagen:\n' + (e && e.message ? e.message : e));
  }
}

export function desktopInit() {
  if (!istDesktop()) return;
  document.documentElement.classList.add('desktop');
  // Links mit target="_blank" (z. B. DIN-Normen in den Grundlagen) und
  // http(s)-Links nach außen im Standardbrowser öffnen.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:)/i.test(href) && (a.target === '_blank' || !href.startsWith(location.origin))) {
      e.preventDefault();
      externOeffnen(href);
    }
  });
  setTimeout(nachUpdateSuchen, 3000);
}
