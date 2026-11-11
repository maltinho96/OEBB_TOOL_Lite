// Android-App (android/…/MainActivity.java): Die Web-App läuft dort im
// WebView. Speichern und Drucken gehen über die Brücke window.OebbAndroid,
// weil ein WebView Downloads und window.print() nicht selbst kann.

export const istAndroidApp = () => typeof window !== 'undefined' && !!window.OebbAndroid;

// Datei über den Android-Speichern-Dialog sichern. true = gespeichert.
export function androidSpeichern(name, mime, inhalt, istBase64) {
  return new Promise((ok) => {
    window.__oebbAndroidGespeichert = (erfolg) => {
      window.__oebbAndroidGespeichert = null;
      ok(!!erfolg);
    };
    window.OebbAndroid.speichern(name, mime, inhalt, !!istBase64);
  });
}

// window.print() ersetzen: Vorbereitungen (beforeprint: Druckbilder der
// Karten, Fußzeile, Dateiname) wie im Browser auslösen, dann den
// Android-Druckdienst öffnen („Als PDF speichern“ oder Drucker).
export function androidDruckEinrichten() {
  window.print = () => {
    window.dispatchEvent(new Event('beforeprint'));
    // Einen Moment Zeit für die Karten-Druckbilder lassen.
    setTimeout(() => {
      window.__oebbAndroidDruckFertig = () => {
        window.__oebbAndroidDruckFertig = null;
        window.dispatchEvent(new Event('afterprint'));
      };
      window.OebbAndroid.drucken(document.title || 'ÖBB-Protokoll');
    }, 400);
  };
}
