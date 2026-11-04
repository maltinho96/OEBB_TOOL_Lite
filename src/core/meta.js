// Der eingebettete Metadaten-Block <script id="protokollMeta"> verknuepft
// eine gespeicherte Protokoll-HTML mit der Datenbank (Typ, Firma, Nummer,
// Projekt, Ort, Datum). Hier nur textbasierte, DOM-freie Logik:
//  - metaAusText: aus HTML-Rohtext lesen (Scan)
//  - baueMeta:    aus einem Daten-Objekt erzeugen (Export)
//  - metaSerialisieren: sicher fuer die Einbettung stringifizieren

// Metadaten aus dem Kopf einer gespeicherten Protokoll-HTML lesen.
// Gibt das Meta-Objekt oder null zurueck.
// Fehlt der Block (oder ist er beschädigt), wird der Protokolltyp aus dem
// gespeicherten Reiter erkannt (<section … id="tab-protokoll">) – so lassen
// sich auch solche Dateien laden und finden.
export function metaAusText(text) {
  const m = text.match(/<script[^>]*id="protokollMeta"[^>]*>(.*?)<\/script>/s);
  if (m) {
    try {
      const meta = JSON.parse(m[1]);
      if (meta && meta.typ) return meta;
    } catch { /* unten: aus dem Reiter erkennen */ }
  }
  const s = text.match(/<section[^>]*\bid="tab-(protokoll|vorbegehung|belehrung-karel|belehrung)"/);
  return s ? { typ: s[1] } : null;
}

// Meta-Objekt aus einem einfachen Daten-Objekt bauen.
// daten: { typ, firma, nummer, projekt, projektnummer, ort, datum }
export function baueMeta(daten) {
  return {
    typ: daten.typ || '',
    firma: daten.firma || '',
    nummer: daten.nummer || '',
    projekt: daten.projekt || '',
    projektnummer: daten.projektnummer || '',
    ort: daten.ort || '',
    datum: daten.datum || '',
    gespeichert: new Date().toISOString(),
  };
}

// Fuer die Einbettung in eine HTML-Datei stringifizieren.
// '<' wird escaped, damit der JSON-Inhalt kein Tag vorzeitig schliesst.
export function metaSerialisieren(meta) {
  return JSON.stringify(meta).replace(/</g, '\\u003c');
}
