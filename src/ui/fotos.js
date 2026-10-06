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

// Zielelement für den nächsten Einzelbild-Upload (Unterschrift/Plan/Vis).
let zielEinzelbild = null;
let einzelbildMax = 1800;

// Zielblock für "Foto zu diesem Block" bzw. "eigener Kartenausschnitt".
let zielBlock = null;

// ---------- Einzelbildfelder (Unterschrift, Übersichtsplan, Vis-Bild) ----------

function einzelbildWaehlen(el, typ) {
  zielEinzelbild = el;
  einzelbildMax = typ === 'unterschrift' ? BILD_MAX.unterschrift : BILD_MAX.plan;
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

function neuerAbbBlock() {
  const container = aktiverTab().querySelector('.fotoContainer');
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
    } catch (err) {
      alert('Bild konnte nicht gelesen werden: ' + liste[i].name);
    }
  }
  abbNummerieren();
  karteAktualisieren(tab);
}

// ---------- Belehrung: Visualisierungszeilen ----------

function visZeileHinzufuegen(btn) {
  const container = btn.closest('.tab').querySelector('.visContainer');
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

  // Einzelbildfelder (Unterschrift/Übersichtsplan/Vis) per Klick.
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