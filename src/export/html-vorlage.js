// Baut ein eigenständiges, offline-lauffähiges HTML-Dokument für eine
// gespeicherte Protokoll-Datei. Anders als im Original (eine einzige,
// bereits monolithische HTML-Datei mit allem Inline-CSS/JS) muss die
// modulare App diese Eigenständigkeit beim Export erst herstellen: die
// Stile werden per Vite ?raw-Import als Text eingebettet, das Ergebnis
// ist aber funktional dasselbe – eine Datei, die man doppelklicken und
// offline ansehen kann, inklusive des eingebetteten Metadaten-Scripts
// für den späteren Scan durch die App.

import grundlagenCss from '../styles/grundlagen.css?raw';
import themesCss from '../styles/themes.css?raw';
import druckCss from '../styles/druck.css?raw';

// firmaKlasse: 'firma-greens' | 'firma-ing'
// titel: <title>-Text
// bodyHtml: HTML des aktiven Protokoll-Reiters (bereits mit Werten gefüllt)
// metaScriptTag: fertiges <script id="protokollMeta">…</script>-Tag
export function htmlVorlage({ firmaKlasse, titel, bodyHtml, metaScriptTag }) {
  return `<!DOCTYPE html>
<html lang="de" class="${firmaKlasse}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel}</title>
<style>
${grundlagenCss}
${themesCss}
${druckCss}
</style>
</head>
<body>
<div class="blatt">
${bodyHtml}
</div>
${metaScriptTag}
</body>
</html>`;
}