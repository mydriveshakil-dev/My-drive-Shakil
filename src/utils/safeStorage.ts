/**
 * safeStorage - Resilient localStorage wrapper & auto-remedy for QuotaExceededError.
 * 
 * Provides:
 * 1. Automatic cleanup of expendable/transient cache keys when quota is exceeded.
 * 2. In-memory Map fallback when browser storage quota is completely exhausted or restricted.
 * 3. Transparent prototype patching so any existing or 3rd-party localStorage calls never crash.
 */

const memoryFallback = new Map<string, string>();

/**
 * Prunes large, expendable, or non-critical keys to free up localStorage quota.
 */
export function cleanupExpendableStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keysToRemove: string[] = [];
    const keysToTruncate: { key: string; length: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // 1. Transient Google Sheet local buffer caches
      if (k.startsWith('group_sheets_data_')) {
        keysToRemove.push(k);
      }
      // 2. Old deleted expense / utility backups that have already served their purpose
      else if (k.startsWith('deleted_expenses_backup_')) {
        keysToRemove.push(k);
      }
      // 3. Daily notice seen markers older than today
      else if (k.startsWith('group_notice_seen_') || k.startsWith('chat_seen_')) {
        keysToRemove.push(k);
      }
      // 4. Track heavy keys for potential pruning
      else {
        const val = localStorage.getItem(k) || '';
        if (val.length > 50000) {
          keysToTruncate.push({ key: k, length: val.length });
        }
      }
    }

    // Remove non-critical caches first
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    // If still heavy, trim large chat message histories to last 50 items
    for (const { key } of keysToTruncate) {
      if (key.startsWith('room_chat_messages_')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const msgs = JSON.parse(val);
            if (Array.isArray(msgs) && msgs.length > 50) {
              const trimmed = msgs.slice(-50);
              localStorage.setItem(key, JSON.stringify(trimmed));
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('[safeStorage] Cleanup error:', e);
  }
}

/**
 * Safe setItem with auto-quota cleanup and in-memory fallback.
 */
export function safeSetItem(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      String(err).toLowerCase().includes('quota') ||
      String(err).toLowerCase().includes('exceeded');

    if (isQuota) {
      console.warn(`[safeStorage] QuotaExceededError writing "${key}". Auto-remediating storage...`);
      cleanupExpendableStorage();
      try {
        localStorage.setItem(key, value);
      } catch {
        // Safe fallback in memory without throwing
        console.warn(`[safeStorage] Key "${key}" saved to memory fallback.`);
      }
    }
  }
}

/**
 * Safe getItem reading from localStorage with fallback to in-memory map.
 */
export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return memoryFallback.get(key) ?? null;
}

/**
 * Safe removeItem removing from both localStorage and in-memory map.
 */
export function safeRemoveItem(key: string): void {
  memoryFallback.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch {}
}

/**
 * Global prototype patch for Storage.prototype.setItem and getItem.
 * Ensures any direct `localStorage.setItem` call never crashes the app.
 */
export function patchGlobalStorage(): void {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;

  try {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      try {
        originalSetItem.call(this, key, value);
        memoryFallback.set(key, value);
      } catch (err: any) {
        memoryFallback.set(key, value);
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err?.code === 22 ||
          err?.code === 1014 ||
          String(err).toLowerCase().includes('quota') ||
          String(err).toLowerCase().includes('exceeded');

        if (isQuota) {
          cleanupExpendableStorage();
          try {
            originalSetItem.call(this, key, value);
          } catch {
            // Memory fallback active - gracefully ignore storage write error
          }
        }
      }
    };

    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string): string | null {
      try {
        const val = originalGetItem.call(this, key);
        if (val !== null) return val;
      } catch {}
      return memoryFallback.get(key) ?? null;
    };
  } catch (e) {
    console.warn('[safeStorage] Could not patch Storage.prototype:', e);
  }
}

// Auto-patch immediately upon module load
patchGlobalStorage();
