// Support-Reiter: Kolleg*innen melden Probleme, Wünsche und Fragen. Alles
// landet in der gemeinsamen Datenbank (oebb_datenbank.json, Liste
// db.support), damit die verantwortliche Person die Meldungen dort sieht und
// den Status pflegen kann.
//
// Eintrag: { id, datum (ISO), von, art, bereich, text, browser, status }
//   art:    fehler | wunsch | frage
//   status: offen | in-arbeit | erledigt

import { esc, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbLesen, dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';
import { aktuellerNutzer } from '../core/nutzer.js';
import { logo } from '../schema/felder.js';

const ARTEN = { fehler: '🐞 Fehler', wunsch: '💡 Wunsch', frage: '❓ Frage' };
const STATUS = { offen: '🔴 offen', 'in-arbeit': '🟡 in Arbeit', erledigt: '🟢 erledigt' };
const BEREICHE = ['Übersicht', 'Projekte', 'Begehungsprotokoll', 'Vorbegehungsprotokoll', 'Belehrungsprotokoll',
  'Fotos / Karten', 'Drucken / PDF', 'Speichern / Laden', 'Mail', 'Karte', 'Stunden', 'Sonstiges'];

function supportHtml() {
  return `
${logo()}
<h1>Support</h1>
<p style="margin-top:2px; color:#555">Etwas funktioniert nicht, fehlt oder ist unklar? Hier eintragen –
die Meldung wird in der gemeinsamen Datenbank gespeichert und gesammelt bearbeitet.</p>
<p id="supportOhneOrdner" style="color:#555">Bitte zuerst in der <b>Übersicht</b> den Grundordner verbinden.</p>

<div id="supportBereich" style="display:none">
<h2 class="c-grau">Neue Meldung</h2>
<table class="form support-form">
  <tr class="bg-grau-h"><td class="label" style="width:160px">Von:</td><td><input type="text" id="spVon" placeholder="Name"></td></tr>
  <tr class="bg-grau-h"><td class="label">Art:</td><td>
    ${Object.entries(ARTEN).map(([k, v], i) => `<label class="cb"><input type="radio" name="spArt" value="${k}"${i === 0 ? ' checked' : ''}> ${v}</label>`).join('')}
  </td></tr>
  <tr class="bg-grau-h"><td class="label">Wo?</td><td><select id="spBereich">${BEREICHE.map((b) => `<option>${b}</option>`).join('')}</select></td></tr>
  <tr class="bg-grau-h"><td class="label">Beschreibung:
    <div style="font-size:11px; color:#777; font-weight:400; margin-top:3px;">Was hast du gemacht, was ist passiert, was hättest du erwartet?</div></td>
    <td><textarea id="spText" rows="5"></textarea></td></tr>
  <tr class="bg-grau-h"><td></td><td><button class="haupt-knopf" data-aktion="support-senden">📨 Meldung speichern</button>
    <span id="spStatus" style="margin-left:10px; color:#555;"></span></td></tr>
</table>

<h2 class="c-grau">Meldungen</h2>
<p class="kein-druck" style="display:flex; gap:10px; align-items:center;">
  <label style="font-size:12.5px; color:#555;">Anzeigen:
    <select id="spFilter" style="font:inherit; padding:3px;">
      <option value="offen" selected>Nicht erledigte</option>
      <option value="alle">Alle</option>
    </select>
  </label>
  <button class="ordner-knopf" data-aktion="support-aktualisieren">🔄 Aktualisieren</button>
</p>
<div id="spListe"></div>
</div>
`;
}

// "Chrome 141", "Edge 141", "Firefox 144" – hilft bei der Fehlersuche.
function browserName() {
  const ua = navigator.userAgent;
  const m = /Edg\/(\d+)/.exec(ua) || /Firefox\/(\d+)/.exec(ua) || /Chrome\/(\d+)/.exec(ua) || /Version\/(\d+).*Safari/.exec(ua);
  const name = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  return name + (m ? ' ' + m[1] : '');
}

function liste() {
  const db = dbHolen();
  return (db && Array.isArray(db.support)) ? db.support : [];
}

function listeZeigen() {
  const ziel = document.getElementById('spListe');
  if (!ziel) return;
  const filter = (document.getElementById('spFilter') || {}).value || 'offen';
  const eintraege = liste()
    .filter((e) => filter === 'alle' || e.status !== 'erledigt')
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  if (!eintraege.length) {
    ziel.innerHTML = '<p style="color:#777">' + (liste().length ? 'Keine offenen Meldungen. 🎉' : 'Noch keine Meldungen.') + '</p>';
    return;
  }
  ziel.innerHTML = '<table class="uebersicht support-liste"><tr><th>Datum</th><th>Von</th><th>Art</th><th>Wo</th><th>Beschreibung</th><th>Status</th><th class="kein-druck"></th></tr>' +
    eintraege.map((e) =>
      '<tr class="sp-' + esc(e.status) + '">' +
      '<td>' + esc(new Date(e.datum).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })) + '</td>' +
      '<td>' + esc(e.von) + '</td>' +
      '<td>' + (ARTEN[e.art] || esc(e.art)) + '</td>' +
      '<td>' + esc(e.bereich) + '</td>' +
      '<td class="sp-text">' + esc(e.text) + (e.browser ? '<div class="sp-browser">' + esc(e.browser) + '</div>' : '') + '</td>' +
      '<td><select data-sp-status="' + esc(e.id) + '">' +
        Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '"' + (e.status === k ? ' selected' : '') + '>' + v + '</option>').join('') +
      '</select></td>' +
      '<td class="kein-druck"><button class="vt-weg" data-aktion="support-loeschen" data-id="' + esc(e.id) + '" title="Meldung löschen">✕</button></td>' +
      '</tr>').join('') +
    '</table>';
}

