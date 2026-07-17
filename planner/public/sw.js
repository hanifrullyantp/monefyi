const CACHE_NAME = 'monefyi-planner-v2-network-first';

const SHELL_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/app.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith(networkFirst(e.request, url.pathname.endsWith('.html') || e.request.mode === 'navigate'));
});

/**
 * @param {Request} request
 * @param {boolean} [fallbackToIndex]
 */
async function networkFirst(request, fallbackToIndex = false) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, clone));
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToIndex) {
      const index = await caches.match('./index.html');
      if (index) return index;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
