// =====================================================================
//  main.js – Einstiegspunkt der App. Von index.html als
//  <script type="module"> geladen.
// =====================================================================

// ---------------------------------------------------------------------
//  Stile
// ---------------------------------------------------------------------
import './styles/grundlagen.css';
import './styles/themes.css';
import './styles/karte.css';
import './styles/druck.css';

// ---------------------------------------------------------------------
//  Module
// ---------------------------------------------------------------------
import { FIRMEN } from './config/firmen.js';
import { schemaRegistry } from './schema/index.js';

import { formularInit } from './ui/formular.js';
import { firmaInit } from './ui/firma.js';
import { fotosInit } from './ui/fotos.js';
import { karteTabInit, karteBeiAnzeigeAktualisieren } from './ui/karte.js';
import { stundenTabInit, stundenBeiAnzeigeAktualisieren } from './ui/stundentabelle.js';
import { uebersichtTabInit, uebersichtBeiAnzeigeAktualisieren } from './ui/dashboard.js';
import { tabsInit, tabWechselHook, tabZeigen } from './ui/tabs.js';
import { werkzeugeInit } from './ui/werkzeuge.js';
import { baubegleiterVorbelegen } from './core/nutzer.js';

import { htmlExportInit } from './export/html-export.js';
import { htmlImportInit } from './export/html-import.js';
import { xlsxExportInit } from './export/xlsx-export.js';

// ---------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------
function start() {
  const app = document.getElementById('app');

  // Reihenfolge wichtig: erst alle Reiter-Inhalte einhaengen (bauen den
  // DOM auf), dann Firma/Fotos verdrahten (brauchen die Sections schon),
  // dann tabWechselHook registrieren, dann tabsInit() zuletzt (verdrahtet
  // Klicks auf die jetzt existierenden Knoepfe).
  formularInit(app, schemaRegistry);
  uebersichtTabInit(app);
  karteTabInit(app);
  stundenTabInit(app);

  fotosInit(app);
  firmaInit(document.getElementById('firmenSelect'), FIRMEN);

  tabWechselHook(karteBeiAnzeigeAktualisieren);
  tabWechselHook(stundenBeiAnzeigeAktualisieren);
  tabWechselHook(uebersichtBeiAnzeigeAktualisieren);
  tabWechselHook(baubegleiterVorbelegen);

  tabsInit();
  werkzeugeInit();
  htmlExportInit();
  htmlImportInit();
  xlsxExportInit();

  // Startansicht: Übersicht ist bereits .tab.aktiv im HTML; tabZeigen()
  // synchronisiert einmalig den Rest (Werkzeugleiste etc.), damit der
  // Zustand von Anfang an korrekt ist, nicht erst nach dem ersten Klick.
  tabZeigen('tab-uebersicht');
  uebersichtBeiAnzeigeAktualisieren('tab-uebersicht');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}