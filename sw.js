/* Atoll Cellar — offline support. Serves the app from the device and refreshes it in the background. */
const CACHE = 'atoll-cellar-v1';
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
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: same });
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
