// ── Offline caching ───────────────────────────────────────────────────────
// Pre-caches the pages that must work with zero connectivity (wilderness SOS,
// emergency manifest) so they load from cache when there's no signal.

const CACHE_NAME = 'morales-offline-v1';
const PRECACHE_URLS = [
  '/offline',
  '/emergency-manifest',
  '/manifest.json',
  '/icon-192.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to precache', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for precached routes, network-first (with cache fallback) for everything else.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept third-party requests

  const isPrecached = PRECACHE_URLS.some(p => url.pathname === p);

  if (isPrecached) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for navigations, falling back to the offline page if nothing else is cached.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('/offline'))
      )
    );
  }
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || 'Morales Care Update', {
    body: data.body || 'You have a new update.',
    icon: '/logo192.png',
    badge: '/badge.png',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
