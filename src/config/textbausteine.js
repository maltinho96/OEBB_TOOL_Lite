// Textbausteine für das Belehrungsprotokoll "Karel" (Auflagen zum
// Naturschutz). Je Thema eine Liste; jeder Eintrag wird im Protokoll als
// eigener Knopf angezeigt (kurz = Beschriftung, text = eingefügter Text).
// Ein Klick fügt den Baustein als Punkt ins Feld ein, ein zweiter Klick
// nimmt ihn wieder heraus.
//
// Ergänzen: einfach einen weiteren { kurz: '…', text: '…' }-Eintrag
// hinzufügen. Projektspezifisches steht in [ECKIGEN KLAMMERN] und muss
// nach dem Einfügen im Feld ersetzt werden.
// Beginnt ein Text mit ☒ oder ☐, wird kein Aufzählungspunkt davorgesetzt.

export const TEXTBAUSTEINE = {
  gehoelz: [
    { kurz: 'Kronentraufe + 1,50 m geschlossen', text: 'Generell im Kronentraufbereich + 1,50 m geschlossene Bauweise (Bohrpress- und Spülverfahren) oder Einsatz eines Saugbaggers.' },
    { kurz: 'Baumschutz 2 × 2 m', text: 'Bei Arbeiten im Näherungsbereich von Bäumen muss ein Baumschutz angebracht werden, der einen Bereich von 2 m × 2 m umfasst (in beengten Bereichen darf dies auf 1 m × 1 m reduziert werden).' },
    { kurz: 'Wurzeln mit Vlies', text: 'Bei der mehrtägigen Offenlegung von Wurzeln sind die Wurzeln mit Vlies zu umwickeln und feucht zu halten.' },
    { kurz: 'Baumschutzsatzung', text: 'Vorhandene Bäume sind gemäß der Baumschutzsatzung der Gemeinde [GEMEINDE] ([FASSUNG/DATUM]) und dem Bundesnaturschutzgesetz (BNatSchG) geschützt!' },
    { kurz: 'DIN 18920 / R SBB / ZTV', text: 'Einhaltung DIN 18920 und R SBB (2023) – Schutz von Bäumen und Sträuchern im Baustellenbereich. Die „ZTV-Baumpflege“ ist ebenfalls zu berücksichtigen. Abweichung nur in Absprache mit der ÖBB.' },
    { kurz: 'Bohrlängen optimieren', text: 'Die Bohrlängen sind bestmöglich zu optimieren, sodass Start- und Zielgruben außerhalb der Wurzelbereiche von Bäumen liegen.' },
    { kurz: 'HDD-Überdeckung 1,80 m', text: 'Bei der geschlossenen Querung der Gehölzstrukturen/Bäume mittels HDD-Bohrung ist eine Überdeckung von 1,80 m abzusichern.' },
    { kurz: 'Handschachtung, Wurzeln > 2 cm', text: 'Kann der o. g. Abstand zum Wurzelbereich von Bäumen beim Anlegen technisch notwendiger Baugruben und/oder Kabelgräben nachweislich nicht eingehalten werden, so ist in Handschachtung zu arbeiten. Wurzeln > 2,0 cm dürfen nicht durchtrennt werden. Entsprechende Wurzelschutzmaßnahmen sind durchzuführen.' },
    { kurz: '☒ AN über Wurzelschutz aufgeklärt', text: '☒ Der AN wurde über notwendige Wurzelschutzmaßnahmen aufgeklärt und hält entsprechende Materialien in den Autos der Bautrupps vor.' },
    { kurz: 'Mindestabstand Stamm 2,50 m', text: 'Ein Mindestabstand zum Baumstamm von 2,50 m darf nicht unterschritten werden.' },
    { kurz: 'Anfahrschutz Baumaschinen', text: 'Bäume im direkten Einflussbereich von Baumaschinen (z. B. Schwenkbereich Baggerarm) sind durch geeignete Schutzmaßnahmen vor Anfahrschäden zu schützen – eine Absprache erfolgt direkt zwischen Bauleitung und ÖBB.' },
  ],
  boden: [
    { kurz: 'Kein Lagern/Befahren im Wurzelbereich', text: 'Lagerung von Erdaushub und Baumaterial sowie das Abstellen und Befahren mit Baumaschinen im unbefestigten Wurzel- und Kronentraufbereich ist verboten.' },
    { kurz: 'Lagerung auf BE-Fläche mit LVP', text: 'Lagerung von Baumaterial und Erdaushub im Bereich der BE-Fläche „[NAME BE-FLÄCHE]“, die mit LVP (Lastverteilungsplatten) ausgelegt wird.' },
    { kurz: 'Grünflächen nur mit LVP', text: 'Befahrung von Grünflächen nur nach Auslage von LVP.' },
    { kurz: 'Rangieren auf Straßen/LVP', text: 'Baumaschinen dürfen im Bereich von Straßen, Einfahrten und ausgelegten LVP rangieren.' },
    { kurz: 'Abstellen auf versiegelten Flächen', text: 'Abstellen von Baumaschinen im Bereich versiegelter Flächen (Asphalt, Pflaster etc.).' },
    { kurz: 'DIN 18915 / 18300 / 19731', text: 'Bodenabtrag und Bodenlagerung haben nach DIN 18915 (Bodenarbeiten), DIN 18300 (Erdarbeiten) und DIN 19731 (Bodenbeschaffenheit – Verwertung von Bodenmaterial) zu erfolgen. Abzusichern sind der getrennte Aushub, die getrennte Lagerung und der getrennte Wiedereinbau von Ober- und Unterboden. Unterboden ist durch Stahlplatten oder Textilvlies vom Oberboden zu trennen.' },
    { kurz: 'Nicht nach Regenphase', text: 'Arbeiten nicht unmittelbar nach einer Regenphase durchführen.' },
    { kurz: 'Wiederherstellung, Lockerung', text: 'Nach Beendigung der Bauarbeiten sind sämtliche im Zusammenhang mit der Baumaßnahme beeinträchtigten Flächen dem ursprünglichen Zustand entsprechend wiederherzurichten. Verdichtete Flächen sind entsprechend zu lockern.' },
  ],
  arten: [
    { kurz: 'Ausstiegshilfen offene Gräben', text: 'Bei länger offenbleibenden Gräben/Gruben ist mindestens eine der folgenden Artenschutzstrategien umzusetzen:\n   – Anstellen von Brettern als Ausstiegshilfe\n   – einseitige Abschrägung (ca. 45°) am Graben-/Grubenrand\n   – Aufstellen eines geeigneten Schutzzauns' },
    { kurz: 'Gräben vor Verfüllen prüfen', text: 'Vor dem Verfüllen der Gräben und Gruben sind diese auf das Vorhandensein von wildlebenden Arten zu prüfen.' },
    { kurz: 'Brutvogel-Kontrolle 01.03.–30.09.', text: 'Im Zeitraum vom 01.03. bis 30.09. eines Jahres ist in Bereichen mit offener Bauweise (Baugruben, Kabelgräben) das gesamte Baufeld sowie angrenzende Gehölze abseits von besiedelten/bebauten Bereichen und vorhandenen Straßen und Wegen vor Beginn der Baumaßnahme auf das Vorhandensein von Brut- und Niststätten von Vögeln zu untersuchen. Die Frist zwischen Besatzkontrolle und Baubeginn darf 10 Tage nicht überschreiten. Die Kontrolle ist durch eine fachkundige Person durchzuführen. Mit den Bauarbeiten ist erst nach Freigabe durch diese zu beginnen.' },
  ],
  wasser: [],
  sonstiges: [],
};
