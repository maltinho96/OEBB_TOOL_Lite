// "Wer bin ich?": merkt sich pro Browser/Gerät, als welche Person aus dem
// Team man gerade arbeitet. Wird genutzt, um neue Protokolle automatisch
// mit dem Namen im Feld "Ökologische*r Baubegleiter*in" vorzubelegen und
// (spaeter) Stundeneintraege einer Person zuzuordnen.
//
// Speicherung bewusst in localStorage (nicht in der geteilten DB): die
// Auswahl ist geraetespezifisch – auf Maltes Rechner ist es Malte, auf
// Karels Rechner Karel. Sie soll NICHT ueber die gemeinsame Datenbank
// synchronisiert werden.

const SCHLUESSEL = 'oebb_aktueller_nutzer';

export function aktuellerNutzer() {
  try {
    return localStorage.getItem(SCHLUESSEL) || '';
  } catch {
    return '';
  }
}

export function nutzerSetzen(name) {
  try {
    if (name) localStorage.setItem(SCHLUESSEL, name);
    else localStorage.removeItem(SCHLUESSEL);
  } catch {
    // localStorage nicht verfuegbar (z. B. privater Modus) - dann bleibt
    // die Auswahl eben nur fuer diese Sitzung im Feld stehen.
  }
}
