// Client-side Web Push & Firebase Cloud Messaging (FCM) Manager for UAE MESS SYSTEM
import { getApp } from 'firebase/app';
import {
  savePushSubscriptionToFirestore,
  fetchGroupPushSubscriptionsFromFirestore,
} from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

// Standard base64url encoded P-256 public key matching server
export const FALLBACK_VAPID_PUBLIC_KEY =
  'BI2wJb8kiVH4mG-5Na_JYxiyBYEGTFPY6VgTmJZ3ZHS3YUB2C_lYra9pDTlioDznIqIrj7T6mkQwcRKX7blV6CQ';

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
  return 'serviceWorker' in navigator && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register Service Worker and initialize Push Subscription (VAPID + FCM)
 */
export async function registerPushNotifications(
  groupId: string,
  userId: string,
  userName?: string
): Promise<{ success: boolean; subscription?: any; error?: string; isLocalOnly?: boolean; fcmToken?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    // 1. Request Notification Permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission was not granted. Please allow notifications in your browser settings.',
      };
    }

    // 2. Register / Update Service Worker with root scope
    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker ready with scope:', registration.scope);
    } catch (swErr) {
      console.warn('[Push] Service worker registration note:', swErr);
    }

    // 3. Fetch active VAPID Public Key from server
    let publicKey = FALLBACK_VAPID_PUBLIC_KEY;
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        if (keyData?.publicKey && typeof keyData.publicKey === 'string') {
          publicKey = keyData.publicKey;
        }
      }
    } catch (e) {
      console.warn('[Push] Using fallback VAPID key:', e);
    }

    // 4. Register FCM Token if Firebase Messaging is supported
    let fcmToken: string | undefined;
    try {
      const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
      if (await isSupported()) {
        const app = getApp();
        const messaging = getMessaging(app);
        fcmToken = await getToken(messaging, {
          vapidKey: publicKey,
          serviceWorkerRegistration: registration,
        });
        if (fcmToken) {
          console.log('[Push] FCM Registration Token obtained:', fcmToken.slice(0, 15) + '...');
        }
      }
    } catch (fcmErr) {
      console.warn('[Push] Firebase Messaging getToken note:', fcmErr);
    }

    // 5. PushManager Subscription with VAPID key verification
    let subscription: PushSubscription | null = null;
    if (registration && 'pushManager' in registration) {
      try {
        subscription = await registration.pushManager.getSubscription();

        if (publicKey) {
          const convertedVapidKey = urlBase64ToUint8Array(publicKey);

          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey,
            });
          } else {
            // Verify key compatibility or renew
            try {
              const currentKeyRaw = subscription.options.applicationServerKey;
              if (currentKeyRaw) {
                const currentKey = new Uint8Array(currentKeyRaw);
                let isMatch = currentKey.length === convertedVapidKey.length;
                if (isMatch) {
                  for (let i = 0; i < currentKey.length; i++) {
                    if (currentKey[i] !== convertedVapidKey[i]) {
                      isMatch = false;
                      break;
                    }
                  }
                }
                if (!isMatch) {
                  console.log('[Push] Renewing subscription with updated VAPID key...');
                  await subscription.unsubscribe();
                  subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey,
                  });
                }
              }
            } catch (rekeyErr) {
              console.warn('[Push] Key verification note:', rekeyErr);
            }
          }
        }
      } catch (pmErr) {
        console.warn('[Push] PushManager subscribe warning:', pmErr);
      }
    }

    // 6. Sync Subscription to LocalStorage, Server API, and Cloud Firestore
    if (subscription) {
      const subJson = subscription.toJSON();
      const subRecord = {
        endpoint: subscription.endpoint,
        subscription: subJson,
        groupId: groupId || 'group-room-3',
        userId: userId || 'anonymous',
        userName: userName || 'Room Member',
        fcmToken: fcmToken || null,
        updatedAt: Date.now(),
      };

      try {
        localStorage.setItem('uae_last_push_sub', JSON.stringify(subRecord));
      } catch {}

      // Sync to Express Server
      try {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subRecord),
        });
      } catch (err) {
        console.warn('[Push] Server subscription sync warning:', err);
      }

      // Sync to Cloud Firestore (guarantees cross-instance delivery)
      try {
        await savePushSubscriptionToFirestore(
          groupId || 'group-room-3',
          userId || 'anonymous',
          userName || 'Room Member',
          subJson
        );
      } catch (fsErr) {
        console.warn('[Push] Firestore subscription sync warning:', fsErr);
      }

      return { success: true, subscription, fcmToken };
    }

    // If PushManager is restricted by browser context, permission is still granted
    return { success: true, isLocalOnly: true };
  } catch (err: any) {
    console.error('[Push] Error enabling push notifications:', err);
    if (Notification.permission === 'granted') {
      return { success: true, isLocalOnly: true };
    }
    return { success: false, error: err.message || 'Notification setup error.' };
  }
}

