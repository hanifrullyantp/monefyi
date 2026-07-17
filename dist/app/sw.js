// Offline-capable service worker — native PWA v5 (fresh index + smart asset caching).
const CACHE_VERSION = 'v5-native-pwa-1';
const STATIC_CACHE = `monefyi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `monefyi-runtime-${CACHE_VERSION}`;
const IMAGES_CACHE = `monefyi-images-${CACHE_VERSION}`;
const INDEX_URL = new URL('./index.html', self.location).href;
const OFFLINE_URL = new URL('./offline.html', self.location).href;

const HASHED_ASSET = /-[a-zA-Z0-9]{8,}\.(js|css|woff2?)$/;

const shellUrls = [
  OFFLINE_URL,
  new URL('./manifest.webmanifest', self.location).href,
  new URL('./css/app.css', self.location).href,
  new URL('./css/home-page.css', self.location).href,
  new URL('./css/native-pwa.css', self.location).href,
  new URL('./css/receipt-scanner.css', self.location).href,
  new URL('./css/preview-card.css', self.location).href,
  new URL('./css/quick-preview.css', self.location).href,
  new URL('./js/app.js', self.location).href,
  new URL('./js/config.js', self.location).href,
  new URL('./js/monefyi-ui.js', self.location).href,
  new URL('./js/i18n.js', self.location).href,
  new URL('./js/utils/module-loader.js', self.location).href,
  new URL('./js/vendor/dexie.mjs', self.location).href,
  new URL('./js/services/offline-db.js', self.location).href,
  new URL('./js/services/sync-engine.js', self.location).href,
  new URL('./js/services/data-store.js', self.location).href,
  new URL('./js/services/pending-queue.js', self.location).href,
  new URL('./js/services/parser-orchestrator.js', self.location).href,
  new URL('./js/services/install-prompt.js', self.location).href,
  new URL('./js/components/sync-indicator.js', self.location).href,
  new URL('./js/components/offline-indicator.js', self.location).href,
  new URL('./js/components/pending-indicator.js', self.location).href,
  new URL('./icons/icon-192.svg', self.location).href,
  new URL('./icons/icon-512.svg', self.location).href,
  new URL('./icons/monefyi-logo.png', self.location).href,
  new URL('./icons/monefyi-mark.svg', self.location).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(shellUrls.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((k) => k.startsWith('monefyi-') && !k.includes(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await Promise.all(
        keys
          .filter((k) => k.startsWith('monefyi-'))
          .map(async (k) => {
            const cache = await caches.open(k);
            await cache.delete(INDEX_URL);
          })
      );
      await self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;

  const isNavigation =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (HASHED_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request, IMAGES_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
});

/**
 * Navigation: always fetch fresh index.html (hashed assets change each deploy).
 * @param {Request} request
 */
async function handleNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) return response;
  } catch {
    /* offline fallback below */
  }

  try {
    const response = await fetch(INDEX_URL, { cache: 'no-store' });
    if (response.ok) return response;
  } catch {
    /* offline fallback below */
  }

  const offline = await caches.match(OFFLINE_URL);
  if (offline) return offline;

  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function networkFirst(request, cacheName) {
  const skipCache = request.url === INDEX_URL;

  try {
    const response = await fetch(request);
    if (response.ok && request.url.startsWith(self.location.origin) && !skipCache) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function staleWhileRevalidate(request, cacheName) {
  const skipCache = request.url === INDEX_URL;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && !skipCache) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    fetchPromise.catch(() => {});
    return cached;
  }

  const fetched = await fetchPromise;
  if (fetched) return fetched;

  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending' || event.tag === 'sync-transactions') {
    event.waitUntil(notifyClientsToSync(event.tag));
  }
});

/**
 * Ask open clients to run sync (IndexedDB lives in window context).
 * @param {string} tag
 */
async function notifyClientsToSync(tag) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'MONEYFYI_BG_SYNC', tag });
  }
}

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Monefyi', {
      body: data.body,
      icon: new URL('./icons/monefyi-logo.png', self.location).href,
      badge: new URL('./icons/icon-192.svg', self.location).href,
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || new URL('./', self.location).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
