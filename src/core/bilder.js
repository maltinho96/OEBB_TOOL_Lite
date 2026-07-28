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
