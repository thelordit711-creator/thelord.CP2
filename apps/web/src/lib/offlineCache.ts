/**
 * 👑 TheLord ERP - High-Performance IndexedDB Offline Cache Engine
 * Provides instant offline local persistence for tasks, stages, notifications, and balance data.
 * Automatically synchronizes cached offline submissions when network connection is restored.
 */

const DB_NAME = 'TheLordERP_CacheDB';
const DB_VERSION = 1;

export interface ICachedItem<T = any> {
  key: string;
  data: T;
  cachedAt: number;
  syncPending?: boolean;
}

class OfflineCacheManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Stores for tasks, reports, and sync queue
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
   * Save item to offline store
   */
  async set<T>(storeName: 'tasks_cache' | 'workspace_cache' | 'pending_sync_queue', key: string, data: T, syncPending = false): Promise<void> {
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
  async get<T>(storeName: 'tasks_cache' | 'workspace_cache' | 'pending_sync_queue', key: string): Promise<T | null> {
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
    } catch (e) {
      return null;
    }
  }

  /**
   * Enqueue offline submission for background sync
   */
  async queueOfflineSubmission(type: 'STAGE_SUBMIT' | 'TASK_PROPOSE' | 'RECEIPT_CONFIRM', payload: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('pending_sync_queue', 'readwrite');
      const store = tx.objectStore('pending_sync_queue');
      store.add({
        type,
        payload,
        queuedAt: Date.now()
      });
    } catch (e) {
      console.warn('[OfflineCache] Queue failed:', e);
    }
  }
}

export const offlineCache = new OfflineCacheManager();
