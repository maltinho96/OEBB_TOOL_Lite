// Haengt jeden Protokolltyp aus der schema-Registry als eigenen
// <section class="tab"> in den Mount-Punkt (#app) ein. Ersetzt damit die
// im Original fest in die HTML geschriebenen Protokoll-Reiter.

export function formularInit(mount, registry) {
  registry.forEach((protokoll) => {
    const section = document.createElement('section');
    section.className = 'tab';
    section.id = protokoll.id;
    section.innerHTML = protokoll.html();
    mount.appendChild(section);
  });
}