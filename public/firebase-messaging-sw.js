// Firebase Messaging Service Worker for UAE MESS SYSTEM
// Handles background push notifications when app is closed or screen is locked

// 1. Load Firebase Compat SDKs
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyCH129y4KdjopaOK2KO4WZh7hw5nCrSGNA",
    projectId: "gen-lang-client-0739502996",
    messagingSenderId: "173049739239",
    appId: "1:173049739239:web:c890ddf3bc6dfaf0b6af42"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM-SW] Received background message:', payload);
    const title = payload.notification?.title || payload.data?.title || 'UAE MESS SYSTEM';
    const body = payload.notification?.body || payload.data?.body || 'You have a new message in your room group.';
    const icon = payload.notification?.icon || payload.data?.icon || '/icon-192.png';
    const badge = payload.notification?.badge || '/icon-192.png';
    const image = payload.notification?.image || payload.data?.image || undefined;
    const tag = payload.data?.tag || ('group-msg-' + Date.now());

    const options = {
      body,
      icon,
      badge,
      image,
      tag,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [300, 100, 300, 100, 300],
      timestamp: Date.now(),
      data: payload.data || { url: '/?tab=chat' },
      actions: [
        { action: 'open_chat', title: '💬 Open Group Chat' }
      ]
    };

    return self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn('[FCM-SW] Firebase compat script load error, falling back to native push handler:', e);
}

// 2. Native Web Push Event Handler (Direct VAPID WebPush Support)
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'UAE MESS SYSTEM',
    body: 'You have a new message in your room group.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/?tab=chat',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      notificationData = Object.assign({}, notificationData, parsed, {
        data: Object.assign({}, notificationData.data, parsed.data || {})
      });
    } catch (e) {
      try {
        const text = event.data.text();
        if (text) {
          notificationData.body = text;
        }
      } catch (err) {}
    }
  }

  const title = notificationData.title || 'UAE MESS SYSTEM';
  const tagId = notificationData.tag || ('group-msg-' + (notificationData.data?.timestamp || Date.now()));

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/icon-192.png',
    image: notificationData.image || undefined,
    vibrate: [300, 100, 300, 100, 300],
    tag: tagId,
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: notificationData.data?.timestamp || Date.now(),
    data: notificationData.data || { url: '/?tab=chat' },
    actions: [
      { action: 'open_chat', title: '💬 Open Group Chat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[Service Worker] showNotification error:', err);
    })
  );
});

// 3. Notification Click Action Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/?tab=chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
