/**
 * Bidirectional sync engine — push local queue, pull server deltas.
 * @module services/sync-engine
 */

import { getDb, isLocalId } from './offline-db.js';

let _syncInProgress = false;
/** @type {Set<(event: string, data?: object) => void>} */
const _syncListeners = new Set();

const PULL_TABLES = ['transactions', 'budgets'];

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @returns {boolean}
 */
function isBrowserOnline() {
  if (typeof window !== 'undefined' && window.monefyiConnectivity?.isOnline) {
    return window.monefyiConnectivity.isOnline();
  }
  return navigator.onLine;
}

/**
 * Initialize sync engine — online/offline listeners + periodic sync.
 */
export function initSyncEngine() {
  window.addEventListener('online', () => {
    console.log('[sync] Online detected');
    notifyListeners('online');
    triggerSync('online');
  });

  window.addEventListener('offline', () => {
    console.log('[sync] Offline detected');
    notifyListeners('offline');
  });

  setInterval(() => {
    if (isBrowserOnline()) triggerSync('periodic');
  }, 5 * 60 * 1000);

  if (isBrowserOnline()) {
    setTimeout(() => triggerSync('startup'), 2000);
  } else {
    window.monefyiConnectivity?.verifyNetworkAccess?.().then((ok) => {
      if (ok) triggerSync('startup');
    });
  }
}

/**
 * Queue a mutation for background sync.
 * @param {'create'|'update'|'delete'} operation
 * @param {string} table
 * @param {string} recordId
 * @param {object} payload
 */
export async function queueSync(operation, table, recordId, payload) {
  const db = await getDb();
  await db.sync_queue.add({
    table,
    record_id: recordId,
    operation,
    payload,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString(),
  });

  if (isBrowserOnline()) triggerSync('immediate');
}

/**
 * Full sync cycle: push pending queue, then pull server changes.
 * @param {string} [reason]
 */
export async function triggerSync(reason = 'manual') {
  if (_syncInProgress) {
    console.log('[sync] Already in progress, skipping');
    return;
  }
  if (!isBrowserOnline()) {
    console.log('[sync] Offline, skipping');
    return;
  }

  const supabase = window.__monefyiSupabase;
  if (!supabase) {
    console.log('[sync] No supabase client');
    return;
  }

  _syncInProgress = true;
  notifyListeners('sync-start', { reason });

  const startTime = Date.now();
  let pushedCount = 0;
  let pulledCount = 0;
  let errorCount = 0;

  try {
    const pushResult = await pushLocalChanges(supabase);
    pushedCount = pushResult.success;
    errorCount += pushResult.errors;

    const pullResult = await pullServerChanges(supabase);
    pulledCount = pullResult.count;

    const db = await getDb();
    await db.app_state.put({
      key: 'last_sync_at',
      value: new Date().toISOString(),
    });

    notifyListeners('sync-complete', {
      reason,
      pushed: pushedCount,
      pulled: pulledCount,
      errors: errorCount,
      duration: Date.now() - startTime,
    });
  } catch (e) {
    console.error('[sync] Failed:', e);
    notifyListeners('sync-error', { error: e?.message || String(e) });
  } finally {
    _syncInProgress = false;
    if (typeof window !== 'undefined' && window.monefyiPending?.processPendingQueue) {
      window.monefyiPending.processPendingQueue().catch(() => {});
    }
  }
}

/**
 * First-time or manual full pull from server into IndexedDB.
 */