/**
 * Dispatch Push Notification to all other members in the group
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
    const directSubscriptions: any[] = [];

    // 1. Check LocalStorage for cached active subscription
    try {
      const lastSubStr = localStorage.getItem('uae_last_push_sub');
      if (lastSubStr) {
        const lastSub = JSON.parse(lastSubStr);
        if (lastSub && lastSub.groupId === params.groupId && lastSub.userId !== params.senderId) {
          directSubscriptions.push(lastSub);
        }
      }
    } catch {}

    // 2. Fetch all registered devices from Firestore for this group
    try {
      const cloudSubs = await fetchGroupPushSubscriptionsFromFirestore(params.groupId);
      if (Array.isArray(cloudSubs)) {
        cloudSubs.forEach((cs) => {
          if (cs?.endpoint && cs?.subscription && cs.userId !== params.senderId) {
            // Avoid duplicates
            if (!directSubscriptions.some((d) => d.endpoint === cs.endpoint)) {
              directSubscriptions.push(cs);
            }
          }
        });
      }
    } catch (fsErr) {
      console.warn('[Push] Fetch group subscriptions from Firestore note:', fsErr);
    }

    // 3. Dispatch to server push gateway
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
        directSubscriptions,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Push] Push notification delivered to ${data.sentCount || 0} device(s).`);
      return true;
    }
  } catch (err) {
    console.warn('[Push] Notification dispatch error:', err);
  }
  return false;
}

/**
 * Send a Test Notification to current device (supports delay for testing lock-screen delivery)
 */
export async function sendTestPushNotification(
  userName?: string,
  delaySeconds: number = 0
): Promise<{ success: boolean; message: string; delayed?: boolean }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push notifications are not supported on this browser.' };
  }

  try {
    let registration: ServiceWorkerRegistration | undefined;
    let subscription: PushSubscription | null = null;

    try {
      registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();
    } catch (e) {}

    if (subscription) {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userName: userName || 'Room Member',
          delaySeconds: delaySeconds || 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.delayed) {
          return {
            success: true,
            delayed: true,
            message: `🔔 Lock-screen test scheduled in ${delaySeconds}s! Lock your phone screen NOW to test!`,
          };
        }
        return { success: true, message: 'Test notification sent! Check your phone notification shade.' };
      }
    }

    if (delaySeconds > 0) {
      setTimeout(() => {
        showLocalChatMessageNotification(
          'UAE MESS SYSTEM 🔔',
          `Test background notification for ${userName || 'you'}! Group chat alerts active.`
        );
      }, delaySeconds * 1000);
      return {
        success: true,
        delayed: true,
        message: `🔔 Notification will fire in ${delaySeconds}s! Lock your screen now to verify.`,
      };
    }

    // Fallback: Dispatch direct browser notification
    showLocalChatMessageNotification(
      'UAE MESS SYSTEM 🔔',
      `Test notification successful for ${userName || 'you'}! Group chat alerts are active.`
    );
    return { success: true, message: 'Test notification delivered to your device.' };
  } catch (err: any) {
    showLocalChatMessageNotification(
      'UAE MESS SYSTEM 🔔',
      `Test notification active! Group chat alerts are ready.`
    );
    return { success: true, message: 'Test notification delivered to your device.' };
  }
}

/**
 * Show local foreground/background notification if app is open
 */
export async function showLocalChatMessageNotification(
  title: string,
  body: string,
  icon = '/icon-192.png'
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon,
              badge: icon,
              vibrate: [250, 100, 250, 100, 250],
              tag: 'group-chat-local',
              renotify: true,
              requireInteraction: true,
              data: { url: '/?tab=chat' },
            } as any);
            return;
          }
        } catch (swErr) {
          console.warn('[Push] ServiceWorker notification note:', swErr);
        }
      }

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: {
            body,
            icon,
            badge: icon,
            vibrate: [250, 100, 250, 100, 250],
            tag: 'group-chat-local',
            renotify: true,
            data: { url: '/?tab=chat' },
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
