// Morales Platform Service Worker — Offline Safety Layer
const CACHE_NAME = 'morales-offline-v3';
const OFFLINE_FALLBACK = '/offline';

// Critical routes that must work offline — cached on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/offline-guide',
  '/emergency',
  '/emergency-access',
  '/emergency-manifest',
  '/index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API / backend function calls — network only, no cache interference
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      // For navigation requests (HTML pages): network-first, fall back to cache, then offline page
      if (request.mode === 'navigate') {
        return fetch(request)
          .then(response => {
            // Cache fresh navigation responses
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => cached || caches.match(OFFLINE_FALLBACK));
      }

      // For static assets (JS/CSS/fonts): cache-first, then network
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
