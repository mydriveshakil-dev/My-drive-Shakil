const CACHE_NAME = 'uae-mess-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=2',
  '/icon-192.png?v=2',
  '/icon-512.png?v=2',
  '/apple-touch-icon.png?v=2',
  '/favicon-32x32.png?v=2',
  '/favicon-16x16.png?v=2'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event (Delete old caches)
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
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
