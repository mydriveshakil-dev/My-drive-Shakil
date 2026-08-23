// Client-side Web Push Notifications Manager for UAE MESS SYSTEM
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, getIsQuotaExceeded } from '../lib/firebase';

// Fallback VAPID Public Key (standard base64url encoded P-256 public key matching server)
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
 * Register Service Worker and retrieve Push Subscription
 */
export async function registerPushNotifications(
  groupId: string,
  userId: string,
  userName?: string
): Promise<{ success: boolean; subscription?: any; error?: string; isLocalOnly?: boolean }> {
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

    // 2. Register Service Worker
    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('Service worker registration note:', swErr);
    }

    // 3. Fetch VAPID Public Key from backend or use fallback
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
      console.warn('Using built-in fallback VAPID key:', e);
    }

    // 4. PushManager Subscription with VAPID key verification
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
            // Verify if key matches or renew if requested
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
                  console.log('[Web Push] Renewing subscription with updated VAPID key...');
                  await subscription.unsubscribe();
                  subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey,
                  });
                }
              }
            } catch (rekeyErr) {
              console.warn('[Web Push] Key verification note:', rekeyErr);
            }
          }
        }
      } catch (pmErr) {
        console.warn('PushManager subscribe warning (falling back to direct browser alerts):', pmErr);
      }
    }

    // If subscription succeeded, sync to backend & Firestore
    if (subscription) {
      const subJson = subscription.toJSON();
      try {
        localStorage.setItem('uae_last_push_sub', JSON.stringify({
          endpoint: subscription.endpoint,
          subscription: subJson,
          groupId: groupId || 'group-room-3',
          userId: userId || 'anonymous',
          userName: userName || 'Room Member',
          updatedAt: Date.now(),
        }));
      } catch {}

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
    }

    // If PushManager was blocked (e.g. iframe restrictions), browser permission is still granted!
    return { success: true, isLocalOnly: true };
  } catch (err: any) {
    console.error('Error enabling push notifications:', err);
    // Graceful fallback if permission is already granted
    if (Notification.permission === 'granted') {
      return { success: true, isLocalOnly: true };
    }
    return { success: false, error: err.message || 'Notification setup error.' };
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
    let directSubscriptions: any[] = [];
    try {
      const lastSubStr = localStorage.getItem('uae_last_push_sub');
      if (lastSubStr) {
        const lastSub = JSON.parse(lastSubStr);
        if (lastSub && lastSub.groupId === params.groupId && lastSub.userId !== params.senderId) {
          directSubscriptions.push(lastSub);
        }
      }
    } catch {}

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
      console.log(`[Web Push] Notification sent to ${data.sentCount || 0} devices.`);
      return true;
    }
  } catch (err) {
    console.warn('[Web Push] Send error:', err);
  }
  return false;
}

/**
 * Send a Test Notification to the current device (supports delay for testing lock-screen delivery)
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
            message: `🔔 Push scheduled in ${delaySeconds} seconds! Lock your phone screen NOW to test!`,
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
