// Desktop-Programm: Einrichtung direkt nach der Installation.
//
// Solange kein Grundordner hinterlegt ist (oebb-konfig.txt fehlt), liegt
// dieser Assistent über der ganzen App – ohne Grundordner geht nichts.
// Danach ist der Grundordner fest; ändern nur durch Neu-Installation
// (Deinstallieren mit „Anwendungsdaten löschen“) oder durch eine von der IT
// neben das Programm gelegte oebb-konfig.txt.
//
// Beim Wählen wird geprüft:
//   - bestehender Grundordner (grundordner.txt / Datenbank) -> verbinden
//   - leerer Ordner -> NEU einrichten
// In beiden Fällen: Firmen mit Name, Adresse und Logo (Pflicht) erfassen
// bzw. prüfen/ergänzen -> firmen.txt + Ordner logos.
//   - Ordner mit fremden Dateien -> Warnung, anderen wählen (oder bewusst neu)

import { esc } from '../core/util.js';
import { STANDARD_FIRMEN, firmenAusText, firmaAlsZeile } from '../config/firmen.js';
import { KENNUNG_DATEI, kennungVorlage } from '../config/grundordner.js';
import { DB_NAME } from '../config/konstanten.js';

const T = () => window.__TAURI__;
const aufruf = (b, a) => T().core.invoke(b, a);

let huelle = null;
let gewaehlt = null;      // Pfad
let firmen = [];          // { name, farbe, adresse, logoDatei (vorhanden), logoPfad (neu gewählt) }
let modus = 'neu';        // 'neu' | 'bestehend'
let projektAnzahl = '?';

function zeigen(html) {
  huelle.querySelector('.ein-inhalt').innerHTML = html;
}

function start() {
  zeigen(`
    <h2>Willkommen beim ÖBB-Tool</h2>
    <p>Zuerst den <b>gemeinsamen Grundordner</b> verknüpfen – dort liegen die Datenbank, die Firmen und die Logos für alle.
    Das geht nur jetzt bei der Einrichtung.</p>
    <p class="ein-klein">Gibt es schon einen Grundordner (z. B. auf dem Netzlaufwerk), genau diesen wählen.
    Für einen ganz neuen Grundordner einen leeren Ordner wählen.</p>
    <button class="haupt-knopf" data-ein="waehlen">📂 Grundordner wählen</button>`);
}

async function waehlen() {
  const pfad = await aufruf('ordner_waehlen', { titel: 'Gemeinsamen Grundordner wählen', start: null });
  if (typeof pfad !== 'string') return;
  gewaehlt = pfad;
  let namen;
  try {
    namen = await aufruf('ordner_inhalt', { pfad });
  } catch (e) {
    zeigen('<p>⚠️ Der Ordner lässt sich nicht lesen: ' + esc(String(e)) + '</p><button class="haupt-knopf" data-ein="waehlen">Anderen Ordner wählen</button>');
    return;
  }
  const sichtbar = namen.filter((n) => !/^(desktop\.ini|thumbs\.db|\.ds_store)$/i.test(n));
  if (sichtbar.includes(KENNUNG_DATEI) || sichtbar.includes(DB_NAME)) return bestehend();
  if (!sichtbar.length) return neu();
  zeigen(`
    <h2>⚠️ Das ist kein ÖBB-Grundordner</h2>
    <p><code>${esc(pfad)}</code> enthält andere Dateien (${sichtbar.length}), aber weder die Datenbank noch ${KENNUNG_DATEI}.</p>
    <p>Gibt es bei euch schon einen Grundordner? Dann diesen wählen. Für einen neuen Grundordner am besten einen <b>leeren</b> Ordner anlegen und wählen.</p>
    <button class="haupt-knopf" data-ein="waehlen">📂 Anderen Ordner wählen</button>
    <button class="ein-zweit" data-ein="neu">Trotzdem hier neu einrichten</button>`);
}

// firmen.txt eines Ordners lesen (oder Standard-Firmen) – für die Tabelle.
async function firmenAusOrdner() {
  const t = await aufruf('datei_lesen', { ordner: gewaehlt, name: 'firmen.txt' }).catch(() => null);
  const liste = t ? firmenAusText(t).firmen : [];
  return (liste.length ? liste : STANDARD_FIRMEN.map((f) => ({ ...f, logo: '' })))
    .map((f) => ({ name: f.name, farbe: f.farbe, adresse: f.adresse || '', logoDatei: f.logo || '', logoPfad: '' }));
}

