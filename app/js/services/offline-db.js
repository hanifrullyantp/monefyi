/**
 * IndexedDB wrapper (Dexie) — primary local store for offline-first sync.
 * @module services/offline-db
 */

import Dexie from '../vendor/dexie.mjs';

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

        this.version(2).stores({
          pending_transactions: 'id, status, userId, createdAt',
        });

        this.version(3).stores({
          undo_stack: '++id, createdAt',
          activity_log: '++id, action, entityType, entityId, createdAt',
        });

        this.version(4).stores({
          notifications: 'id, timestamp, type, read, dismissed, dedupKey',
          income_sources: 'id, period, type, updated_at',
        });

        this.version(5).stores({
          neraca_chart_accounts: 'id, user_id, code, side, category',
          neraca_assets: 'id, user_id, category, updated_at, _sync_status',
          neraca_debts: 'id, user_id, category, updated_at, _sync_status',
          neraca_receivables: 'id, user_id, status, updated_at, _sync_status',
          neraca_equity_events: 'id, user_id, kind, event_date, updated_at, _sync_status',
          journal_entries: 'id, user_id, transaction_id, entry_date, account_code, source, _sync_status',
          balance_snapshots: 'id, user_id, month',
          suspense_log: 'id, user_id, as_of, created_at',
          neraca_meta: 'key',
        });

        this.version(6).stores({
          transactions:
            'id, server_id, user_id, date, type, category, account, period, _sync_status, _local_modified_at',
          monthly_periods: 'id, server_id, user_id, period, [user_id+period], status, updated_at, _sync_status',
          account_opening_balances: 'id, server_id, user_id, account_name, as_of_date, updated_at, _sync_status',
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
