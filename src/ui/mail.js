// Knopf "✉ Mail vorbereiten" am Ende jedes Protokolls: öffnet das
// Mailprogramm (mailto:) mit Empfängern, Betreff und fertigem Text.
//   - Begehung / Vorbegehung: an den Verteiler des gewählten Projekts
//     (erste Person ins An-Feld, alle weiteren in CC)
//   - Belehrung:               an die E-Mail der Bauleitung im Protokoll
// Anhänge kann mailto: nicht mitgeben – das PDF legt man selbst dazu.
//
// Schrift: Ein mailto:-Link kann nur reinen Text übergeben, und das neue
// Outlook setzt diesen fest in Segoe UI 12. Deshalb wird der Text formatiert
// (Calibri 11, echte Aufzählung) in die Zwischenablage gelegt und die Mail
// ohne Text geöffnet – im Mailfenster genügt dann Strg+V. Klappt das
// Kopieren nicht (z. B. Browser ohne Freigabe), steht der Text wie bisher
// direkt in der Mail.

import { dbHolen } from '../core/zustand.js';
import { feldWert } from '../core/util.js';
import { verteilerListe, EMAIL_MUSTER } from '../domain/projekt.js';
import { mailBetreff, mailText, mailHtml } from '../domain/mailtext.js';

// Bereiche "mit Beanstandung" (Haken "ohne Beanstandung" entfernt), bei
// Arten- und Habitatschutz mit den betroffenen Unterpunkten.
function abweichungen(tab) {
  const liste = [];
  tab.querySelectorAll('table[data-schutzblock]').forEach((t) => {
    const haken = t.querySelector('[data-einklapp]');
    if (!haken || haken.checked) return;
    const h2 = t.previousElementSibling;
    let name = h2 && h2.tagName === 'H2' ? h2.textContent.trim() : 'Bereich';
    const unter = [...t.querySelectorAll('[data-unterklapp]')]
      .filter((c) => !c.checked)
      .map((c) => { const b = c.closest('.unterkopf') && c.closest('.unterkopf').querySelector('b'); return b ? b.textContent.trim() : ''; })
      .filter(Boolean);
    if (unter.length) name += ': ' + unter.join(', ');
    liste.push(name);
  });
  return liste;
}

function projektInfo(tab, name) {
  const db = dbHolen();
  const p = tab.dataset.projektId && db && db.projekte ? db.projekte[tab.dataset.projektId] : null;
  return (p && p.infos && p.infos[name]) || '';
}

function empfaenger(tab, typ) {
  if (typ === 'belehrung-karel') {
    const m = feldWert(tab, 'bauleitung-email');
    return { adressen: EMAIL_MUSTER.test(m) ? [m] : [], fehlt: 'Keine gültige E-Mail der Bauleitung im Protokoll eingetragen.' };
  }
  const db = dbHolen();
  const pid = tab.dataset.projektId;
  const p = pid && db && db.projekte ? db.projekte[pid] : null;
  if (!p) return { adressen: [], fehlt: 'Oben ist kein Projekt gewählt – daher kein Verteiler.' };
  const adressen = verteilerListe(p).map((v) => v.email);
  return { adressen, fehlt: 'Für dieses Projekt ist noch kein Verteiler hinterlegt (Projekte → ✎ Bearbeiten).' };
}

// Text formatiert (HTML) und als Klartext in die Zwischenablage.
async function inZwischenablage(html, text) {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
    return true;
  } catch {
    return false;
  }
}

// Kurzer Hinweis unten am Bildschirm.
function hinweisZeigen(text) {
  let el = document.getElementById('mailHinweis');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mailHinweis';
    el.className = 'mail-hinweis kein-druck';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('sichtbar');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('sichtbar'), 9000);
}

async function mailVorbereiten(tab) {
  const typ = tab.id.replace('tab-', '');
  const daten = {
    typ,
    nummer: feldWert(tab, 'nummer'),
    datum: feldWert(tab, 'datum'),
    auftraggeber: feldWert(tab, 'auftraggeber-fuss'),
    ort: feldWert(tab, 'ort'),
    landkreis: feldWert(tab, 'landkreis') || projektInfo(tab, 'landkreis'),
    projekt: feldWert(tab, 'projekt').split('\n')[0].trim(),
    // Mehrere Aktenzeichen (Zeilen oder durch Komma/Semikolon getrennt) -> je ein Punkt.
    aktenzeichen: feldWert(tab, 'aktenzeichen').split(/\s*[\n;,]\s*/).filter(Boolean),
    abweichungen: abweichungen(tab),
  };
  const { adressen, fehlt } = empfaenger(tab, typ);
  if (!adressen.length && !confirm(fehlt + '\n\nMail trotzdem ohne Empfänger öffnen?')) return;

  const text = mailText(daten);
  const kopiert = await inZwischenablage(mailHtml(daten), text);

  // Erste Person des Verteilers ins An-Feld, alle weiteren in CC.
  const [an, ...cc] = adressen;
  const url = 'mailto:' + (an || '') +
    '?' + (cc.length ? 'cc=' + cc.join(',') + '&' : '') +
    'subject=' + encodeURIComponent(mailBetreff(daten)) +
    (kopiert ? '' : '&body=' + encodeURIComponent(text.replace(/\n/g, '\r\n')));
  if (kopiert) hinweisZeigen('📋 Text ist kopiert – im Mailfenster in das Textfeld klicken und Strg+V drücken.');
  // Ereignis vorab (für Tests/Erweiterungen), dann Mailprogramm öffnen.
  document.dispatchEvent(new CustomEvent('mail-vorbereitet', { detail: url }));
  window.location.href = url;
}

export function mailInit() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-aktion="mail-vorbereiten"]');
    if (btn) mailVorbereiten(btn.closest('.tab'));
  });
}
