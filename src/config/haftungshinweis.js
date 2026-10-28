// Haftungs-/Rollenhinweis am Ende jedes Protokolls.
//
// Der Text steht in haftungshinweis.txt im Grundordner (legt die App beim
// ersten Verbinden mit diesem Standardtext an) und kann dort angepasst
// werden. Zeilen mit # am Anfang sind Kommentare. Leere Datei = kein Hinweis.

export const HINWEIS_DATEI = 'haftungshinweis.txt';

export const HINWEIS_STANDARD =
  'Die ökologische Baubegleitung ist beratend und dokumentierend tätig. Die Umsetzung der Schutz- und ' +
  'Vermeidungsmaßnahmen sowie die Einhaltung der behördlichen Auflagen obliegen dem Vorhabenträger und den ' +
  'ausführenden Firmen. Das Protokoll gibt den zum Begehungszeitpunkt festgestellten Zustand wieder.';

export const HINWEIS_VORLAGE =
  '# Hinweis am Ende jedes Protokolls (Begehung, Vorbegehung, Belehrung).\n' +
  '# Zeilen mit # werden ignoriert. Datei leeren = kein Hinweis im Protokoll.\n' +
  '# Änderungen gelten nach erneutem Verbinden des Grundordners (bzw. Neuladen der Seite).\n' +
  HINWEIS_STANDARD + '\n';

export function hinweisAusText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((z) => !z.trim().startsWith('#'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
