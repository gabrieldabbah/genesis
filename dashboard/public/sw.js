// Minimal service worker — makes the dashboard installable (PWA) and the shell available offline.
// Live data (/api/*) is always fetched fresh; only the static shell is cached.
const CACHE = 'genesis-shell-v1';
const SHELL = ['./', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return;            // never cache live data
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