export async function initialDataPull() {
  if (!isBrowserOnline()) return { count: 0 };
  const supabase = window.__monefyiSupabase;
  if (!supabase || !getUserId()) return { count: 0 };

  const db = await getDb();
  await db.app_state.put({ key: 'last_sync_at', value: new Date(0).toISOString() });
  const result = await pullServerChanges(supabase);
  await db.app_state.put({
    key: 'last_sync_at',
    value: new Date().toISOString(),
  });
  return result;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function pushLocalChanges(supabase) {
  const db = await getDb();
  const queue = await db.sync_queue.where('status').equals('pending').limit(50).toArray();

  let success = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      await db.sync_queue.update(item.queueId, {
        status: 'syncing',
        attempts: (item.attempts || 0) + 1,
      });

      const tableStore = db[item.table];

      if (item.operation === 'create') {
        const { data, error } = await supabase
          .from(item.table)
          .insert(stripLocalFields(item.payload))
          .select()
          .single();
        if (error) throw error;

        if (tableStore) {
          await tableStore.where('id').equals(item.record_id).modify({
            server_id: data.id,
            id: data.id,
            _sync_status: 'synced',
            _server_updated_at: data.updated_at,
          });
        }
      } else if (item.operation === 'update') {
        const serverId = await getServerIdForLocal(item.table, item.record_id);
        if (!serverId) throw new Error('Server ID not found');

        const { data, error } = await supabase
          .from(item.table)
          .update(stripLocalFields(item.payload))
          .eq('id', serverId)
          .select()
          .single();
        if (error) throw error;

        if (tableStore) {
          await tableStore.where('id').equals(item.record_id).modify({
            _sync_status: 'synced',
            _server_updated_at: data.updated_at,
          });
        }
      } else if (item.operation === 'delete') {
        const serverId = await getServerIdForLocal(item.table, item.record_id);
        if (serverId) {
          const { error } = await supabase.from(item.table).delete().eq('id', serverId);
          if (error) throw error;
        }
        if (tableStore) await tableStore.delete(item.record_id);
      }

      await db.sync_queue.delete(item.queueId);
      success++;
    } catch (e) {
      console.error('[sync] Push failed for item:', item, e);
      await db.sync_queue.update(item.queueId, {
        status: 'failed',
        error: e?.message || String(e),
      });
      errors++;
    }
  }

  return { success, errors };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function pullServerChanges(supabase) {
  const userId = getUserId();
  if (!userId) return { count: 0 };

  const db = await getDb();
  const lastSync = await db.app_state.get('last_sync_at');
  const since = lastSync?.value || new Date(0).toISOString();

  let totalPulled = 0;

  for (const table of PULL_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .limit(table === 'transactions' ? 500 : 100);

    if (error) {
      console.warn(`[sync] Pull ${table} error:`, error);
      continue;
    }

    for (const row of data || []) {
      if (table === 'transactions') {
        totalPulled += await mergeTransactionFromServer(db, row);
      } else if (table === 'budgets') {
        totalPulled += await mergeBudgetFromServer(db, row);
      }
    }
  }

  return { count: totalPulled };
}

/**
 * @param {import('dexie').Dexie} db
 * @param {object} tx
 */
async function mergeTransactionFromServer(db, tx) {
  const existing = await db.transactions.where('server_id').equals(tx.id).first();
  const existingById = existing || (await db.transactions.get(tx.id));

  if (existingById) {
    if (existingById._sync_status === 'synced' || existingById._sync_status === 'pending_delete') {
      await db.transactions.update(existingById.id, {
        ...tx,
        id: existingById.id,
        server_id: tx.id,
        amount: Number(tx.amount || 0),
        meta: normalizeMeta(tx.meta),
        _sync_status: 'synced',
        _server_updated_at: tx.updated_at,
      });
    } else {
      await db.transactions.update(existingById.id, {
        _sync_status: 'conflict',
        _conflict_data: tx,
      });
    }
  } else {
    await db.transactions.put({
      ...tx,
      id: tx.id,
      server_id: tx.id,
      amount: Number(tx.amount || 0),
      meta: normalizeMeta(tx.meta),
      _sync_status: 'synced',
      _server_updated_at: tx.updated_at,
    });
  }
  return 1;
}

/**
 * @param {import('dexie').Dexie} db
 * @param {object} budget
 */
async function mergeBudgetFromServer(db, budget) {
  const id = budget.id || `${budget.user_id}_${budget.month}`;
  await db.budgets.put({
    ...budget,
    id,
    server_id: budget.id || id,
    _sync_status: 'synced',
    _server_updated_at: budget.updated_at,
  });
  return 1;
}

/**
 * @param {unknown} meta
 */
function normalizeMeta(meta) {
  if (meta && typeof meta === 'object') return meta;
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @param {object} payload
 */
function stripLocalFields(payload) {
  const cleaned = { ...payload };
  delete cleaned._sync_status;
  delete cleaned._local_modified_at;
  delete cleaned._server_updated_at;
  delete cleaned._conflict_data;
  delete cleaned.server_id;
  if (isLocalId(cleaned.id)) delete cleaned.id;
  return cleaned;
}

/**
 * @param {string} table
 * @param {string} localId
 */
async function getServerIdForLocal(table, localId) {
  const db = await getDb();
  const store = db[table];
  if (!store) return null;
  const record = await store.get(localId);
  return record?.server_id || (isLocalId(localId) ? null : localId);
}

/**
 * @param {(event: string, data?: object) => void} callback
 * @returns {() => void}
 */
export function onSyncEvent(callback) {
  _syncListeners.add(callback);
  return () => _syncListeners.delete(callback);
}

/**
 * @param {string} event
 * @param {object} [data]
 */
function notifyListeners(event, data) {
  for (const listener of _syncListeners) {
    try {
      listener(event, data);
    } catch (e) {
      console.error('[sync] Listener error:', e);
    }
  }
}

/**
 * @returns {{ isOnline: boolean, isSyncing: boolean }}
 */
export function getSyncStatus() {
  return {
    isOnline: isBrowserOnline(),
    isSyncing: _syncInProgress,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiSync = { triggerSync, getSyncStatus, onSyncEvent, initialDataPull };
}
