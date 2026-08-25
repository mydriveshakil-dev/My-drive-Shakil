// Firebase Messaging Service Worker for UAE MESS SYSTEM
// Handles background push notifications when app is closed or screen is locked

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

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Universal Push Event Listener for both FCM & WebPush
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
        const extractedTitle =
          parsed.title ||
          parsed.notification?.title ||
          parsed.data?.title ||
          parsed.heading ||
          payload.title;

        const extractedBody =
          parsed.body ||
          parsed.notification?.body ||
          parsed.data?.body ||
          parsed.data?.message ||
          parsed.text ||
          payload.body;

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
      try {
        const textData = event.data.text();
        if (textData) {
          payload.body = textData;
        }
      } catch (err) {}
    }
  }

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
      .catch((err) => {
        console.error('[FCM-SW] showNotification error:', err);
      })
  );
});

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
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

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
        console.warn('[FCM-SW] pushsubscriptionchange renewal error:', err);
      })
  );
});
