const CACHE_NAME = 'caridata-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './js/db.js',
  './js/parser.js',
  './js/searchEngine.js',
  './js/app.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Safe cache add to prevent SW install crash if 1 file fails
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Failed to pre-cache asset:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch Event Handler
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navigation Requests (HTML Page loading e.g. / or /index.html)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return networkResponse;
          }
          // Network responded with non-200, try cache
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
        .catch(() => {
          // Network failed (Offline / Cloudflare cold start), serve cached index.html
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Images, Manifest)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache, update in background if online
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('Network fetch error for asset:', event.request.url, err);
        // Fallback for images if needed or simple empty response to avoid ERR_FAILED
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
