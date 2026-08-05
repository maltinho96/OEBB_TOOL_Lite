// Bild einlesen, per Canvas auf maxKante verkleinern und als JPEG-DataURL
// zurückgeben. DOM-frei nutzbar (erzeugt Canvas/Image nur intern).

export function bildAlsDataUrl(file, maxKante, qualitaet) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const skala = Math.min(1, maxKante / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * skala);
        c.height = Math.round(img.height * skala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualitaet));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Wandelt alle per Pfad referenzierten <img>-Elemente unterhalb von root
// in eingebettete Base64-DataURLs um (mutiert die src-Attribute direkt).
// Noetig, weil manche Bilder (z. B. die Belehrungs-Standardbilder aus
// public/assets/) im laufenden Betrieb per Pfad geladen werden, eine
// exportierte HTML-Datei aber wie alle anderen Fotos eigenstaendig sein
// soll (siehe export/html-export.js) – ohne Einbettung waeren solche
// Bilder außerhalb der laufenden App kaputte Links. Bereits eingebettete
// data:-Bilder werden uebersprungen. Fehlschlaege (z. B. Bild fehlt) sind
// unkritisch: die Referenz bleibt dann einfach bestehen, kein Abbruch.
export async function bildElementeEinbetten(root) {
  const bilder = Array.from(root.querySelectorAll('img')).filter(
    (img) => img.src && !img.src.startsWith('data:')
  );
  await Promise.all(
    bilder.map(async (img) => {
      try {
        const antwort = await fetch(img.src);
        const blob = await antwort.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch (e) {
        // Bild nicht erreichbar - Referenz bleibt bestehen, kein Abbruch
        // des gesamten Exports wegen eines einzelnen fehlenden Bildes.
      }
    })
  );
}