/**
 * IndexedDB wrapper (Dexie) — primary local store for offline-first sync.
 * @module services/offline-db
 */

const DEXIE_URL = 'https://unpkg.com/dexie@4.0.7/dist/modern/dexie.mjs';

/** @type {import('dexie').Dexie|null} */
let _db = null;
/** @type {Promise<import('dexie').Dexie>|null} */
let _initPromise = null;

/**
 * @returns {Promise<import('dexie').Dexie>}
 */
export async function initOfflineDB() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { default: Dexie } = await import(/* @vite-ignore */ DEXIE_URL);

    class MonefyiDB extends Dexie {
      constructor() {
        super('MonefyiDB');

        this.version(1).stores({
          transactions:
            'id, server_id, user_id, date, type, category, account, _sync_status, _local_modified_at',
          accounts: 'id, server_id, user_id, name, type, _sync_status, _local_modified_at',
          budgets: 'id, server_id, user_id, month, _sync_status, _local_modified_at',
          categories: 'id, server_id, user_id, name, type',
          sync_queue: '++queueId, table, record_id, operation, status, created_at',
          app_state: 'key',
          cached_pages: 'url, data, cached_at',
        });
      }
    }

    _db = new MonefyiDB();
    await _db.open();
    return _db;
  })();

  return _initPromise;
}

/**
 * @returns {Promise<import('dexie').Dexie>}
 */
export async function getDb() {
  return initOfflineDB();
}

/**
 * Generate a local-only record ID (not yet on server).
 * @returns {string}
 */
export function generateLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `local_${crypto.randomUUID()}`;
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * True when ID was generated locally and may not exist on server yet.
 * @param {string} id
 * @returns {boolean}
 */
export function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local_');
}
