const CACHE_NAME      = 'morales-vault-v3';
const TILE_CACHE_NAME = 'morales-map-tiles-v2';
// Esri World Imagery + labels overlay (primary) + OSM fallback
const TILE_RE = /^https:\/\/(server\.arcgisonline\.com|[abc]\.tile\.openstreetmap\.org)\//;

// 1×1 transparent PNG — returned when a tile can't load offline
const BLANK_TILE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

const APP_SHELL = [
  '/',
  '/offline',
  '/offline-guide',
  '/emergency-manifest',
  '/emergency-access',
  '/demo',
  '/offline-vault-guide',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== TILE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Map tiles: cache-first (tiles are immutable — same z/x/y never changes)
  // Covers Esri World Imagery satellite tiles + OSM fallback
  if (TILE_RE.test(request.url)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (_) {
          // Offline and tile not cached — return blank tile so polyline still renders
          const body = Uint8Array.from(atob(BLANK_TILE_B64), c => c.charCodeAt(0));
          return new Response(body, { headers: { 'Content-Type': 'image/png' } });
        }
      })
    );
    return;
  }

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/') || url.pathname.includes('base44')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ── Vibration patterns — Apple HIG-inspired ──────────────────────────────────
// Each pattern is [buzz_ms, pause_ms, buzz_ms, ...]. Maps to notification type.
const VIBRATE = {
  safe:      [80,  60,  80],                        // Light double tap — "we see you, you're safe"
  success:   [100, 50, 100,  50, 280],              // Triple with finale — milestone reached
  golden_m:  [120, 60, 120,  60, 120, 80, 550],     // Full celebration — journey complete
  payment:   [160, 80, 160],                         // Confident double — money confirmed
  companion: [80,  50,  80,  50,  80],              // Gentle triple — someone is coming
  booking:   [100, 70, 220],                         // Short-long rise — journey starting
  alert:     [350, 100, 350, 100, 350],             // Three strong — admin urgent
  default:   [160, 100, 160],
};

// ── Push notification handler ─────────────────────────────────────────────────
// Shows the OS-level notification popup even when the app is closed.
self.addEventListener('push', (event) => {
  let data = { title: 'Morales', body: 'You have a new update.', url: '/dashboard', type: 'default' };
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) };
  } catch (_) {}

  const vibrate = VIBRATE[data.type] || VIBRATE.default;

  const options = {
    body:    data.body,
    icon:    '/morales-m-mark.png',
    badge:   '/morales-m-mark.png',
    tag:     data.tag || 'morales-alert',
    data:    { url: data.url || '/dashboard' },
    vibrate,
    silent:  false,
    requireInteraction: data.urgent === true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click handler ────────────────────────────────────────────────
// Tapping the notification opens the correct page and focuses the tab if already open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a window is already open on this origin, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // No window open — open a new one
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
