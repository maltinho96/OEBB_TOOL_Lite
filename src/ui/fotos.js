// Fotodokumentation: Einzelbildfelder (Unterschrift/Vis), die
// Abbildungs-Blöcke der Fotodokumentation (1/2 Bilder je Abb.) und
// Drag&Drop. Die Karte über jedem Block entsteht automatisch aus den
// GPS-Daten der Fotos (ui/fotokarte.js).
//
// fotosInit(root) einmalig nach formularInit() aufrufen (root = #app oder
// document). Verdrahtet alle data-einzelbild / data-dropzone / data-aktion
// Elemente sowie die drei versteckten <input type=file> aus index.html.

import { bildAlsDataUrl } from '../core/bilder.js';
import { BILD_MAX, BILD_QUALITAET } from '../config/konstanten.js';
import { gpsAusDatei } from '../core/exif.js';
import { karteAktualisieren } from './fotokarte.js';

// ---------- Hilfsfunktionen ----------

// Aktuell sichtbarer Protokoll-Tab (der einzige mit .tab.aktiv).
function aktiverTab() {
  return document.querySelector('.tab.aktiv');
}

// Zielelement für den nächsten Einzelbild-Upload (Unterschrift/Vis-Bild).
let zielEinzelbild = null;
let einzelbildMax = BILD_MAX.visualisierung;

// Zielblock für "＋ Foto" (weiteres Foto in einen bestehenden Block).
let zielBlock = null;

// ---------- Einzelbildfelder (Unterschrift, Vis-Bild) ----------

function einzelbildWaehlen(el, typ) {
  zielEinzelbild = el;
  einzelbildMax = typ === 'unterschrift' ? BILD_MAX.unterschrift : BILD_MAX.visualisierung;
}

async function einzelbildEinsetzen(file) {
  if (!file || !zielEinzelbild) return;
  const url = await bildAlsDataUrl(file, einzelbildMax, BILD_QUALITAET);
  zielEinzelbild.innerHTML = '';
  const img = document.createElement('img');
  img.src = url;
  zielEinzelbild.appendChild(img);
}

// ---------- Abbildungs-Blöcke (Fotodokumentation, 1/2 Bilder) ----------

function neuerAbbBlock(container = aktiverTab().querySelector('.fotoContainer')) {
  if (!container) return null;
  const block = document.createElement('div');
  block.className = 'abb modus-2';
  block.innerHTML =
    '<div class="abb-kopf kein-druck">' +
    '<button data-aktion="abb-modus">🔁 1 / 2 Bilder</button>' +
    '<button data-aktion="abb-foto-hinzu">＋ Foto</button>' +
    '<button class="entfernen" data-aktion="abb-entfernen">✕ entfernen</button>' +
    '</div>' +
    '<div class="abb-karte"></div>' +
    '<div class="abb-bilder"></div>' +
    '<div class="abb-titel">Abb.</div>' +
    '<div class="abb-text" contenteditable="true"></div>';
  container.appendChild(block);
  return block;
}

// Liest GPS aus der Original-Datei (vor dem Verkleinern, das EXIF entfernt),
// verkleinert das Bild und hängt die Koordinate als data-lat/-lng an.
async function fotoMitGps(file) {
  const gps = await gpsAusDatei(file);
  const url = await bildAlsDataUrl(file, BILD_MAX.foto, BILD_QUALITAET);
  const img = document.createElement('img');
  img.src = url;
  img.title = 'Klicken, um Stellen rot einzukreisen';
  if (gps) {
    img.dataset.lat = gps.lat;
    img.dataset.lng = gps.lng;
  }
  return img;
}

function abbNummerieren() {
  document.querySelectorAll('.fotoContainer').forEach((container) => {
    let nr = 1;
    container.querySelectorAll('.abb').forEach((b) => {
      const anzahl = b.querySelectorAll('.abb-bilder img').length;
      const titel = b.querySelector('.abb-titel');
      titel.textContent =
        anzahl > 1 ? `Abb. ${nr} und ${nr + anzahl - 1}:` : `Abb. ${nr}:`;
      nr += Math.max(anzahl, 1);
    });
  });
}

