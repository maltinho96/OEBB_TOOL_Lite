// Service Worker: macht das ÖBB-Tool als App installierbar und offline
// nutzbar (Baustelle ohne Netz). Strategie:
//  - Seite (Navigation): erst Netz, sonst die zuletzt gespeicherte Version
//  - Dateien der App (JS/CSS/Bilder dieser Seite): aus dem Speicher, im
//    Hintergrund aktualisiert
//  - Fremde Adressen (Kartenkacheln, Geodienste): nicht angefasst
const SPEICHER = 'oebb-tool-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SPEICHER).then((c) => c.addAll(['./', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((n) => n !== SPEICHER).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const kopie = r.clone(); caches.open(SPEICHER).then((c) => c.put('./', kopie)); return r; })
        .catch(() => caches.match('./')),
    );
    return;
  }
  e.respondWith(
    caches.open(SPEICHER).then(async (c) => {
      const gespeichert = await c.match(req);
      const netz = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => gespeichert);
      return gespeichert || netz;
    }),
  );
});
