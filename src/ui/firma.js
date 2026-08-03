// Firmenwahl (Farbthema + Logo). Originalgetreu aus firmaSetzen() portiert.

// Setzt die Firma: tauscht die firma-*-Klasse am <html> (steuert
// themes.css) und synchronisiert das Auswahlfeld.
export function firmaSetzen(id) {
  document.documentElement.classList.remove('firma-greens', 'firma-ing');
  document.documentElement.classList.add('firma-' + id);
  const select = document.getElementById('firmenSelect');
  if (select) select.value = id;
}

// Fuellt das Auswahlfeld aus FIRMEN, verdrahtet den onchange-Handler und
// setzt die Startfirma (erste in der Liste, wie im Original "greens").
export function firmaInit(select, firmen) {
  select.innerHTML = firmen
    .map((f) => `<option value="${f.id}">${f.name}</option>`)
    .join('');
  select.addEventListener('change', () => firmaSetzen(select.value));
  firmaSetzen(firmen[0].id);
}