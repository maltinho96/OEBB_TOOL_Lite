// "📝 Mustertext einfügen" in den Themenblöcken des Belehrungsprotokolls
// "Karel": kopiert den hinterlegten Standardtext (<template class="kb-muster">
// im selben Block) in das Auflagen-Feld. Vorhandener Text wird nur nach
// Rückfrage ersetzt. Danach anpassen – z. B. die [GEMEINDE] eintragen.

function hoeheAnpassen(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function mustertextInit(root) {
  (root || document).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aktion="mustertext"]');
    if (!btn) return;
    const block = btn.closest('.kb-thema');
    const feld = block && block.querySelector('.kb-auflagen');
    const vorlage = block && block.querySelector('template.kb-muster');
    if (!feld || !vorlage) return;
    if (feld.value.trim() && !confirm('Der vorhandene Text wird durch den Mustertext ersetzt. Fortfahren?')) return;
    feld.value = vorlage.content.textContent.trim();
    hoeheAnpassen(feld);
    feld.focus();
  });
}
