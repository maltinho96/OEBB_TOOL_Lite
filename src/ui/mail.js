// Knopf "✉ Mail vorbereiten" am Ende jedes Protokolls: öffnet das
// Mailprogramm (mailto:) mit Empfängern, Betreff und fertigem Text.
//   - Begehung / Vorbegehung: an den Verteiler des gewählten Projekts
//     (erste Person ins An-Feld, alle weiteren in CC)
//   - Belehrung:               an die E-Mail der Bauleitung im Protokoll
// Anhänge kann mailto: nicht mitgeben – das PDF legt man selbst dazu.

import { dbHolen } from '../core/zustand.js';
import { feldWert } from '../core/util.js';
import { verteilerListe, EMAIL_MUSTER } from '../domain/projekt.js';
import { mailBetreff, mailText } from '../domain/mailtext.js';

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

function mailVorbereiten(tab) {
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

  // Erste Person des Verteilers ins An-Feld, alle weiteren in CC.
  const [an, ...cc] = adressen;
  const url = 'mailto:' + (an || '') +
    '?' + (cc.length ? 'cc=' + cc.join(',') + '&' : '') +
    'subject=' + encodeURIComponent(mailBetreff(daten)) +
    '&body=' + encodeURIComponent(mailText(daten).replace(/\n/g, '\r\n'));
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
