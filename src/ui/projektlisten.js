// Die beiden Tabellen im Projektformular:
//   - Aktenzeichen: Aktenzeichen | Kommentar | Haupt (eins wählbar) | ✕
//   - Verteiler:    Name | E-Mail | ✕
// Jede Zeile besteht direkt aus Eingabefeldern; "＋ Zeile" hängt eine leere
// Zeile an. Beim Speichern liest projektformular.js die Zeilen mit
// listenLesen() aus (leere Zeilen fallen weg).

import { esc } from '../core/util.js';
import { EMAIL_MUSTER } from '../domain/projekt.js';

function azZeile(a) {
  return '<tr>' +
    '<td><input type="text" class="az-nr" value="' + esc(a.az || '') + '" placeholder="z. B. 4713-B-178/2025"></td>' +
    '<td><input type="text" class="az-kommentar" value="' + esc(a.kommentar || '') + '" placeholder="z. B. gilt für Abschnitt Nord / Baumfällung"></td>' +
    '<td class="mitte"><input type="radio" name="azHaupt" class="az-haupt"' + (a.haupt ? ' checked' : '') + ' title="Haupt-Aktenzeichen"></td>' +
    '<td class="mitte"><button type="button" class="vt-weg" data-aktion="liste-zeile-weg" title="Zeile entfernen">✕</button></td>' +
    '</tr>';
}

function vtZeile(v) {
  return '<tr>' +
    '<td><input type="text" class="vt-name" value="' + esc(v.name || '') + '" placeholder="Name"></td>' +
    '<td><input type="email" class="vt-email" value="' + esc(v.email || '') + '" placeholder="name@behoerde.de"></td>' +
    '<td class="mitte"><button type="button" class="vt-weg" data-aktion="liste-zeile-weg" title="Zeile entfernen">✕</button></td>' +
    '</tr>';
}

// Tabellen mit den Werten eines Projekts (oder leer) füllen.
export function listenFuellen(aktenzeichen, verteiler) {
  const az = document.getElementById('npAzZeilen');
  const vt = document.getElementById('npVtZeilen');
  if (az) az.innerHTML = (aktenzeichen.length ? aktenzeichen : [{ haupt: true }]).map(azZeile).join('');
  if (vt) vt.innerHTML = (verteiler.length ? verteiler : [{}]).map(vtZeile).join('');
}

// Liest beide Tabellen. Gibt zusätzlich ungültige E-Mail-Adressen zurück.
export function listenLesen() {
  const aktenzeichen = [];
  document.querySelectorAll('#npAzZeilen tr').forEach((tr) => {
    const az = tr.querySelector('.az-nr').value.trim();
    const kommentar = tr.querySelector('.az-kommentar').value.trim();
    if (!az) return;
    aktenzeichen.push({ az, kommentar, haupt: tr.querySelector('.az-haupt').checked });
  });
  const verteiler = [];
  const ungueltig = [];
  document.querySelectorAll('#npVtZeilen tr').forEach((tr) => {
    const name = tr.querySelector('.vt-name').value.trim();
    const email = tr.querySelector('.vt-email').value.trim();
    if (!name && !email) return;
    if (!EMAIL_MUSTER.test(email)) { ungueltig.push(email || '(leer bei ' + name + ')'); return; }
    verteiler.push({ name: name || email, email });
  });
  return { aktenzeichen, verteiler, ungueltig };
}

export function projektlistenInit(section) {
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    if (btn.dataset.aktion === 'az-zeile-hinzu') {
      document.getElementById('npAzZeilen').insertAdjacentHTML('beforeend', azZeile({}));
    } else if (btn.dataset.aktion === 'vt-zeile-hinzu') {
      document.getElementById('npVtZeilen').insertAdjacentHTML('beforeend', vtZeile({}));
    } else if (btn.dataset.aktion === 'liste-zeile-weg') {
      btn.closest('tr').remove();
    }
  });
  // Ein Haupt-Aktenzeichen lässt sich auch wieder abwählen (Klick auf den
  // bereits gewählten Punkt) – es gibt ja nicht immer eins.
  section.addEventListener('mousedown', (e) => {
    const r = e.target.closest && e.target.closest('.az-haupt');
    if (r) r.dataset.warAn = r.checked ? '1' : '';
  });
  section.addEventListener('click', (e) => {
    const r = e.target.closest && e.target.closest('.az-haupt');
    if (r && r.dataset.warAn) r.checked = false;
  });
}
