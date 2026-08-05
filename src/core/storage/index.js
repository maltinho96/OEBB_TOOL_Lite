// Speicher-Fassade. Der Rest der App importiert AUSSCHLIESSLICH von hier,
// nie direkt von fsa.js (oder spaeter tauri.js). Dadurch bleibt die
// Domaenen-/UI-Schicht frei von Backend-Details, und ein Backend-Wechsel
// (z. B. Tauri fuer die Desktop-App) betrifft nur diese eine Datei.
//
// Browserphase: alles kommt aus dem FSA-Backend.
// Spaeter: hier per Umgebungserkennung zwischen fsa.js und tauri.js waehlen.

export {
  fsaVerfuegbar,
  waehleGrundordner,
  grundordnerHolen,
  waehleProjektordner,
  projektOrdnerHolen,
  leseDbText,
  schreibeDbText,
  dateiLesen,
  dateiSchreiben,
  dateiLoeschen,
  scanneHtmlDateien,
} from './fsa.js';