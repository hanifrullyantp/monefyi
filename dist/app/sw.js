// Offline-capable service worker — v7 budget killer feature.
const CACHE_VERSION = 'v38-logo-nobg';
const STATIC_CACHE = `monefyi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `monefyi-runtime-${CACHE_VERSION}`;
const IMAGES_CACHE = `monefyi-images-${CACHE_VERSION}`;
const INDEX_URL = new URL('./index.html', self.location).href;
const OFFLINE_URL = new URL('./offline.html', self.location).href;

const HASHED_ASSET = /-[a-zA-Z0-9]{8,}\.(js|css|woff2?)$/;

const shellPaths = [
  './manifest.webmanifest',
  './css/app.css',
  './css/home-page.css',
  './css/native-pwa.css',
  './css/receipt-scanner.css',
  './css/preview-card.css',
  './css/quick-preview.css',
  './css/budget-enhanced.css',
  './css/budget-final-refinements.css',
  './css/monevisor-panel.css',
  './css/monevisor-page.css',
  './css/desktop-layout.css',
  './css/transaction-detail.css',
  './css/notification-settings.css',
  './css/email-import.css',
  './css/onboarding.css',
  './js/app.js',
  './js/config.js',
  './js/monefyi-ui.js',
  './js/i18n.js',
  './js/utils/module-loader.js',
  './js/vendor/dexie.mjs',
  './js/parsers/normalize.js',
  './js/parsers/rules.js',
  './js/parsers/receipt-pipeline.js',
  './js/services/offline-db.js',
  './js/services/sync-engine.js',
  './js/services/data-store.js',
  './js/services/pending-queue.js',
  './js/services/parser-orchestrator.js',
  './js/services/memory.js',
  './js/services/correction-learner.js',
  './js/services/metrics.js',
  './js/services/feature-flags.js',
  './js/services/home-data.js',
  './js/services/undo-redo.js',
  './js/services/activity-log.js',
  './js/services/budget-model.js',
  './js/services/budget-linker.js',
  './js/services/budget-recommender.js',
  './js/services/notification-center.js',
  './js/services/push-notification.js',
  './js/services/notification-scheduler.js',
  './js/services/email-import-client.js',
  './js/services/income-source.js',
  './js/services/global-filter.js',
  './js/services/budget-generator.js',
  './js/services/entitlements.js',
  './js/services/acquisition.js',
  './js/services/budget-template.js',
  './js/services/budget-changes-tracker.js',
  './js/services/monevisor-client.js',
  './js/services/monevisor-heuristic.js',
  './js/services/financial-report.js',
  './js/services/financial-diagnosis.js',
  './js/services/transaction-insight.js',
  './js/components/transaction-detail-modal.js',
  './js/components/monevisor-panel.js',
  './js/pages/monevisor-page.js',
  './js/components/global-filter-popup.js',
  './js/components/tx-page-widgets.js',
  './js/components/budget-generator-modal.js',
  './js/components/upgrade-sheet.js',
  './js/components/onboarding-wizard.js',
  './js/components/floating-save-bar.js',
  './js/components/notification-bell.js',
  './js/components/notification-settings.js',
  './js/components/email-import-setup.js',
  './js/components/budget-summary-hero.js',
  './js/components/income-manager.js',
  './js/services/install-prompt.js',
  './js/components/quick-preview.js',
  './js/components/pending-badge.js',
  './js/components/pending-indicator.js',
  './js/components/undo-toast.js',
  './js/components/activity-history.js',
  './js/components/icons.js',
  './js/components/receipt-scanner.js',
  './js/components/preview-card.js',
  './js/components/sync-indicator.js',
  './js/components/offline-indicator.js',
  './js/components/home-balance-stats.js',
  './js/components/account-cards.js',
  './js/components/quick-access.js',
  './js/components/budget-summary-card.js',
  './js/components/budget-page.js',
  './js/components/budget-form-modal.js',
  './js/components/budget-detail-modal.js',
  './js/components/budget-evaluation.js',
  './js/components/daily-tip-card.js',
  './js/components/mini-chart-7day.js',
  './js/components/recent-transactions-list.js',
  './js/pages/home-page.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/monefyi-logo.png',
  './icons/monefyi-logo-legacy.png',
  './icons/monefyi-mark.svg',
];

const shellUrls = [INDEX_URL, OFFLINE_URL, ...shellPaths.map((p) => new URL(p, self.location).href)];

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
 * Navigation: stale-while-revalidate so splash HTML paints instantly from cache,
 * then refresh index in the background after deploy.
 * @param {Request} request
 */
async function handleNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached =
    (await cache.match(request)) ||
    (await cache.match(INDEX_URL)) ||
    (await caches.match(INDEX_URL));

  const fetchPromise = fetch(request, { cache: 'no-store' })
    .then(async (response) => {
      if (response.ok) {
        await cache.put(INDEX_URL, response.clone());
        try {
          await cache.put(request, response.clone());
        } catch {
          /* ignore put failures for opaque/navigate variants */
        }
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    fetchPromise.catch(() => {});
    return cached;
  }

  const fetched = await fetchPromise;
  if (fetched) return fetched;

  try {
    const indexFresh = await fetch(INDEX_URL, { cache: 'no-store' });
    if (indexFresh.ok) {
      await cache.put(INDEX_URL, indexFresh.clone());
      return indexFresh;
    }
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
  const data = event.notification.data || {};
  const url = data.url || new URL('./', self.location).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        try {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data });
        } catch { /* ignore */ }
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
