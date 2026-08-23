// Service Worker for UAE MESS SYSTEM PWA & Web Push Notifications
const CACHE_NAME = 'uae-mess-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/uae_mess_logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore individual asset fetch failures during install
      });
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

// Network-first cache fallback strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Bypass API and external requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.hostname.includes('firestore') || url.hostname.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event listener (fires when app is in background or closed!)
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'UAE MESS SYSTEM - New Message',
    body: 'You have a new message in your room group.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/?tab=chat'
    }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      notificationData = {
        ...notificationData,
        ...parsed,
        data: {
          ...notificationData.data,
          ...(parsed.data || {})
        }
      };
    } catch (e) {
      try {
        const text = event.data.text();
        if (text) {
          notificationData.body = text;
        }
      } catch (err) {}
    }
  }

  const title = notificationData.title || 'New Group Message';
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/icon-192.png',
    image: notificationData.image || undefined,
    vibrate: [250, 100, 250, 100, 250],
    tag: notificationData.tag || 'group-chat-msg',
    renotify: true,
    requireInteraction: true,
    data: notificationData.data || { url: '/?tab=chat' },
    actions: [
      { action: 'open_chat', title: '💬 Open Group Chat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event handler (opens or focuses app when user taps notification)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate to chat
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle custom messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'UAE MESS SYSTEM', options || {});
  }
});
