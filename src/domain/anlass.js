// Vorbelegter Text für „Anlass“ in Begehungs- und Vorbegehungsprotokoll.
// Bleibt im Protokoll frei editierbar; angepasst werden die genehmigende
// Behörde (aus dem Projekt) und die Baumschutzverordnung (nach Landkreis/Ort).

const KREISFREI = ['Cottbus', 'Brandenburg an der Havel', 'Frankfurt (Oder)'];

function istBerlin(lk, ort) {
  return /berlin/i.test(lk) || (!lk && /berlin/i.test(ort));
}

// Welche Baumschutz-Regelung gilt (Berlin, Potsdam, kreisfreie Stadt, Landkreis).
export function baumschutzRegel(lk, ort) {
  const l = (lk || '').trim();
  if (istBerlin(l, ort || '')) return 'der Berliner Baumschutzverordnung (BaumSchVO)';
  if (/^(stadt |landeshauptstadt )?potsdam$/i.test(l)) return 'der Potsdamer Baumschutzverordnung (PBaumSchVO)';
  const stadt = KREISFREI.find((s) => l.toLowerCase().includes(s.toLowerCase()));
  if (stadt) return 'der Baumschutzsatzung der Stadt ' + stadt;
  if (l) return 'der Baumschutzverordnung des Landkreises ' + l.replace(/^(landkreis|lk)\s+/i, '');
  return 'der örtlichen Baumschutzverordnung';
}

// d: { behoerde, landkreis, ort }
export function anlassText(d) {
  const lk = (d.landkreis || '').trim();
  const behoerde = (d.behoerde || '').trim() ||
    (istBerlin(lk, d.ort || '') ? 'zuständigen Behörde (Bezirksamt)'
      : lk ? 'Unteren Naturschutzbehörde ' + (/^(landkreis|lk)\s/i.test(lk) ? lk.replace(/^lk\s/i, 'Landkreis ') : 'Landkreis ' + lk)
        : 'zuständigen Behörde');
  return 'Ökologische Bauüberwachung für den Tiefbau. Vor-Ort-Kontrolle der Genehmigungsauflagen der ' + behoerde +
    ' zum Baumschutz. Insbesondere der DIN 18920 und R SBB (2023) sowie § 44 BNatSchG und Bodenschutzbestimmungen ' +
    '(DIN 19731 und DIN 18915) und ' + baumschutzRegel(lk, d.ort) + '.';
}
