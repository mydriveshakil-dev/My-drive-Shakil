import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';

// Configuration for Web Push Notifications
// Stable, persistent VAPID Keys
const STABLE_VAPID_PUBLIC_KEY =
  'BI2wJb8kiVH4mG-5Na_JYxiyBYEGTFPY6VgTmJZ3ZHS3YUB2C_lYra9pDTlioDznIqIrj7T6mkQwcRKX7blV6CQ';
const STABLE_VAPID_PRIVATE_KEY =
  '57Drr642VgEJe3Sce_5_CQAHALCrmAkFKZBJaM_ZPvk';

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || STABLE_VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || STABLE_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@uaemess.com';

// Try loading from vapid-keys.json if available
try {
  const vapidFilePath = path.join(process.cwd(), 'vapid-keys.json');
  if (fs.existsSync(vapidFilePath)) {
    const raw = fs.readFileSync(vapidFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.publicKey && parsed.privateKey) {
      vapidPublicKey = parsed.publicKey;
      vapidPrivateKey = parsed.privateKey;
    }
  } else {
    fs.writeFileSync(
      vapidFilePath,
      JSON.stringify({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }, null, 2)
    );
  }
} catch (e) {
  console.warn('[Web Push] VAPID keys load note:', e);
}

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('[Web Push] VAPID details configured successfully with permanent keys.');
} catch (err) {
  console.error('[Web Push] Failed to set VAPID details:', err);
}

interface StoredPushSubscription {
  subscription: webpush.PushSubscription;
  groupId: string;
  userId: string;
  userName?: string;
  userAgent?: string;
  updatedAt: number;
}

// In-memory subscription store indexed by subscription endpoint
const pushSubscriptionsMap = new Map<string, StoredPushSubscription>();

// Persistent storage file path
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

// Load stored subscriptions from disk on server boot
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    const list: StoredPushSubscription[] = JSON.parse(data);
    if (Array.isArray(list)) {
      list.forEach((sub) => {
        if (sub?.subscription?.endpoint) {
          pushSubscriptionsMap.set(sub.subscription.endpoint, sub);
        }
      });
      console.log(`[Web Push] Loaded ${pushSubscriptionsMap.size} persisted push subscriptions from disk.`);
    }
  }
} catch (e) {
  console.warn('[Web Push] Could not load persisted subscriptions:', e);
}

