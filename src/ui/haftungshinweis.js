// Setzt den Haftungshinweis (config/haftungshinweis.js) in alle Protokolle.
// Gespeicherte Protokolle behalten den Text, mit dem sie gespeichert wurden.

import { HINWEIS_DATEI, HINWEIS_STANDARD, HINWEIS_VORLAGE, hinweisAusText } from '../config/haftungshinweis.js';
import { dateiLesen, dateiSchreiben } from '../core/storage/index.js';

function einsetzen(text) {
  document.querySelectorAll('[data-haftungshinweis]').forEach((el) => {
    const p = el.querySelector('.hh-text');
    if (p) p.textContent = text;
    el.hidden = !text;
  });
}

// Liest haftungshinweis.txt aus dem Grundordner (legt sie bei Bedarf an).
// Gibt eine Statuszeile zurück (oder '').
export async function haftungshinweisLaden(ordner) {
  if (!ordner) return '';
  let text = await dateiLesen(ordner, HINWEIS_DATEI);
  let status = '';
  if (text == null) {
    try {
      await dateiSchreiben(ordner, HINWEIS_DATEI, HINWEIS_VORLAGE);
      status = HINWEIS_DATEI + ' war nicht da und wurde mit dem Standardtext angelegt.';
    } catch {
      status = HINWEIS_DATEI + ' fehlt – Standardtext wird verwendet.';
    }
    text = HINWEIS_VORLAGE;
  }
  einsetzen(hinweisAusText(text));
  return status;
}

export { HINWEIS_STANDARD };
