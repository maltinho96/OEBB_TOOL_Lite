// <textarea> lässt sich beim Drucken nicht zuverlässig auf Inhaltshöhe
// bringen – Chrome setzt sie auf ihre feste rows-Höhe zurück und schneidet
// längeren Text ab. Zuverlässige Lösung: vor dem Drucken je textarea ein
// <div> mit demselben Text daneben einblenden (wächst von Natur aus mit dem
// Inhalt) und die textarea selbst ausblenden. Nach dem Drucken alles zurück.
//
// Das Ersatz-<div> bekommt die Klasse .druck-ersatz; per CSS ist es am
// Bildschirm unsichtbar und nur im Druck sichtbar (siehe druck.css), die
// textarea umgekehrt.

function ersatzAufbauen() {
  document.querySelectorAll('textarea').forEach((ta) => {
    // Schon ein Ersatz vorhanden? Überspringen.
    if (ta.nextElementSibling && ta.nextElementSibling.classList.contains('druck-ersatz')) return;
    const div = document.createElement('div');
    div.className = 'druck-ersatz';
    div.textContent = ta.value;
    // Direkt hinter die textarea setzen.
    ta.parentNode.insertBefore(div, ta.nextSibling);
    ta.classList.add('druck-verbergen');
  });
}

function ersatzAbbauen() {
  document.querySelectorAll('.druck-ersatz').forEach((div) => div.remove());
  document.querySelectorAll('textarea.druck-verbergen').forEach((ta) => {
    ta.classList.remove('druck-verbergen');
  });
}

export function druckhoeheInit() {
  window.addEventListener('beforeprint', ersatzAufbauen);
  window.addEventListener('afterprint', ersatzAbbauen);
}