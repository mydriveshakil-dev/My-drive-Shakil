const CACHE_NAME = 'uae-mess-cache-v2';

// যেসব ফাইল ক্যাশ করতে হবে
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event: নতুন ক্যাশ সেভ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: পুরানো ক্যাশ মুছে ফেলা
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

// Fetch Event: নেটওয়ার্ক থেকে নতুন ডাটা আনা, না পেলে ক্যাশ থেকে দেখানো
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
