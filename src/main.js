// =====================================================================
//  main.js  –  Einstiegspunkt der App  (Bauplan / Zielzustand)
//  Von index.html als <script type="module"> geladen.
//
//  SO ARBEITEST DU DAMIT:
//  Die App laeuft schon mit den "Inline-Stubs" weiter unten. Jedes Mal,
//  wenn du ein Modul fertig gebaut hast:
//    1) oben die passende import-Zeile EINkommentieren
//    2) unten den zugehoerigen Stub (mit gleichem [MODUL:...]-Marker) LOESCHEN
//    3) im Browser pruefen, dass alles laeuft  ->  git commit
//
//  Wichtig: Eine import-Zeile erst dann einkommentieren, wenn die Datei
//  dahinter WIRKLICH existiert – sonst bricht die App.
// =====================================================================


// ---------------------------------------------------------------------
//  STILE  (einkommentieren, sobald die jeweilige CSS-Datei existiert)
// ---------------------------------------------------------------------
// import './styles/grundlagen.css';
// import './styles/themes.css';
// import './styles/formular.css';
// import './styles/karte.css';
// import './styles/druck.css';


// ---------------------------------------------------------------------
//  MODULE  (nach dem gleichen Prinzip Schritt fuer Schritt aktivieren)
// ---------------------------------------------------------------------
// [MODUL: config]
// import { FIRMEN } from './config/firmen.js';
// import * as KONST from './config/konstanten.js';

// [MODUL: core]
// import { storageInit } from './core/storage/index.js';
// import { dbLesen } from './core/db.js';
// import { bildAlsDataUrl } from './core/bilder.js';
// import { metaAktualisieren } from './core/meta.js';

// [MODUL: domain]
// import * as Projekt from './domain/projekt.js';
// import * as Stunden from './domain/stunden.js';

// [MODUL: schema]
// import { schemaRegistry } from './schema/index.js';

// [MODUL: ui]
// import { tabsInit } from './ui/tabs.js';
// import { firmaInit } from './ui/firma.js';
// import { formularInit } from './ui/formular.js';
// import { fotosInit } from './ui/fotos.js';
// import { karteInit } from './ui/karte.js';
// import { projektformularInit } from './ui/projektformular.js';
// import { stundentabelleInit } from './ui/stundentabelle.js';
// import { dashboardRendern } from './ui/dashboard.js';

// [MODUL: export]
// import { alsHtmlSpeichern } from './export/html-export.js';
// import { xlsxExportieren } from './export/xlsx-export.js';


console.log('OEBB-App laeuft.');


// =====================================================================
//  ZIELVERDRAHTUNG
//  So sieht start() am Ende aus. Vorerst sind die modularen Aufrufe
//  auskommentiert und durch die Inline-Stubs darunter abgedeckt.
// =====================================================================
async function start() {
  // ---- aktiv (Inline-Stubs, s. u.) --------------------------------
  firmaInitStub();
  tabsInitStub();
  werkzeugeInitStub();
  tabZeigen('tab-uebersicht');

  // ---- Zielzustand (einkommentieren, Stubs oben dann entfernen) ----
  // firmaInit(document.getElementById('firmenSelect'), FIRMEN);
  // tabsInit(tabZeigen);
  // formularInit(document.getElementById('app'), schemaRegistry);
  // fotosInit();
  // projektformularInit();
  // werkzeugeInit();
  //
  // const db = await storageInit();       // Grundordner + DB laden
  // dashboardRendern(document.getElementById('app'), db);
}


// =====================================================================
//  INLINE-STUBS  (vorlaeufig – werden pro Modul geloescht)
//  Jeder Block traegt den [MODUL:...]-Marker des Moduls, das ihn ersetzt.
// =====================================================================

// ----- [MODUL: config] + [MODUL: ui] firma --------------------------
// Ersetzt durch config/firmen.js (FIRMEN) und ui/firma.js (firmaInit).
const FIRMEN_STUB = [
  { id: 'greens', name: 'NET-TEC GREENgineers GmbH' },
  { id: 'ing', name: 'NET-TEC Ingenieurgesellschaft mbH' },
];
function firmaSetzen(id) {
  document.documentElement.classList.remove('firma-greens', 'firma-ing');
  document.documentElement.classList.add('firma-' + id);
}
function firmaInitStub() {
  const select = document.getElementById('firmenSelect');
  if (!select) return;
  select.innerHTML = FIRMEN_STUB
    .map((f) => `<option value="${f.id}">${f.name}</option>`)
    .join('');
  select.addEventListener('change', () => firmaSetzen(select.value));
  firmaSetzen(FIRMEN_STUB[0].id);
}

// ----- [MODUL: ui] tabs ---------------------------------------------
// Ersetzt durch ui/tabs.js (tabsInit). Die Funktion tabZeigen selbst
// zieht spaeter mit nach ui/tabs.js um und wird von dort exportiert.
const PROTOKOLL_TABS = ['tab-protokoll', 'tab-vorbegehung', 'tab-belehrung'];
function tabZeigen(id) {
  document.querySelectorAll('.tab-knopf').forEach((b) =>
    b.classList.toggle('aktiv', b.dataset.tab === id)
  );
  document.querySelectorAll('.sub-knopf').forEach((b) =>
    b.classList.toggle('aktiv', b.dataset.tab === id)
  );
  const istProtokoll = PROTOKOLL_TABS.includes(id);
  const unterleiste = document.getElementById('unterleiste');
  if (unterleiste) unterleiste.style.display = istProtokoll ? 'flex' : 'none';
  const knopfProtokolle = document.getElementById('knopfProtokolle');
  if (knopfProtokolle) knopfProtokolle.classList.toggle('aktiv', istProtokoll);
  window.scrollTo(0, 0);
}
function tabsInitStub() {
  document.querySelectorAll('[data-tab]').forEach((knopf) => {
    knopf.addEventListener('click', () => tabZeigen(knopf.dataset.tab));
  });
}

// ----- [MODUL: export] + fotos (Werkzeugleiste) ---------------------
// Ersetzt durch werkzeugeInit() zusammen mit export/html-export.js
// (alsHtmlSpeichern) und ui/fotos.js.
function werkzeugeInitStub() {
  document.querySelectorAll('[data-aktion]').forEach((knopf) => {
    knopf.addEventListener('click', () => {
      switch (knopf.dataset.aktion) {
        case 'drucken':
          window.print();
          break;
        case 'fotos':
          document.getElementById('fotoInput')?.click();
          break;
        case 'speichern':
          // spaeter: alsHtmlSpeichern();
          alert('Speichern kommt in einem spaeteren Schritt.');
          break;
      }
    });
  });
}


// =====================================================================
//  App starten, sobald das HTML geladen ist
// =====================================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
