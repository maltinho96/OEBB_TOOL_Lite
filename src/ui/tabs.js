// Reiter-Umschaltung. Originalgetreu aus tabZeigen()/protokolleZeigen()
// portiert – hier die einzige Stelle, die direkt auf .tab/.tab-knopf/
// .sub-knopf/#unterleiste zugreift.

const PROTOKOLL_TABS = ['tab-protokoll', 'tab-vorbegehung', 'tab-belehrung'];

// Merkt sich den zuletzt gezeigten Protokoll-Reiter, damit der
// "📄 Protokolle"-Knopf dorthin zurueckspringt.
let letzterProtokollTab = 'tab-protokoll';

export function tabZeigen(id) {
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('aktiv', t.id === id);
  });
  document.querySelectorAll('.tab-knopf').forEach((b) => {
    b.classList.toggle('aktiv', b.dataset.tab === id);
  });

  const istProt = PROTOKOLL_TABS.includes(id);
  const ul = document.getElementById('unterleiste');
  if (ul) ul.style.display = istProt ? 'flex' : 'none';

  const kp = document.getElementById('knopfProtokolle');
  if (kp) kp.classList.toggle('aktiv', istProt);

  if (istProt) letzterProtokollTab = id;

  document.querySelectorAll('.sub-knopf').forEach((b) => {
    b.classList.toggle('aktiv', b.dataset.tab === id);
  });

  window.scrollTo(0, 0);
}

// Springt zum zuletzt aktiven Protokoll-Reiter (Knopf "📄 Protokolle").
export function protokolleZeigen() {
  tabZeigen(letzterProtokollTab);
}

// Verdrahtet alle [data-tab]-Knoepfe (Haupt- und Unterleiste) sowie den
// "📄 Protokolle"-Knopf per Klassenselektor auf tabZeigen/protokolleZeigen.
export function tabsInit() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => tabZeigen(btn.dataset.tab));
  });
  const kp = document.getElementById('knopfProtokolle');
  if (kp) kp.addEventListener('click', protokolleZeigen);
}