async function fotosVerarbeiten(files) {
  const tab = aktiverTab();
  const container = tab.querySelector('.fotoContainer') ? tab : null;
  if (!container) {
    alert('Dieses Protokoll hat keine Fotodokumentation. Bitte zuerst den passenden Reiter öffnen.');
    return;
  }
  const liste = Array.from(files).filter((f) => f.type.indexOf('image/') === 0);
  let block = null;
  for (let i = 0; i < liste.length; i++) {
    if (i % 2 === 0) block = neuerAbbBlock();
    try {
      block.querySelector('.abb-bilder').appendChild(await fotoMitGps(liste[i]));
    } catch {
      alert('Bild konnte nicht gelesen werden: ' + liste[i].name);
    }
  }
  abbNummerieren();
  karteAktualisieren(tab);
}

// ---------- Belehrung: Visualisierungszeilen ----------

function visZeileHinzufuegen(btn) {
  // Im Karel-Protokoll hat jeder Themenblock (.vis-gruppe) seine eigene
  // Piktogramm-Liste; sonst die (einzige) Liste des Reiters.
  const container = (btn.closest('.vis-gruppe') || btn.closest('.tab')).querySelector('.visContainer');
  const z = document.createElement('div');
  z.className = 'vis-zeile';
  z.innerHTML =
    '<div class="vis-bild" data-einzelbild="vis"></div>' +
    '<div class="vis-text" contenteditable="true"></div>' +
    '<button class="vis-entfernen kein-druck" data-aktion="vis-entfernen">✕</button>';
  container.appendChild(z);
  z.querySelectorAll('[data-einzelbild]').forEach((el) => {
    el.addEventListener('click', () => einzelbildWaehlen(el, el.dataset.einzelbild));
  });
}

// ---------- Initialisierung ----------

export function fotosInit(root) {
  root = root || document;

  const fotoInput = document.getElementById('fotoInput');
  const einzelbildInput = document.getElementById('einzelbildInput');

  // Verstecktes <input type=file multiple> für Block-Fotos wird bei Bedarf
  // einmalig erzeugt (index.html hat nur fotoInput + einzelbildInput).
  let blockFotoInput = document.getElementById('blockFotoInput');
  if (!blockFotoInput) {
    blockFotoInput = document.createElement('input');
    blockFotoInput.type = 'file';
    blockFotoInput.id = 'blockFotoInput';
    blockFotoInput.accept = 'image/*';
    blockFotoInput.multiple = true;
    blockFotoInput.hidden = true;
    document.body.appendChild(blockFotoInput);
  }

  // Einzelbildfelder (Unterschrift/Vis) per Klick.
  root.querySelectorAll('[data-einzelbild]').forEach((el) => {
    el.addEventListener('click', () => {
      einzelbildWaehlen(el, el.dataset.einzelbild);
      einzelbildInput.click();
    });
  });
  einzelbildInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    await einzelbildEinsetzen(e.target.files[0]);
    e.target.value = '';
  });

  // Fotodokumentations-Dropzone: Klick öffnet den Mehrfach-Dateidialog.
  root.querySelectorAll('[data-dropzone]').forEach((dz) => {
    dz.addEventListener('click', () => fotoInput.click());
    ['dragenter', 'dragover'].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('aktiv'); })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('aktiv'); })
    );
    dz.addEventListener('drop', (e) => fotosVerarbeiten(e.dataTransfer.files));
  });
  fotoInput.addEventListener('change', (e) => {
    fotosVerarbeiten(e.target.files);
    e.target.value = '';
  });

  // Block-Aktionen (Delegation über den Mount-Punkt, da Blöcke dynamisch entstehen).
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion]');
    if (!btn) return;
    switch (btn.dataset.aktion) {
      case 'abb-modus': {
        const block = btn.closest('.abb');
        block.classList.toggle('modus-1');
        block.classList.toggle('modus-2');
        break;
      }
      case 'abb-foto-hinzu':
        zielBlock = btn.closest('.abb');
        blockFotoInput.click();
        break;
      case 'abb-entfernen':
        btn.closest('.abb').remove();
        abbNummerieren();
        karteAktualisieren(aktiverTab());
        break;
      case 'vis-entfernen':
        btn.closest('.vis-zeile').remove();
        break;
      case 'vis-zeile-hinzu':
        visZeileHinzufuegen(btn);
        break;
    }
  });

  blockFotoInput.addEventListener('change', async (e) => {
    if (!e.target.files.length || !zielBlock) return;
    for (let i = 0; i < e.target.files.length; i++) {
      zielBlock.querySelector('.abb-bilder').appendChild(await fotoMitGps(e.target.files[i]));
    }
    abbNummerieren();
    karteAktualisieren(zielBlock.closest('.tab'));
    e.target.value = '';
  });
}

