// Projektlogik: DB-Manipulation. KEIN DOM – die Formular-/Render-Teile
// liegen in ui/projektformular.js bzw. ui/dashboard.js.
//
// p.eintraege: { Dateiname: { typ, nummer, datum, ort, stunden: [...] } }
//   – entstehen über „⏱ In Stunden überführen“ am Ende eines Protokolls
//   (ui/stundenuebernahme.js). Es wird kein Ordner mehr durchsucht.
// p.ordner:    { name, pfad } – Protokollordner (Speicherort). pfad nur im
//   Desktop-Programm (der Browser verrät keine Pfade).
// p.abrechnung: 'stunde' (Standard) | 'tag'

// ---------- DB-Manipulation (rein, ohne IO) ----------

// Projekt anlegen oder (bei warBearbeitung) aktualisieren.
// Bei Aktualisierung bleiben vorhandene eintraege erhalten.
export function projektSchreiben(db, id, daten, warBearbeitung) {
  if (warBearbeitung && db.projekte[id]) {
    Object.assign(db.projekte[id], daten); // eintraege unberuehrt
  } else {
    db.projekte[id] = { ...daten, eintraege: {} };
  }
  return db.projekte[id];
}

// Projekt aus der DB entfernen (die Protokoll-Dateien bleiben unberuehrt).
export function projektLoeschen(db, id) {
  const p = db.projekte[id];
  delete db.projekte[id];
  return p;
}

// Neue Projekt-Id erzeugen.
export function neueProjektId() {
  return 'p' + Date.now();
}

// ---------- Aktenzeichen und Verteiler je Projekt ----------
//
// p.aktenzeichen: [{ az, kommentar, haupt }]  – höchstens eins mit haupt
// p.verteiler:    [{ name, email }]
// Ältere Projekte hatten nur ein einzelnes infos.aktenzeichen (Text); das
// gilt dann als Haupt-Aktenzeichen.

export function aktenzeichenListe(p) {
  if (!p) return [];
  if (Array.isArray(p.aktenzeichen)) return p.aktenzeichen;
  const alt = p.infos && p.infos.aktenzeichen;
  return alt ? [{ az: alt, kommentar: '', haupt: true }] : [];
}

export function hauptAktenzeichen(p) {
  const liste = aktenzeichenListe(p);
  const h = liste.find((a) => a.haupt);
  return h ? h.az : '';
}

export function verteilerListe(p) {
  return p && Array.isArray(p.verteiler) ? p.verteiler : [];
}

// Bewusst streng: keine Zeichen wie ? & = , ; – die könnten in einem
// mailto:-Link zusätzliche Empfänger oder Felder einschleusen.
export const EMAIL_MUSTER = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
