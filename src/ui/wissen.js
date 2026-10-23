// Reiter "📚 Grundlagen": Wissensbasis als Kacheln.
//   Ebene 1: Themen-Kacheln (Baumschutz, Bodenschutz, …)
//   Ebene 2: Klick auf ein Thema klappt darunter die Karten mit Normen,
//            Gesetzen und Praxishinweisen auf (erneuter Klick schließt).
// Dazu eine Suche über alle Einträge. Inhalte: config/wissen.js.

import { esc } from '../core/util.js';
import { logo } from '../schema/felder.js';
import { WISSEN, WISSEN_STAND } from '../config/wissen.js';

let offen = null; // id des aufgeklappten Themas

function karte(e) {
  return '<article class="wk-karte wk-art-' + esc(e.art.toLowerCase()) + '">' +
    '<div class="wk-kopf"><span class="wk-art">' + esc(e.art) + '</span><h3>' + esc(e.titel) + '</h3></div>' +
    '<div class="wk-stand">' + esc(e.stand) + '</div>' +
    '<p><b>Regelt:</b> ' + esc(e.regelt) + '</p>' +
    '<p><b>Gilt:</b> ' + esc(e.gilt) + '</p>' +
    (e.link ? '<a class="wk-link" href="' + esc(e.link.url) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(e.link.text) + '</a>' : '') +
    '</article>';
}

function themenHtml() {
  return WISSEN.map((t) =>
    '<button type="button" class="wk-thema wk-' + t.farbe + (offen === t.id ? ' offen' : '') + '" data-wissen="' + t.id + '" aria-expanded="' + (offen === t.id) + '">' +
    '<span class="wk-symbol">' + t.symbol + '</span>' +
    '<span class="wk-titel">' + esc(t.titel) + '</span>' +
    '<span class="wk-kurz">' + esc(t.kurz) + '</span>' +
    '<span class="wk-anzahl">' + t.eintraege.length + ' Einträge ' + (offen === t.id ? '▴' : '▾') + '</span>' +
    '</button>'
  ).join('');
}

function detailHtml(t) {
  return '<div class="wk-detail wk-' + t.farbe + '">' +
    '<h2 class="c-' + t.farbe + '">' + t.symbol + ' ' + esc(t.titel) + '</h2>' +
    (t.hinweis ? '<p class="wk-hinweis">' + esc(t.hinweis) + '</p>' : '') +
    '<div class="wk-karten">' + t.eintraege.map(karte).join('') + '</div></div>';
}

function zeigen() {
  const kacheln = document.getElementById('wkThemen');
  const ziel = document.getElementById('wkInhalt');
  const such = (document.getElementById('wkSuche').value || '').trim().toLowerCase();
  if (such) {
    // Suche: alle passenden Einträge, nach Thema gruppiert.
    kacheln.style.display = 'none';
    const treffer = WISSEN.map((t) => ({ ...t, eintraege: t.eintraege.filter((e) =>
      [e.titel, e.stand, e.regelt, e.gilt, e.art].join(' ').toLowerCase().includes(such)) }))
      .filter((t) => t.eintraege.length);
    ziel.innerHTML = treffer.length ? treffer.map(detailHtml).join('') : '<p style="color:#777">Nichts gefunden.</p>';
    return;
  }
  kacheln.style.display = '';
  kacheln.innerHTML = themenHtml();
  const t = WISSEN.find((x) => x.id === offen);
  ziel.innerHTML = t ? detailHtml(t) : '';
}

export function wissenTabInit(mount) {
  const section = document.createElement('section');
  section.className = 'tab';
  section.id = 'tab-wissen';
  section.innerHTML = `
${logo()}
<h1>Grundlagen</h1>
<p style="margin-top:2px; color:#555">Normen, Gesetze und Praxis rund um die ökologische Baubegleitung – nach Themen.
Thema anklicken zum Aufklappen.</p>
<p class="kein-druck"><input type="search" id="wkSuche" placeholder="🔍 Suchen, z. B. „Wurzel“, „Zauneidechse“, „19639“ …" style="width:100%; max-width:420px; font:inherit; padding:5px 8px;"></p>
<div class="wk-themen" id="wkThemen"></div>
<div id="wkInhalt"></div>
<p class="wk-fuss">Kurzüberblick, Stand ${WISSEN_STAND}, ohne Gewähr. Maßgeblich sind der Originaltext der Norm bzw. des Gesetzes
und die Auflagen im jeweiligen Bescheid. DIN-Normen sind kostenpflichtig (DIN Media); verlinkt ist nur, wo es eine
Erläuterung oder den amtlichen Text frei gibt. Inhalte pflegen: <code>src/config/wissen.js</code>.</p>`;
  mount.appendChild(section);

  section.addEventListener('click', (e) => {
    const k = e.target.closest('[data-wissen]');
    if (!k) return;
    offen = offen === k.dataset.wissen ? null : k.dataset.wissen;
    zeigen();
    if (offen) document.getElementById('wkInhalt').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  section.addEventListener('input', (e) => {
    if (e.target.id === 'wkSuche') zeigen();
  });
  zeigen();
}