// ---------- Fotos aus einem gespeicherten Protokoll übernehmen ----------
// Für "Protokoll laden" im Korrektur-Modus. Die Blöcke werden neu aufgebaut
// (nicht als HTML kopiert), und nur eingebettete Bilder (data:image/…) werden
// übernommen – eine geladene Datei kann so kein fremdes Markup und keine
// externen Bildquellen einschleusen. Die Fotos werden nicht neu kodiert,
// es geht also keine Qualität verloren.
const DATA_BILD = /^data:image\/(jpeg|png|webp);base64,/;

// Text eines (geladenen, nicht angezeigten) Elements mit Zeilenumbrüchen:
// <br> und Absatz-Elemente werden zu \n. Liest nur Textknoten, übernimmt
// also kein Markup.
export function textMitUmbruechen(el) {
  let out = '';
  const lauf = (knoten) => {
    knoten.childNodes.forEach((k) => {
      if (k.nodeType === 3) out += k.data;
      else if (k.nodeName === 'BR') out += '\n';
      else if (k.nodeType === 1) {
        if (/^(DIV|P)$/.test(k.nodeName) && out && !out.endsWith('\n')) out += '\n';
        lauf(k);
      }
    });
  };
  lauf(el);
  return out.replace(/\n+$/, '');
}

export function fotosUebernehmen(quelle, ziel) {
  const container = ziel.querySelector('.fotoContainer');
  if (!container) return 0;
  container.innerHTML = '';
  let anzahl = 0;
  quelle.querySelectorAll('.fotoContainer .abb').forEach((alt) => {
    const bilder = Array.from(alt.querySelectorAll('.abb-bilder img'))
      .filter((i) => DATA_BILD.test(i.getAttribute('src') || ''));
    if (!bilder.length) return;
    const block = neuerAbbBlock(container);
    if (alt.classList.contains('modus-1')) {
      block.classList.remove('modus-2');
      block.classList.add('modus-1');
    }
    bilder.forEach((q) => {
      const img = document.createElement('img');
      img.src = q.getAttribute('src');
      img.title = 'Klicken, um Stellen rot einzukreisen';
      const lat = parseFloat(q.getAttribute('data-lat'));
      const lng = parseFloat(q.getAttribute('data-lng'));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        img.dataset.lat = lat;
        img.dataset.lng = lng;
      }
      block.querySelector('.abb-bilder').appendChild(img);
      anzahl++;
    });
    const text = alt.querySelector('.abb-text');
    if (text) block.querySelector('.abb-text').innerText = textMitUmbruechen(text);
  });
  abbNummerieren();
  karteAktualisieren(ziel);
  return anzahl;
}

// Unterschrift-Bilder positionsweise übernehmen (ebenfalls nur data:image).
export function unterschriftenUebernehmen(quelle, ziel) {
  const q = quelle.querySelectorAll('.unterschrift-feld');
  const z = ziel.querySelectorAll('.unterschrift-feld');
  q.forEach((feld, i) => {
    const bild = feld.querySelector('img');
    const src = bild && bild.getAttribute('src');
    if (!z[i] || !src || !DATA_BILD.test(src)) return;
    z[i].innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    z[i].appendChild(img);
  });
}