async function bestehend() {
  modus = 'bestehend';
  let projekte = '?';
  try {
    const t = await aufruf('datei_lesen', { ordner: gewaehlt, name: DB_NAME });
    if (t) projekte = Object.keys(JSON.parse(t).projekte || {}).length;
  } catch { /* egal */ }
  firmen = await firmenAusOrdner();
  // Vorhandene Logos prüfen
  const logos = await aufruf('ordner_inhalt', { pfad: gewaehlt + trenner() + 'logos' }).catch(() => []);
  firmen.forEach((f) => { if (f.logoDatei && !logos.includes(f.logoDatei)) f.logoDatei = ''; });
  projektAnzahl = projekte;
  firmenZeigen();
}

function neu() {
  modus = 'neu';
  firmen = STANDARD_FIRMEN.map((f) => ({ name: f.name, farbe: f.farbe, adresse: '', logoDatei: '', logoPfad: '' }));
  firmenZeigen();
}

function trenner() {
  return gewaehlt.includes('\\') ? '\\' : '/';
}

function firmenZeigen() {
  const kopf = modus === 'neu'
    ? `<h2>🆕 Neuen Grundordner einrichten</h2>
       <p><code>${esc(gewaehlt)}</code> ist leer. Bitte die Firmen eintragen, für die Protokolle erstellt werden
       (die erste ist beim Start ausgewählt) – mit Logo und Adresse.</p>`
    : `<h2>✅ Bestehender Grundordner gefunden</h2>
       <p><code>${esc(gewaehlt)}</code> · ${esc(String(projektAnzahl))} Projekte. Bitte die Firmen prüfen –
       fehlende Logos oder Adressen hier ergänzen.</p>`;
  zeigen(`${kopf}
    <table class="uebersicht ein-firmen">
      <thead><tr><th>Firmenname *</th><th>Adresse *</th><th>Farbe</th><th>Logo *</th><th></th></tr></thead>
      <tbody>${firmen.map((f, i) => `
        <tr>
          <td><input type="text" data-ein-name="${i}" value="${esc(f.name)}" placeholder="z. B. NET-TEC GmbH"></td>
          <td><input type="text" data-ein-adresse="${i}" value="${esc(f.adresse)}" placeholder="Straße Nr., PLZ Ort"></td>
          <td><input type="color" data-ein-farbe="${i}" value="${esc(f.farbe || '#1f3864')}"></td>
          <td><button class="ein-zweit ${f.logoPfad || f.logoDatei ? '' : 'ein-fehlt'}" data-ein="logo" data-i="${i}">${
            f.logoPfad ? '🖼 ' + esc(dateiname(f.logoPfad)) : f.logoDatei ? '✅ ' + esc(f.logoDatei) : 'Logo wählen …'}</button></td>
          <td><button class="ein-zweit" data-ein="weg" data-i="${i}" title="Firma entfernen">✕</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <button class="ein-zweit" data-ein="plus">＋ Firma</button>
    <p class="ein-klein">* Pflichtfelder. Die Adresse steht im Protokoll unter dem Logo.</p>
    <p class="ein-fehler"></p>
    <button class="haupt-knopf" data-ein="anlegen">${modus === 'neu' ? '✅ Grundordner anlegen' : '🔗 Speichern und verbinden'}</button>
    <button class="ein-zweit" data-ein="waehlen">Anderen Ordner wählen</button>`);
}

function dateiname(p) {
  return String(p).split(/[\\/]/).pop();
}
function sauber(name) {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/g, '_');
}

function eingabenUebernehmen() {
  huelle.querySelectorAll('[data-ein-name]').forEach((e) => { firmen[+e.dataset.einName].name = e.value.trim(); });
  huelle.querySelectorAll('[data-ein-adresse]').forEach((e) => { firmen[+e.dataset.einAdresse].adresse = e.value.trim(); });
  huelle.querySelectorAll('[data-ein-farbe]').forEach((e) => { firmen[+e.dataset.einFarbe].farbe = e.value; });
}

async function anlegen() {
  eingabenUebernehmen();
  const fehlerEl = huelle.querySelector('.ein-fehler');
  const liste = firmen.filter((f) => f.name || f.adresse || f.logoPfad);
  const fehlt = [];
  if (!liste.length) fehlt.push('mindestens eine Firma');
  liste.forEach((f, i) => {
    const wer = f.name || 'Firma ' + (i + 1);
    if (!f.name) fehlt.push('Name von Firma ' + (i + 1));
    if (!f.adresse) fehlt.push('Adresse von ' + wer);
    if (!f.logoPfad && !f.logoDatei) fehlt.push('Logo von ' + wer);
  });
  if (fehlt.length) { fehlerEl.textContent = 'Bitte ergänzen: ' + fehlt.join(', ') + '.'; return; }
  try {
    const logos = await aufruf('unterordner', { ordner: gewaehlt, name: 'logos' });
    for (const f of liste) {
      if (f.logoPfad) {
        f.logoDatei = sauber(dateiname(f.logoPfad));
        await aufruf('datei_kopieren', { quelle: f.logoPfad, ordner: logos, name: f.logoDatei });
      }
    }
    await aufruf('datei_schreiben', { ordner: gewaehlt, name: 'firmen.txt', text:
      '# Firmen für das ÖBB-Tool – eine Firma pro Zeile:\n#   Firmenname | Logo-Datei (im Ordner logos) | Farbe | Adresse\n' +
      liste.map((f) => firmaAlsZeile({ name: f.name, logo: f.logoDatei, farbe: f.farbe, adresse: f.adresse })).join('\n') + '\n' });
    if (modus === 'neu') {
      await aufruf('datei_schreiben', { ordner: gewaehlt, name: KENNUNG_DATEI, text: kennungVorlage(gewaehlt) });
      await aufruf('datei_schreiben', { ordner: gewaehlt, name: DB_NAME, text: JSON.stringify({ projekte: {} }, null, 1) });
    }
    await verbinden();
  } catch (e) {
    fehlerEl.textContent = '⚠️ Speichern fehlgeschlagen: ' + String(e && e.message ? e.message : e);
  }
}

async function verbinden() {
  // Bestehender Grundordner ohne Kennung (von vor der Kennzeichnung) -> nachholen.
  const kennung = await aufruf('datei_lesen', { ordner: gewaehlt, name: KENNUNG_DATEI }).catch(() => null);
  if (kennung == null) await aufruf('datei_schreiben', { ordner: gewaehlt, name: KENNUNG_DATEI, text: kennungVorlage(gewaehlt) }).catch(() => {});
  await aufruf('konfig_speichern', { grundordner: gewaehlt });
  location.reload();
}

async function klick(e) {
  const b = e.target.closest('[data-ein]');
  if (!b) return;
  const was = b.dataset.ein;
  if (was === 'waehlen') return waehlen();
  if (was === 'neu') return neu();
  if (was === 'verbinden') return verbinden();
  if (was === 'anlegen') return anlegen();
  eingabenUebernehmen();
  if (was === 'plus') firmen.push({ name: '', farbe: '#1f3864', adresse: '', logoDatei: '', logoPfad: '' });
  if (was === 'weg') firmen.splice(+b.dataset.i, 1);
  if (was === 'logo') {
    const p = await aufruf('datei_waehlen', { titel: 'Logo wählen', name: 'Bilder', endungen: ['svg', 'png', 'jpg', 'jpeg'] });
    if (typeof p === 'string') firmen[+b.dataset.i].logoPfad = p;
  }
  firmenZeigen();
}

// Gibt true zurück, wenn die Einrichtung angezeigt wird (App wartet dann).
export async function einrichtungPruefen() {
  const k = await aufruf('konfig_lesen').catch(() => null);
  if (!k || k.grundordner) return false;
  huelle = document.createElement('div');
  huelle.className = 'einrichtung';
  huelle.innerHTML = '<div class="ein-karte"><div class="ein-inhalt"></div></div>';
  huelle.addEventListener('click', klick);
  document.body.appendChild(huelle);
  start();
  return true;
}
