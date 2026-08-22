// Client-side Web Push Notifications Manager for UAE MESS SYSTEM
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, getIsQuotaExceeded } from '../lib/firebase';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register Service Worker and retrieve Push Subscription
 */
export async function registerPushNotifications(
  groupId: string,
  userId: string,
  userName?: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    // 1. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission was not granted. Please enable notifications in your browser/device settings.',
      };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Fetch VAPID Public Key from backend
    let publicKey = '';
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        publicKey = keyData.publicKey;
      }
    } catch (e) {
      console.warn('Failed to fetch VAPID key from server:', e);
    }

    if (!publicKey) {
      return { success: false, error: 'Push notification server key not available.' };
    }

    // 4. Check for existing subscription or subscribe new
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    const subJson = subscription.toJSON();

    // 5. Send Subscription to backend
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJson,
          groupId: groupId || 'group-room-3',
          userId: userId || 'anonymous',
          userName: userName || 'Room Member',
        }),
      });
    } catch (err) {
      console.warn('Backend push subscription sync warning:', err);
    }

    // 6. Also sync subscription into Firestore (for persistent cross-restart tracking)
    if (!getIsQuotaExceeded() && db && subscription.endpoint) {
      try {
        const endpointHash = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
        const subDocRef = doc(db, 'pushSubscriptions', endpointHash);
        await setDoc(
          subDocRef,
          {
            subscription: subJson,
            groupId: groupId || 'group-room-3',
            userId: userId || 'anonymous',
            userName: userName || 'Room Member',
            endpoint: subscription.endpoint,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Firestore push subscription sync warning:', err);
      }
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Error enabling push notifications:', err);
    return { success: false, error: err.message || 'Failed to setup push notifications.' };
  }
}

/**
 * Dispatch Push Notification to other members in the group
 */
export async function sendGroupPushNotification(params: {
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  text: string;
  messageType?: string;
  fileName?: string;
  audioDuration?: number;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: params.groupId,
        groupName: params.groupName,
        senderId: params.senderId,
        senderName: params.senderName,
        text: params.text,
        messageType: params.messageType || 'text',
        fileName: params.fileName,
        audioDuration: params.audioDuration,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Web Push] Notification sent to ${data.sentCount || 0} devices.`);
      return true;
    }
  } catch (err) {
    console.warn('[Web Push] Send error:', err);
  }
  return false;
}

/**
 * Send a Test Notification to the current device
 */
export async function sendTestPushNotification(userName?: string): Promise<{ success: boolean; message: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push notifications are not supported on this browser.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return { success: false, message: 'Please enable notifications first.' };
    }

    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userName: userName || 'Room Member',
      }),
    });

    if (res.ok) {
      return { success: true, message: 'Test notification sent! Check your phone/device notification shade.' };
    } else {
      const errData = await res.json();
      return { success: false, message: errData.error || 'Failed to send test push notification.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Error triggering test push notification.' };
  }
}

/**
 * Show local foreground/background notification if app is open
 */
export function showLocalChatMessageNotification(title: string, body: string, icon = '/icon-192.png') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: {
            body,
            icon,
            badge: icon,
            vibrate: [200, 100, 200],
            tag: 'group-chat-local',
            renotify: true,
          },
        });
      } else {
        new Notification(title, {
          body,
          icon,
          badge: icon,
          tag: 'group-chat-local',
        });
      }
    } catch (e) {
      console.warn('Local notification error:', e);
    }
  }
}
