const CACHE_NAME      = 'morales-vault-v5'; // v5: fetch handler now bypasses Vite dev-server module requests (see below) — bumped so a device with a stale v4 worker picks up the fix
const TILE_CACHE_NAME = 'morales-map-tiles-v2';
// Esri World Imagery + labels overlay (primary) + OSM fallback
const TILE_RE = /^https:\/\/(server\.arcgisonline\.com|[abc]\.tile\.openstreetmap\.org)\//;

// 1×1 transparent PNG — returned when a tile can't load offline
const BLANK_TILE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

// The Cache API rejects any attempt to store a 206 Partial Content response
// (thrown synchronously as "Failed to execute 'put' on 'Cache': Partial
// response (status code 206) is unsupported") — response.ok is true for 206,
// so every cache.put() call site needs this guard. Range requests can hit even
// plain page navigations (browser prefetch, some preview-iframe hosts), so this
// isn't tile/asset-specific. .catch() below is a safety net for any other
// unexpected put failure (e.g. quota) — a caching failure must never surface as
// an unhandled rejection.
function safeCachePut(cache, request, response) {
  if (response.status === 206) return;
  cache.put(request, response).catch((err) => console.warn('[sw] cache.put failed:', err));
}

const APP_SHELL = [
  '/',
  '/offline',
  '/offline-guide',
  '/emergency-manifest',
  '/emergency-access',
  '/demo',
  '/offline-vault-guide',
];

// Install: cache app shell. cache.addAll() is atomic — if ANY one URL fails
// to fetch, the whole call rejects and NOTHING gets cached, including
// '/offline', which the fetch handler below depends on as its last resort.
// Per-URL cache.add() through allSettled means one flaky/missing shell URL
// can never blank out caching for every other URL in the list.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`[sw] failed to precache ${APP_SHELL[i]}:`, r.reason);
        }
      });
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

  // Never intercept Vite dev-server requests (raw unbundled source modules,
  // HMR client, React refresh runtime). This SW is only ever registered in a
  // PROD build (main.jsx / usePushNotifications.js both gate registration on
  // import.meta.env.PROD), but a preview/sandbox host can reuse the same
  // origin+scope across an earlier PROD session and a later DEV live-edit
  // session — the leftover SW from the former then controls the latter's
  // page. Raw source paths like /src/pages/Home.jsx don't match any
  // extension in the static-asset branch below (.jsx isn't in that list), so
  // they fell through to the HTML branch, which can serve back cached or
  // offline HTML in place of the expected JS module — the browser then
  // throws "Failed to fetch dynamically imported module". Bypassing here
  // lets the request hit the network exactly like an uncontrolled page.
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/.vite/')
  ) {
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
          if (response.ok) safeCachePut(cache, request, response.clone());
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
              safeCachePut(cache, request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try cache — if nothing cached, return a real
          // Response (returning undefined here throws "Failed to convert
          // value to 'Response'" and breaks the fetch entirely).
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
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
              safeCachePut(cache, request, responseClone);
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
            safeCachePut(cache, request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Same fix as the API branch: fall back further to the cached
        // offline shell so navigation never resolves with `undefined`.
        const cached = await caches.match(request);
        if (cached) return cached;
        const offlineShell = await caches.match('/offline');
        if (offlineShell) return offlineShell;
        // '/offline' itself may never have been cached (e.g. install()
        // partially failed before the allSettled fix above shipped, or this
        // is the very first install and it's still in flight). Returning
        // undefined here is exactly what throws "Failed to convert value to
        // 'Response'" and hard-fails the navigation — so always fall back to
        // a real, inline Response as the absolute last resort.
        return new Response(
          '<!doctype html><html><body style="margin:0;background:#060B16;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;">' +
          '<div><p style="font-size:18px;font-weight:700;margin:0 0 8px;">You appear to be offline.</p>' +
          '<p style="font-size:14px;opacity:0.7;margin:0;">Reconnect and refresh to continue.</p></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html' } },
        );
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
    // icon (M-Care super-agent Phase 4C): a sender can pass its own icon
    // (e.g. '/mcare-logo.png' for a real M-Care moment) — falls back to the
    // site mark for every notification that doesn't specify one, unchanged.
    icon:    data.icon || '/morales-m-mark.png',
    badge:   data.icon || '/morales-m-mark.png',
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
