// Firmen (Name, Logo, Akzentfarbe). Reine Daten – keine DOM-Zugriffe.
//
// Festgelegt werden die Firmen im Grundordner in der Textdatei firmen.txt,
// die Logos liegen im Unterordner logos/:
//
//   📁 Grundordner
//   ├── firmen.txt
//   └── 📁 logos
//       ├── logo-ing.svg
//       └── logo-greens.svg
//
// Aufbau von firmen.txt – eine Firma pro Zeile, Teile mit | getrennt:
//
//   Firmenname | Logo-Datei | Farbe (optional)
//
// Die erste Firma ist beim Start ausgewählt. Zeilen mit # sind Kommentare.
// Gibt es keine firmen.txt, gelten die STANDARD_FIRMEN unten.

const STANDARD_FARBE = '#1f3864';

export const STANDARD_FIRMEN = [
  { name: 'NET-TEC Ingenieurgesellschaft mbH', logo: 'logo-ing.svg', farbe: '#1f3864' },
  { name: 'NET-TEC GREENgineers GmbH', logo: 'logo-greens.svg', farbe: '#12b296' },
];

// Vorlage, die die App anbietet, wenn firmen.txt fehlt.
export const FIRMEN_VORLAGE =
  '# Firmen für das ÖBB-Tool – eine Firma pro Zeile:\n' +
  '#   Firmenname | Logo-Datei (im Ordner logos) | Farbe (optional)\n' +
  '# Die erste Firma ist beim Start ausgewählt.\n' +
  STANDARD_FIRMEN.map((f) => f.name + ' | ' + f.logo + ' | ' + f.farbe).join('\n') + '\n';

const FARBE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// Liest firmen.txt. Gibt { firmen, fehler } zurück; fehler listet Zeilen,
// die nicht verstanden wurden (für die Statusanzeige).
export function firmenAusText(text) {
  const firmen = [];
  const fehler = [];
  String(text || '').split(/\r?\n/).forEach((zeile, i) => {
    const z = zeile.trim();
    if (!z || z.startsWith('#')) return;
    const [name, logo, farbe] = z.split('|').map((t) => (t || '').trim());
    if (!name) { fehler.push('Zeile ' + (i + 1) + ': kein Firmenname'); return; }
    if (farbe && !FARBE.test(farbe)) fehler.push('Zeile ' + (i + 1) + ': Farbe „' + farbe + '“ ungültig (z. B. #1f3864)');
    firmen.push({
      name,
      logo: logo || '',
      farbe: farbe && FARBE.test(farbe) ? farbe : STANDARD_FARBE,
    });
  });
  return { firmen, fehler };
}
