const CACHE_NAME = 'ecotuc-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Evitar interceptar llamadas a la API o recursos de mapas y fotos externos
  if (
    event.request.url.includes('/api') || 
    event.request.url.includes('openstreetmap.org') || 
    event.request.url.includes('unsplash.com') ||
    event.request.url.includes('tile.openstreetmap.org')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (
          event.request.method === 'GET' && 
          response.status === 200 && 
          response.type === 'basic'
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match('/');
      });
    })
  );
});
