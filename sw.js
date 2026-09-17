// Single source of truth for the app version: index.html reads this name back out
// of Cache Storage to render .app-version. Bump it on every user-visible change.
const CACHE = 'handy-v0.21.0';
const ASSETS = ['./', './index.html', './content.json', './style.css', './manifest.json', './icon.svg', './icon-maskable.svg', './apple-touch-icon.png',
  './js/app.js', './js/settings.js', './js/i18n.js', './js/toast.js', './js/tts.js',
  './js/search.js', './js/tabs.js', './js/cards.js', './js/render.js', './js/custom.js'];

self.addEventListener('install', event => {
  // cache: 'reload' bypasses the HTTP cache, so a new version never precaches a
  // stale module next to fresh ones (mixed builds break the ES-module imports).
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return resp;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
