/**
 * 👑 TheLord ERP - High-Performance IndexedDB Offline Cache Engine
 * Provides offline persistence for NON-SENSITIVE operational UI data only
 * (tasks & non-financial workspace views) with idempotent background queue sync.
 * Sensitive financial balances, treasury records, and auth tokens are never cached offline.
 */

const DB_NAME = 'TheLordERP_CacheDB';
const DB_VERSION = 1;

const NON_CACHEABLE_KEY_PATTERNS = [
  'balance',
  'vault',
  'payout',
  'ledger',
  'treasury',
  'token',
  'auth',
  'secret'
];

export interface ICachedItem<T = any> {
  key: string;
  data: T;
  cachedAt: number;
  syncPending?: boolean;
}

export interface IQueuedSubmission {
  key?: number;
  idempotencyKey: string;
  type: 'STAGE_SUBMIT' | 'TASK_PROPOSE' | 'RECEIPT_CONFIRM';
  payload: any;
  queuedAt: number;
  attempts: number;
}

export function isCacheKeyAllowed(key: string): boolean {
  const lower = key.toLowerCase();
  return !NON_CACHEABLE_KEY_PATTERNS.some((blocked) => lower.includes(blocked));
}

class OfflineCacheManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isFlushing = false;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('tasks_cache')) {
          db.createObjectStore('tasks_cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('workspace_cache')) {
          db.createObjectStore('workspace_cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('pending_sync_queue')) {
          db.createObjectStore('pending_sync_queue', { keyPath: 'key', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Save non-sensitive item to offline store
   */
  async set<T>(
    storeName: 'tasks_cache' | 'workspace_cache' | 'pending_sync_queue',
    key: string,
    data: T,
    syncPending = false
  ): Promise<void> {
    if (!isCacheKeyAllowed(key)) {
      console.warn(`[OfflineCache] Refused to persist sensitive key offline: ${key}`);
      return;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const item: ICachedItem<T> = {
        key,
        data,
        cachedAt: Date.now(),
        syncPending
      };
      store.put(item);
    } catch (e) {
      console.warn('[OfflineCache] Set failed:', e);
    }
  }

  /**
   * Retrieve cached item from offline store
   */
  async get<T>(
    storeName: 'tasks_cache' | 'workspace_cache' | 'pending_sync_queue',
    key: string
  ): Promise<T | null> {
    if (!isCacheKeyAllowed(key)) return null;

    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data as T);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Enqueue offline submission with deterministic idempotencyKey deduplication
   */
  async queueOfflineSubmission(
    type: 'STAGE_SUBMIT' | 'TASK_PROPOSE' | 'RECEIPT_CONFIRM',
    payload: any,
    idempotencyKey?: string
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const dedupKey =
        idempotencyKey || `${type}:${JSON.stringify(payload || {})}`;

      const existingItems = await this.listPendingSubmissions();
      if (existingItems.some((item) => item.idempotencyKey === dedupKey)) {
        return; // Deduplicate identical offline retry
      }

      const tx = db.transaction('pending_sync_queue', 'readwrite');
      const store = tx.objectStore('pending_sync_queue');
      const record: Omit<IQueuedSubmission, 'key'> = {
        idempotencyKey: dedupKey,
        type,
        payload,
        queuedAt: Date.now(),
        attempts: 0
      };
      store.add(record);
    } catch (e) {
      console.warn('[OfflineCache] Queue failed:', e);
    }
  }

  async listPendingSubmissions(): Promise<IQueuedSubmission[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('pending_sync_queue', 'readonly');
        const store = tx.objectStore('pending_sync_queue');
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result || []) as IQueuedSubmission[]);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Flushes queued offline submissions sequentially when online, removing succeeded
   * entries and capping retries to avoid poison-pill loops.
   */
  async flushPendingQueue(
    processor: (entry: IQueuedSubmission) => Promise<boolean>,
    maxRetries = 5
  ): Promise<{ synced: number; failed: number }> {
    if (this.isFlushing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { synced: 0, failed: 0 };
    }

    this.isFlushing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pending = await this.listPendingSubmissions();
      const db = await this.getDB();

      for (const entry of pending) {
        try {
          const ok = await processor(entry);
          const tx = db.transaction('pending_sync_queue', 'readwrite');
          const store = tx.objectStore('pending_sync_queue');

          if (ok && entry.key !== undefined) {
            store.delete(entry.key);
            synced++;
          } else if (entry.key !== undefined) {
            const nextAttempts = (entry.attempts || 0) + 1;
            if (nextAttempts >= maxRetries) {
              store.delete(entry.key);
            } else {
              store.put({ ...entry, attempts: nextAttempts });
            }
            failed++;
          }
        } catch {
          failed++;
        }
      }
    } catch (e) {
      console.warn('[OfflineCache] Queue flush failed:', e);
    } finally {
      this.isFlushing = false;
    }

    return { synced, failed };
  }

  /**
   * Clears all offline cached stores (recommended on logout)
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      const stores: Array<'tasks_cache' | 'workspace_cache' | 'pending_sync_queue'> = [
        'tasks_cache',
        'workspace_cache',
        'pending_sync_queue'
      ];
      const tx = db.transaction(stores, 'readwrite');
      stores.forEach((name) => tx.objectStore(name).clear());
    } catch {
      // ignore in SSR/unsupported browsers
    }
  }
}

export const offlineCache = new OfflineCacheManager();