// Helper to save subscriptions to disk
function saveSubscriptionsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(pushSubscriptionsMap.values());
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Web Push] Could not save subscriptions to disk:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'UAE MESS SYSTEM - Group Expense Tracker & Settlement',
      timestamp: new Date().toISOString(),
      pushSubscribersCount: pushSubscriptionsMap.size,
    });
  });

  // 1. Get VAPID Public Key for Client PushManager Subscription
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // 2. Register / Update Push Subscription for a user & group
  app.post('/api/push/subscribe', (req, res) => {
    try {
      const { subscription, groupId, userId, userName } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Invalid push subscription object provided.' });
      }

      const targetGroupId = groupId || 'group-room-3';
      const targetUserId = userId || 'anonymous-user';

      pushSubscriptionsMap.set(subscription.endpoint, {
        subscription,
        groupId: targetGroupId,
        userId: targetUserId,
        userName: userName || 'Member',
        userAgent: req.headers['user-agent'],
        updatedAt: Date.now(),
      });

      saveSubscriptionsToDisk();

      console.log(`[Web Push] Device subscribed for user: ${userName || targetUserId} in group: ${targetGroupId}. Total active subscriptions: ${pushSubscriptionsMap.size}`);

      return res.json({
        success: true,
        message: 'Push subscription registered successfully.',
        totalSubscriptionsInGroup: Array.from(pushSubscriptionsMap.values()).filter((s) => s.groupId === targetGroupId).length,
      });
    } catch (err: any) {
      console.error('[Web Push] Subscription error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save subscription.' });
    }
  });

  // 3. Unsubscribe a device
  app.post('/api/push/unsubscribe', (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint && pushSubscriptionsMap.has(endpoint)) {
        pushSubscriptionsMap.delete(endpoint);
        saveSubscriptionsToDisk();
      }
      return res.json({ success: true, message: 'Unsubscribed successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to unsubscribe.' });
    }
  });

  // 4. Send Push Notification to all group members except sender
  app.post('/api/push/send', async (req, res) => {
    try {
      const { groupId, senderId, senderName, groupName, text, messageType, fileName, audioDuration } = req.body;

      if (!groupId) {
        return res.status(400).json({ error: 'groupId is required to send notifications.' });
      }

      // Format notification content based on message type
      let notificationTitle = `${senderName || 'Room Member'} (${groupName || 'Mess Group'})`;
      let notificationBody = text || 'Sent a message in group chat';

      if (messageType === 'voice') {
        const durSec = audioDuration ? `${Math.round(audioDuration)}s` : '';
        notificationBody = `🎤 Voice Message ${durSec ? `(${durSec})` : ''}: "${text || 'Audio Note'}"`;
      } else if (messageType === 'image') {
        notificationBody = `📷 Photo Shared: ${fileName || 'Image'}`;
      } else if (messageType === 'file') {
        notificationBody = `📎 Document Shared: ${fileName || 'File attachment'}`;
      } else if (messageType === 'expense_added') {
        notificationTitle = `💰 New Expense Added - ${groupName || 'Mess Group'}`;
        notificationBody = `${senderName || 'Member'}: ${text}`;
      } else if (messageType === 'settlement_update') {
        notificationTitle = `📑 Settlement Report - ${groupName || 'Mess Group'}`;
        notificationBody = `${senderName || 'Member'}: ${text}`;
      }

      const payload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `group-${groupId}`,
        data: {
          url: `/?tab=chat&group=${groupId}`,
          groupId,
          senderId,
          timestamp: Date.now(),
        },
      });

      // Find all target subscriptions for this group (excluding sender's own device)
      const targetSubscribers: StoredPushSubscription[] = [];
      for (const [endpoint, storedSub] of pushSubscriptionsMap.entries()) {
        if (storedSub.groupId === groupId) {
          // Do not send push notification to sender's own device if senderId matches
          if (senderId && storedSub.userId === senderId) {
            continue;
          }
          targetSubscribers.push(storedSub);
        }
      }

      console.log(`[Web Push] Dispatching notification to ${targetSubscribers.length} devices in group ${groupId}`);

      let sentCount = 0;
      let failedCount = 0;
      const expiredEndpoints: string[] = [];

      const sendPromises = targetSubscribers.map(async (storedSub) => {
        try {
          await webpush.sendNotification(storedSub.subscription, payload, {
            TTL: 86400, // Keep in push service for up to 24 hours if device is temporarily offline
            urgency: 'high',
          });
          sentCount++;
        } catch (pushErr: any) {
          failedCount++;
          // If subscription has expired or is invalid (404 or 410 Gone), remove it
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            expiredEndpoints.push(storedSub.subscription.endpoint);
          } else {
            console.warn(`[Web Push] Delivery warning for ${storedSub.userName || storedSub.userId}:`, pushErr.message);
          }
        }
      });

      await Promise.allSettled(sendPromises);

      // Clean up expired endpoints
      for (const expEndpoint of expiredEndpoints) {
        pushSubscriptionsMap.delete(expEndpoint);
      }

      return res.json({
        success: true,
        sentCount,
        failedCount,
        totalEligibleDevices: targetSubscribers.length,
      });
    } catch (err: any) {
      console.error('[Web Push] Send error:', err);
      return res.status(500).json({ error: err.message || 'Failed to dispatch push notification.' });
    }
  });

  // 5. Send Test Notification to current user device
  app.post('/api/push/test', async (req, res) => {
    try {
      const { subscription, userName } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription object required.' });
      }

      const testPayload = JSON.stringify({
        title: 'UAE MESS SYSTEM 🔔',
        body: `Test notification successful! You will receive group chat alerts on this device even when the app is closed.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url: '/?tab=chat',
        },
      });

      await webpush.sendNotification(subscription, testPayload, {
        TTL: 60,
        urgency: 'high',
      });

      return res.json({ success: true, message: 'Test notification sent successfully!' });
    } catch (err: any) {
      console.error('[Web Push] Test push error:', err);
      return res.status(500).json({ error: err.message || 'Failed to send test push notification.' });
    }
  });

  // Proxy endpoint for Google Sheets Sync Status
  app.get('/api/sheets/status', (req, res) => {
    res.json({
      connected: true,
      account: 'mydriveshakil@gmail.com',
      service: 'Google Drive / Google Sheets API v4',
      sharedAccountMode: true,
      realtimePollingIntervalMs: 10000,
    });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Group Expense Tracker server running on http://localhost:${PORT}`);
  });
}

startServer();
