// Fotodokumentation: Einzelbildfelder (Unterschrift/Plan/Vis), die
// Abbildungs-Blöcke der Fotodokumentation (1/2 Bilder je Abb.), Drag&Drop
// und die Kartenausschnitt-Übernahme. Originalgetreu aus der HTML portiert,
// nur auf data-Hooks statt Inline-onclick umgestellt.
//
// fotosInit(root) einmalig nach formularInit() aufrufen (root = #app oder
// document). Verdrahtet alle data-einzelbild / data-dropzone / data-aktion
// Elemente sowie die drei versteckten <input type=file> aus index.html.

import { bildAlsDataUrl } from '../core/bilder.js';
import { BILD_MAX, BILD_QUALITAET } from '../config/konstanten.js';

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
    '<button data-aktion="abb-karte-uebernehmen">🗺 Übersichtskarte übernehmen</button>' +
    '<button data-aktion="abb-karte-waehlen">🗺 Eigener Kartenausschnitt…</button>' +
    '<button data-aktion="abb-foto-hinzu">＋ Foto</button>' +
    '<button class="entfernen" data-aktion="abb-entfernen">✕ entfernen</button>' +
    '</div>' +
    '<div class="abb-karte"></div>' +
    '<div class="abb-bilder"></div>' +
    '<div class="abb-titel">Abb.</div>' +
    '<div class="abb-text" contenteditable="true"></div>';
  container.appendChild(block);

  // Kartenausschnitt automatisch vom Übersichtsplan übernehmen, falls vorhanden.
  const plan = aktiverTab().querySelector('.plan-bild img');
  if (plan) {
    const k = document.createElement('img');
    k.src = plan.src;
    block.querySelector('.abb-karte').appendChild(k);
  }
  return block;
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
  if (!aktiverTab().querySelector('.fotoContainer')) {
    alert('Dieses Protokoll hat keine Fotodokumentation. Bitte zuerst den passenden Reiter öffnen.');
    return;
  }
  const liste = Array.from(files).filter((f) => f.type.indexOf('image/') === 0);
  let block = null;
  for (let i = 0; i < liste.length; i++) {
    if (i % 2 === 0) block = neuerAbbBlock();
    try {
      const url = await bildAlsDataUrl(liste[i], BILD_MAX.foto, BILD_QUALITAET);
      const img = document.createElement('img');
      img.src = url;
      block.querySelector('.abb-bilder').appendChild(img);
    } catch (err) {
      alert('Bild konnte nicht gelesen werden: ' + liste[i].name);
    }
  }
  abbNummerieren();
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

  // Verstecktes <input type=file multiple> für Block-Fotos und Kartenausschnitt
  // wird bei Bedarf einmalig erzeugt (index.html hat nur fotoInput + einzelbildInput).
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
  let blockKarteInput = document.getElementById('blockKarteInput');
  if (!blockKarteInput) {
    blockKarteInput = document.createElement('input');
    blockKarteInput.type = 'file';
    blockKarteInput.id = 'blockKarteInput';
    blockKarteInput.accept = 'image/*';
    blockKarteInput.hidden = true;
    document.body.appendChild(blockKarteInput);
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
      case 'abb-karte-uebernehmen': {
        const plan = btn.closest('.tab').querySelector('.plan-bild img');
        if (!plan) { alert('Es ist noch kein Übersichtsplan eingefügt.'); break; }
        const ziel = btn.closest('.abb').querySelector('.abb-karte');
        ziel.innerHTML = '';
        const k = document.createElement('img');
        k.src = plan.src;
        ziel.appendChild(k);
        break;
      }
      case 'abb-karte-waehlen':
        zielBlock = btn.closest('.abb');
        blockKarteInput.click();
        break;
      case 'abb-foto-hinzu':
        zielBlock = btn.closest('.abb');
        blockFotoInput.click();
        break;
      case 'abb-entfernen':
        btn.closest('.abb').remove();
        abbNummerieren();
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
      const url = await bildAlsDataUrl(e.target.files[i], BILD_MAX.foto, BILD_QUALITAET);
      const img = document.createElement('img');
      img.src = url;
      zielBlock.querySelector('.abb-bilder').appendChild(img);
    }
    abbNummerieren();
    e.target.value = '';
  });

  blockKarteInput.addEventListener('change', async (e) => {
    if (!e.target.files.length || !zielBlock) return;
    const url = await bildAlsDataUrl(e.target.files[0], BILD_MAX.plan, BILD_QUALITAET);
    const ziel = zielBlock.querySelector('.abb-karte');
    ziel.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    ziel.appendChild(img);
    e.target.value = '';
  });
}