// Kennzeichnung des gemeinsamen Grundordners.
//
// Im richtigen Grundordner liegt grundordner.txt mit dem Pfad, den alle im
// Ordner-Dialog wählen müssen. Der Browser darf einen Ordner nicht selbst
// über einen Pfad öffnen (nur per Dialog) – aber die App prüft danach, ob
// der gewählte Ordner der richtige ist, und legt in einem falschen Ordner
// KEINE neue Datenbank an.

export const KENNUNG_DATEI = 'grundordner.txt';

export function kennungVorlage(pfad) {
  return '# ÖBB-Tool: gemeinsamer Grundordner – diese Datei nicht löschen oder verschieben.\n' +
    '# Alle wählen beim „Grundordner festlegen“ genau diesen Ordner:\n' +
    'Pfad: ' + (pfad || '') + '\n';
}

export function pfadAusKennung(text) {
  const m = /^\s*Pfad:\s*(.*)$/mi.exec(String(text || ''));
  return m ? m[1].trim() : '';
}
