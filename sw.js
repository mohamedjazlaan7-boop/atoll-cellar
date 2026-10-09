/* Atoll Cellar — offline support. Always loads the newest app when online, and the saved copy when offline. */
const CACHE = 'atoll-cellar-v3';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/cloud.js', 'js/engine.js', 'js/views.js', 'js/admin.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // never cache the database or sign-in
  if (/supabase\.(co|in)$/.test(url.hostname) || url.pathname.includes('/auth/v1/') || url.pathname.includes('/rest/v1/')) return;
  const same = url.origin === location.origin;
  const cdn = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname);
  if (!same && !cdn) return;
  if (same) {
    // the app itself: network first, so an update shows straight away; the saved copy when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
    return;
  }
  // fonts and libraries never change: saved copy first
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res;
  }));
});
