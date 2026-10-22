// Verteiler (Übersicht): Liste Name -> E-Mail, z. B. für den Versand der
// Protokolle. Gespeichert in der gemeinsamen Datenbank (db.verteiler), damit
// alle im Team dieselbe Liste sehen.
//
// Komfort: "Adressen kopieren" legt alle Adressen mit ; getrennt in die
// Zwischenablage (passt direkt ins Outlook-An-Feld), "Mail an alle" öffnet
// das Mailprogramm mit allen Empfängern.

import { esc, statusText } from '../core/util.js';
import { grundordnerHolen } from '../core/storage/index.js';
import { dbAendern } from '../core/db.js';
import { dbSetzen, dbHolen } from '../core/zustand.js';

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;

function liste() {
  const db = dbHolen();
  return (db && Array.isArray(db.verteiler)) ? db.verteiler : [];
}

export function verteilerAnzeigen() {
  const ziel = document.getElementById('verteilerTabelle');
  if (!ziel) return;
  const eintraege = liste();
  const zeilen = eintraege.map((v, i) =>
    '<tr><td>' + esc(v.name) + '</td>' +
    '<td><a href="mailto:' + encodeURIComponent(v.email) + '">' + esc(v.email) + '</a></td>' +
    '<td class="kein-druck mitte"><button class="vt-weg" data-aktion="verteiler-entfernen" data-idx="' + i + '" title="Entfernen">✕</button></td></tr>'
  ).join('');
  ziel.innerHTML =
    '<table class="uebersicht verteiler">' +
    '<tr><th>Name</th><th>E-Mail</th><th class="kein-druck"></th></tr>' +
    (zeilen || '<tr><td colspan="3" style="color:#777">Noch niemand im Verteiler.</td></tr>') +
    '<tr class="kein-druck"><td><input type="text" id="vtName" placeholder="Name"></td>' +
    '<td><input type="email" id="vtEmail" placeholder="name@firma.de"></td>' +
    '<td class="mitte"><button class="ordner-knopf" data-aktion="verteiler-hinzufuegen">＋</button></td></tr>' +
    '</table>';
  const knoepfe = document.getElementById('verteilerKnoepfe');
  if (knoepfe) knoepfe.style.display = eintraege.length ? '' : 'none';
}

async function hinzufuegen() {
  const nameFeld = document.getElementById('vtName');
  const mailFeld = document.getElementById('vtEmail');
  const name = nameFeld.value.trim();
  const email = mailFeld.value.trim();
  if (!EMAIL.test(email)) {
    statusText('Bitte eine gültige E-Mail-Adresse eingeben.');
    mailFeld.focus();
    return;
  }
  const ordner = await grundordnerHolen(true);
  if (!ordner) { statusText('Bitte zuerst den Grundordner festlegen.'); return; }
  const db = await dbAendern(ordner, (db) => {
    db.verteiler = Array.isArray(db.verteiler) ? db.verteiler : [];
    const vorhanden = db.verteiler.find((v) => v.email.toLowerCase() === email.toLowerCase());
    if (vorhanden) vorhanden.name = name || vorhanden.name;
    else db.verteiler.push({ name: name || email, email });
    db.verteiler.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  });
  dbSetzen(db);
  verteilerAnzeigen();
  const neuName = document.getElementById('vtName');
  if (neuName) neuName.focus();
}

async function entfernen(idx) {
  const v = liste()[idx];
  if (!v || !confirm('„' + v.name + '“ aus dem Verteiler entfernen?')) return;
  const ordner = await grundordnerHolen(true);
  if (!ordner) return;
  const db = await dbAendern(ordner, (db) => {
    db.verteiler = (db.verteiler || []).filter((x) => x.email !== v.email);
  });
  dbSetzen(db);
  verteilerAnzeigen();
}

async function kopieren() {
  const text = liste().map((v) => v.email).join('; ');
  try {
    await navigator.clipboard.writeText(text);
    statusText(liste().length + ' Adressen kopiert – im Mailprogramm ins An-Feld einfügen.');
  } catch {
    prompt('Adressen zum Kopieren:', text);
  }
}

function mailAnAlle() {
  window.location.href = 'mailto:' + liste().map((v) => encodeURIComponent(v.email)).join(',');
}

export function verteilerInit(section) {
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'verteiler-hinzufuegen': hinzufuegen(); break;
      case 'verteiler-entfernen': entfernen(parseInt(btn.dataset.idx, 10)); break;
      case 'verteiler-kopieren': kopieren(); break;
      case 'verteiler-mail': mailAnAlle(); break;
    }
  });
  section.addEventListener('keydown', (e) => {
    if ((e.target.id === 'vtName' || e.target.id === 'vtEmail') && e.key === 'Enter') {
      e.preventDefault();
      if (e.target.id === 'vtName') document.getElementById('vtEmail').focus();
      else hinzufuegen();
    }
  });
}
