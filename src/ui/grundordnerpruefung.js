// Prüft einen im Dialog gewählten Grundordner (siehe config/grundordner.js).
//
//  - grundordner.txt vorhanden            -> richtig
//  - nur oebb_datenbank.json (alter Stand) -> richtig, grundordner.txt wird
//                                            einmalig mit Pfad angelegt
//  - weder noch                           -> falscher Ordner; ein NEUER
//                                            Grundordner nur nach ausdrück-
//                                            licher Bestätigung
// Den zuletzt bekannten Pfad merkt sich der Browser, um ihn als Hinweis
// anzuzeigen.

import { KENNUNG_DATEI, kennungVorlage, pfadAusKennung } from '../config/grundordner.js';
import { dateiLesen, dateiSchreiben } from '../core/storage/index.js';

const PFAD_SPEICHER = 'oebb-grundordner-pfad';

export function bekannterPfad() {
  try { return localStorage.getItem(PFAD_SPEICHER) || ''; } catch { return ''; }
}
function pfadMerken(p) {
  try { if (p) localStorage.setItem(PFAD_SPEICHER, p); } catch { /* egal */ }
}

function pfadErfragen(ordnerName) {
  const p = window.prompt('Bitte den vollständigen Pfad dieses Ordners eintragen, damit alle denselben wählen ' +
    '(z. B. aus der Adresszeile des Explorers kopieren):\n\nOrdner: „' + ordnerName + '“', bekannterPfad());
  return p === null ? null : p.trim();
}

// Ohne Rückfrage: hat der Ordner die Kennung? (für die Statuszeile)
export async function istGekennzeichnet(ordner) {
  const k = await dateiLesen(ordner, KENNUNG_DATEI);
  if (k != null) pfadMerken(pfadAusKennung(k));
  return k != null;
}

// Gibt true zurück, wenn der Ordner verwendet werden darf.
export async function grundordnerPruefen(ordner) {
  const kennung = await dateiLesen(ordner, KENNUNG_DATEI);
  if (kennung != null) {
    pfadMerken(pfadAusKennung(kennung));
    return true;
  }
  const hatDb = (await dateiLesen(ordner, 'oebb_datenbank.json')) != null;
  if (hatDb) {
    // Datenbank, aber keine Kennung: entweder der bisherige Grundordner (von
    // vor der Kennzeichnung) oder eine versehentlich angelegte Kopie.
    const soll = bekannterPfad();
    if (!window.confirm('In „' + ordner.name + '“ liegt eine Datenbank, aber keine ' + KENNUNG_DATEI + '.\n\n' +
      (soll ? 'Bekannter Grundordner:\n' + soll + '\n\n' : '') +
      'Ist das wirklich der GEMEINSAME Grundordner, den alle nutzen?\n„OK“ = ja, ihn so kennzeichnen. „Abbrechen“ = anderen Ordner wählen.')) return false;
    const p = pfadErfragen(ordner.name);
    if (p === null) return true; // ohne Kennung weiterarbeiten, beim nächsten Mal erneut fragen
    await dateiSchreiben(ordner, KENNUNG_DATEI, kennungVorlage(p)).catch(() => {});
    pfadMerken(p);
    return true;
  }
  const soll = bekannterPfad();
  const neu = window.confirm('⚠️ „' + ordner.name + '“ ist NICHT der gemeinsame Grundordner ' +
    '(darin liegt weder ' + KENNUNG_DATEI + ' noch die Datenbank).\n\n' +
    (soll ? 'Richtig ist:\n' + soll + '\n\n' : 'Frag nach dem Pfad des gemeinsamen Grundordners.\n\n') +
    'Nur wenn ihr noch GAR KEINEN Grundordner habt: „OK“ legt hier einen neuen an.\n' +
    'Sonst „Abbrechen“ und den richtigen Ordner wählen.');
  if (!neu) return false;
  const p = pfadErfragen(ordner.name);
  if (p === null) return false;
  await dateiSchreiben(ordner, KENNUNG_DATEI, kennungVorlage(p));
  pfadMerken(p);
  return true;
}
