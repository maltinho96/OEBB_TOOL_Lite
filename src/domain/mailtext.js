// Betreff und Text der Begleit-Mail zu einem Protokoll. Reine Textlogik,
// kein DOM – die Werte sammelt ui/mail.js aus dem Protokoll ein.
//
// d = {
//   typ: 'protokoll' | 'vorbegehung' | 'belehrung-karel',
//   nummer, datum (JJJJ-MM-TT), auftraggeber, ort, landkreis, projekt,
//   aktenzeichen: ['541001-26-650028', …],
//   abweichungen: ['Baumschutz', 'Arten- und Habitatschutz: Fledermausschutz', …],
// }

import { datumDeutsch } from '../core/util.js';

function nummerText(nr) {
  const n = String(nr || '').trim();
  if (!n) return '';
  return (/^\d$/.test(n) ? '0' + n : n) + '. ';
}

// "zum Bauvorhaben der Deutsche Telekom in Potsdam"
function bauvorhaben(d) {
  return 'zum Bauvorhaben' + (d.auftraggeber ? ' der ' + d.auftraggeber : '') + (d.ort ? ' in ' + d.ort : '');
}

// "06. Protokoll zur ökologischen Baubegleitung in Potsdam, Landkreis X"
export function mailBetreff(d) {
  const titel = {
    vorbegehung: nummerText(d.nummer) + 'Vorbegehungsprotokoll',
    'belehrung-karel': 'Belehrungsprotokoll',
  }[d.typ] || nummerText(d.nummer) + 'Protokoll';
  const orte = [d.ort, d.landkreis && d.landkreis !== d.ort ? d.landkreis : ''].filter(Boolean).join(', ');
  return titel + ' zur ökologischen Baubegleitung' + (orte ? ' in ' + orte : '');
}

// Aufbau (Beispiel Vorbegehung):
//   Sehr geehrte Damen und Herren,
//   im Anhang übersende ich Ihnen das 01. Protokoll der Vorbegehung …, mit dem Aktenzeichen:
//
//   • 541001-26-650028
//
//   Die im Vorbegehungsprotokoll festgelegten Maßnahmen sind von der Baufirma umzusetzen.
//
//   Bei Fragen kommen Sie gerne auf uns zu!
// Keine Grußformel – die kommt aus der Signatur im Mailprogramm.

// Die Bausteine des Textes – daraus entstehen Klartext und HTML.
function mailTeile(d) {
  const am = datumDeutsch(d.datum);
  const az = (d.aktenzeichen || []).filter(Boolean);
  let einleitung;
  let kern;
  if (d.typ === 'vorbegehung') {
    einleitung = 'im Anhang übersende ich Ihnen das ' + nummerText(d.nummer) + 'Protokoll der Vorbegehung zur ökologischen Baubegleitung' +
      (am ? ', durchgeführt am ' + am : '') + ', ' + bauvorhaben(d);
    kern = 'Die im Vorbegehungsprotokoll festgelegten Maßnahmen sind von der Baufirma umzusetzen.';
  } else if (d.typ === 'belehrung-karel') {
    einleitung = 'im Anhang übersende ich Ihnen das Belehrungsprotokoll zur ökologischen Baubegleitung' +
      (am ? ' vom ' + am : '') + ' ' + bauvorhaben(d);
    kern = 'Bitte beachten Sie die darin festgelegten Auflagen zum Naturschutz und geben Sie das Protokoll ' +
      'an alle auf der Baustelle tätigen Personen weiter.';
  } else {
    einleitung = 'im Anhang übersende ich Ihnen das ' + nummerText(d.nummer) + 'Protokoll zur ökologischen Baubegleitung' +
      (am ? ', durchgeführt am ' + am : '') + ', ' + bauvorhaben(d);
    kern = d.abweichungen && d.abweichungen.length
      ? 'Es wurden Abweichungen von den Genehmigungsauflagen dokumentiert (' + d.abweichungen.join('; ') + '). ' +
        'Details entnehmen Sie bitte dem Protokoll.'
      : 'Es wurden keine Abweichungen von den Genehmigungsauflagen dokumentiert.';
  }
  einleitung += az.length ? ', mit ' + (az.length > 1 ? 'den Aktenzeichen' : 'dem Aktenzeichen') + ':' : '.';
  return { anrede: 'Sehr geehrte Damen und Herren,', einleitung, az, kern, schluss: 'Bei Fragen kommen Sie gerne auf uns zu!' };
}

export function mailText(d) {
  const t = mailTeile(d);
  const zeilen = [t.anrede, t.einleitung, ''];
  if (t.az.length) {
    t.az.forEach((a) => zeilen.push('• ' + a));
    zeilen.push('');
  }
  zeilen.push(t.kern, '', t.schluss);
  return zeilen.join('\n');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Derselbe Text als HTML in Calibri 11 – zum Einfügen ins Mailprogramm
// (das neue Outlook ignoriert bei mailto:-Links die Standardschrift).
export function mailHtml(d) {
  const t = mailTeile(d);
  const p = (inhalt) => '<p style="margin:0">' + inhalt + '</p>';
  const leer = p('&nbsp;');
  return '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000">' +
    p(esc(t.anrede)) + p(esc(t.einleitung)) + leer +
    (t.az.length ? '<ul style="margin:0 0 0 18px;padding:0">' + t.az.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul>' + leer : '') +
    p(esc(t.kern)) + leer + p(esc(t.schluss)) + leer +
    '</div>';
}
