// Speicher-Fassade. Der Rest der App importiert AUSSCHLIESSLICH von hier,
// nie direkt von fsa.js oder tauri.js.
//
//  - Browser (GitHub Pages): File System Access API (fsa.js)
//  - Desktop-Programm (Tauri): direkter Dateizugriff (tauri.js)

import * as fsa from './fsa.js';
import * as tauri from './tauri.js';

export const istDesktop = () => typeof window !== 'undefined' && !!(window.__TAURI__ && window.__TAURI__.core);
const b = () => (istDesktop() ? tauri : fsa);

export const waehleGrundordner = (...a) => b().waehleGrundordner(...a);
export const grundordnerHolen = (...a) => b().grundordnerHolen(...a);
export const gespeicherterGrundordner = (...a) => b().gespeicherterGrundordner(...a);
export const waehleProjektordner = (...a) => b().waehleProjektordner(...a);
export const projektOrdnerHolen = (...a) => b().projektOrdnerHolen(...a);
export const gespeicherterProjektordner = (...a) => b().gespeicherterProjektordner(...a);
export const leseDbText = (...a) => b().leseDbText(...a);
export const schreibeDbText = (...a) => b().schreibeDbText(...a);
export const dateiLesen = (...a) => b().dateiLesen(...a);
export const dateiAlsDataUrl = (...a) => b().dateiAlsDataUrl(...a);
export const dateiSchreiben = (...a) => b().dateiSchreiben(...a);
export const dateiLoeschen = (...a) => b().dateiLoeschen(...a);
export const unterordnerHolen = (...a) => b().unterordnerHolen(...a);
export const scanneHtmlDateien = (...a) => b().scanneHtmlDateien(...a);

// Nur Desktop: Speichern-Dialog mit vollem Dateizugriff.
export const speichernUnter = (...a) => tauri.speichernUnter(...a);
export const konfigLesen = () => tauri.konfigLesen();
