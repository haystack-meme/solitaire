// Bump VERSION on every change so installed apps pick up the new files.
const VERSION = 'solitaire-v47';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'fonts/lilita-one.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first (so updates show up), but never hang: if the network hasn't answered within
// 4 s and a saved copy exists, use the saved copy. Saved under the URL without its ?query.
const NET_TIMEOUT = 4000;
const cacheKey = req => { const u = new URL(req.url); return u.origin + u.pathname; };
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const key = cacheKey(e.request);
  const net = fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  });
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => caches.match(key).then(finish), NET_TIMEOUT);
    net.then(r => { clearTimeout(timer); finish(r); })
       .catch(() => { clearTimeout(timer); caches.match(key).then(r => r ? finish(r) : finish(Response.error())); });
    // if the timeout found nothing cached, the network response (whenever it comes) still wins
  }));
});