async function datenbankAendern(aenderung) {
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return false; }
  const db = await dbAendern(ordner, (db) => {
    db.support = Array.isArray(db.support) ? db.support : [];
    aenderung(db.support);
  });
  dbSetzen(db);
  listeZeigen();
  return true;
}

async function senden() {
  const text = document.getElementById('spText').value.trim();
  const status = document.getElementById('spStatus');
  if (!text) { status.textContent = 'Bitte kurz beschreiben, worum es geht.'; return; }
  const eintrag = {
    id: 's' + Date.now(),
    datum: new Date().toISOString(),
    von: document.getElementById('spVon').value.trim() || 'unbekannt',
    art: (document.querySelector('input[name="spArt"]:checked') || {}).value || 'fehler',
    bereich: document.getElementById('spBereich').value,
    text,
    browser: browserName(),
    status: 'offen',
  };
  if (await datenbankAendern((l) => l.push(eintrag))) {
    document.getElementById('spText').value = '';
    status.textContent = '✅ Danke! Die Meldung ist gespeichert.';
  }
}

async function neuLaden() {
  const ordner = await grundordnerHolen(false);
  const hinweis = document.getElementById('supportOhneOrdner');
  const bereich = document.getElementById('supportBereich');
  if (hinweis) hinweis.style.display = ordner ? 'none' : '';
  if (bereich) bereich.style.display = ordner ? '' : 'none';
  if (!ordner) return;
  // Frisch aus der Datei lesen – Meldungen anderer sollen sofort sichtbar sein.
  dbSetzen(await dbLesen(ordner));
  const von = document.getElementById('spVon');
  if (von && !von.value) von.value = aktuellerNutzer() || '';
  listeZeigen();
}

export function supportBeiAnzeige(id) {
  if (id === 'tab-support') neuLaden();
}

export function supportTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab';
  section.id = 'tab-support';
  section.innerHTML = supportHtml();
  mount.appendChild(section);

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'support-senden': senden(); break;
      case 'support-aktualisieren': neuLaden(); break;
      case 'support-loeschen': {
        const id = btn.dataset.id;
        if (confirm('Diese Meldung endgültig löschen?')) {
          datenbankAendern((l) => { const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); });
        }
        break;
      }
    }
  });
  section.addEventListener('change', (e) => {
    if (e.target.id === 'spFilter') listeZeigen();
    const id = e.target.dataset && e.target.dataset.spStatus;
    if (id) {
      const neu = e.target.value;
      datenbankAendern((l) => { const x = l.find((s) => s.id === id); if (x) x.status = neu; });
    }
  });
}
