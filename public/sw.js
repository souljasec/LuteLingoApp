// Minimal service worker: makes the app installable and shows an offline page.
// Pages are never cached (they hold personal data); only the offline page and icons are.
const CACHE = 'app-v3';
const OFFLINE = '/brand/offline.html';

// Hosts may redirect offline.html (Cloudflare serves it at /brand/offline). Browsers refuse to show a
// redirected response for a page load, so the offline page is stored as a fresh, unredirected copy.
async function precache() {
  const c = await caches.open(CACHE);
  await c.add('/brand/symbol.svg');
  const res = await fetch(OFFLINE);
  if (!res.ok) throw new Error('offline page ' + res.status);
  await c.put(OFFLINE, new Response(await res.blob(), { headers: res.headers }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
