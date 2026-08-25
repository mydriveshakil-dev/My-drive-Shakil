// Enhanced Service Worker for UAE MESS SYSTEM PWA & Background / Lock-Screen Push Notifications
const CACHE_NAME = 'uae-mess-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/uae_mess_logo.jpg'
];

// Fallback VAPID Public Key for automatic re-subscription on pushsubscriptionchange
const VAPID_PUBLIC_KEY =
  'BI2wJb8kiVH4mG-5Na_JYxiyBYEGTFPY6VgTmJZ3ZHS3YUB2C_lYra9pDTlioDznIqIrj7T6mkQwcRKX7blV6CQ';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 1. Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Service Worker Activation & Immediate Client Claiming
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

// 3. Network-First Cache Strategy for App Shell & Static Assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bypass API calls, Firebase endpoints, and live real-time sync
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase')
  ) {
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

/**
 * 4. High-Reliability Push Event Listener
 * Wakes up when app is closed, in background, or screen is locked.
 * Handles diverse payload formats (JSON, FCM notification/data payloads, plain text, and sync pings).
 */
self.addEventListener('push', (event) => {
  const timestamp = Date.now();

  let payload = {
    title: 'UAE MESS SYSTEM 🔔',
    body: 'You have a new group update in your mess room.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: undefined,
    tag: 'group-msg-' + timestamp,
    data: {
      url: '/?tab=chat',
      timestamp: timestamp,
    },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        // Extract title with high precedence
        const extractedTitle =
          parsed.title ||
          parsed.notification?.title ||
          parsed.data?.title ||
          parsed.heading ||
          payload.title;

        // Extract body message
        const extractedBody =
          parsed.body ||
          parsed.notification?.body ||
          parsed.data?.body ||
          parsed.data?.message ||
          parsed.text ||
          payload.body;

        // Extract icons, badge, image
        const extractedIcon =
          parsed.icon ||
          parsed.notification?.icon ||
          parsed.data?.icon ||
          '/icon-192.png';

        const extractedBadge =
          parsed.badge ||
          parsed.notification?.badge ||
          parsed.data?.badge ||
          '/icon-192.png';

        const extractedImage =
          parsed.image ||
          parsed.notification?.image ||
          parsed.data?.image ||
          undefined;

        // Extract deep link url and metadata
        let customData = parsed.data || {};
        if (typeof customData === 'string') {
          try {
            customData = JSON.parse(customData);
          } catch (e) {}
        }

        const targetUrl =
          parsed.url ||
          parsed.notification?.click_action ||
          customData?.url ||
          (customData?.groupId ? `/?tab=chat&group=${customData.groupId}` : '/?tab=chat');

        const tagId =
          parsed.tag ||
          customData?.tag ||
          (customData?.groupId ? `group-${customData.groupId}-${timestamp}` : `group-msg-${timestamp}`);

        payload = {
          title: extractedTitle,
          body: extractedBody,
          icon: extractedIcon,
          badge: extractedBadge,
          image: extractedImage,
          tag: tagId,
          data: Object.assign({}, customData, { url: targetUrl, timestamp }),
        };
      }
    } catch (e) {
      // Fallback for plain text push
      try {
        const textData = event.data.text();
        if (textData) {
          payload.body = textData;
        }
      } catch (err) {}
    }
  }

  // Options optimized for background and lock-screen alerts
  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    image: payload.image,
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [300, 100, 300, 100, 300],
    timestamp: payload.data?.timestamp || timestamp,
    data: payload.data || { url: '/?tab=chat' },
    actions: [
      { action: 'open_chat', title: '💬 Open Group Chat' }
    ]
  };

  event.waitUntil(
    self.registration
      .showNotification(payload.title, notificationOptions)
      .then(() => {
        // Broadcast notification received to all open clients if any exist
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
          clientsList.forEach((client) => {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              payload,
            });
          });
        });
      })
      .catch((err) => {
        console.error('[SW] showNotification error:', err);
      })
  );
});

/**
 * 5. Notification Click Handler
 * Accurately focuses active window or launches app directly to chat when tapped from lock screen.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/?tab=chat';

  if (event.action === 'open_chat' && !targetUrl.includes('tab=chat')) {
    targetUrl = '/?tab=chat';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window open
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData,
            });
            return;
          }
        }
        // If no window is open (e.g. app was closed or device was locked), open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * 6. Push Subscription Change Handler
 * Handles background key expiration or renewal by browser push services.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription.toJSON(),
            groupId: 'group-room-3',
            userId: 're-subscribed-device',
            userName: 'Room Member',
            updatedAt: Date.now(),
          }),
        });
      })
      .catch((err) => {
        console.warn('[SW] pushsubscriptionchange renewal error:', err);
      })
  );
});

/**
 * 7. Message Channel from Foreground Application
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'UAE MESS SYSTEM', options || {});
  }
});
