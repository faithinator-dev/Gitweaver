const CACHE_NAME = 'gitweaver-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/favicon.svg'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching core assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests (like GitHub API) to avoid opaque cache issues
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Fallback handled by returning cachedResponse if it exists
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
