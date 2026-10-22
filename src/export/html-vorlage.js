// Baut ein eigenständiges, offline-lauffähiges HTML-Dokument für eine
// gespeicherte Protokoll-Datei. Anders als im Original (eine einzige,
// bereits monolithische HTML-Datei mit allem Inline-CSS/JS) muss die
// modulare App diese Eigenständigkeit beim Export erst herstellen: die
// Stile werden per Vite ?raw-Import als Text eingebettet, das Ergebnis
// ist aber funktional dasselbe – eine Datei, die man doppelklicken und
// offline ansehen kann, inklusive des eingebetteten Metadaten-Scripts
// für den späteren Scan durch die App.
//
// Sicherheit: Die Datei darf keinerlei Skripte ausführen (CSP default-src
// 'none'). Selbst wenn jemand Schadcode in ein Feld schreibt, läuft er beim
// Öffnen der Datei nicht. Der Metadaten-Block ist reines JSON und wird nur
// gelesen, nie ausgeführt.

import grundlagenCss from '../styles/grundlagen.css?raw';
import themesCss from '../styles/themes.css?raw';
import druckCss from '../styles/druck.css?raw';
import leafletCss from 'leaflet/dist/leaflet.css?raw';

// firmenFarbe: Akzentfarbe der gewählten Firma (z. B. #1f3864)
// titel: <title>-Text
// bodyHtml: HTML des aktiven Protokoll-Reiters (bereits mit Werten gefüllt)
// metaScriptTag: fertiges <script id="protokollMeta">…</script>-Tag
// fussCss: @page-Regel der Fußzeile (aus ui/fusszeile.js), fest eingebaut
export function htmlVorlage({ firmenFarbe, titel, bodyHtml, metaScriptTag, fussCss }) {
  return `<!DOCTYPE html>
<html lang="de" style="--firma:${firmenFarbe}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https://tile.openstreetmap.org; style-src 'unsafe-inline'; font-src data:">
<title>${String(titel).replace(/[<>&]/g, '')}</title>
<style>
${grundlagenCss}
${themesCss}
${druckCss}
${leafletCss}
/* Gespeicherte Datei: Karten sind feste Bilder (ui/kartenbild.js). */
@media screen{ .hat-druckbild > .karte-druckbild{display:block; width:100%; max-width:718px; margin:0 auto; border:1px solid #999; border-radius:4px;} }
${fussCss || ''}
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
