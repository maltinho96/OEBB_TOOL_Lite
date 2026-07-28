// Firmen-Marken. Reine Daten – keine DOM-Zugriffe.
// id  -> Klassenname am <html> ist "firma-<id>"
// name-> voller Firmenname (Auswahl, Metadaten, Druckfuß)

export const FIRMEN = [
  { id: 'greens', name: 'NET-TEC GREENgineers GmbH' },
  { id: 'ing',    name: 'NET-TEC Ingenieurgesellschaft mbH' },
];

// Bequemer Zugriff per id, z. B. firmaNachId('ing').name
export function firmaNachId(id) {
  return FIRMEN.find((f) => f.id === id) || FIRMEN[0];
}
