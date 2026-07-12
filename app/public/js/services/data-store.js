/**
 * Unified offline-first CRUD — writes locally first, syncs in background.
 * @module services/data-store
 */

import { getDb, generateLocalId, isLocalId } from './offline-db.js';
import { queueSync } from './sync-engine.js';

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
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
 * Create transaction locally and queue server sync.
 * @param {object} data
 */
export async function createTransaction(data) {
  const db = await getDb();
  const localId = data.id && !isLocalId(data.id) ? data.id : generateLocalId();
  const now = new Date().toISOString();

  const record = {
    id: localId,
    ...data,
    user_id: data.user_id || getUserId(),
    amount: Number(data.amount || 0),
    meta: normalizeMeta(data.meta),
    created_at: data.created_at || now,
    updated_at: now,
    server_id: isLocalId(localId) ? null : localId,
    _sync_status: 'pending',
    _local_modified_at: now,
  };

  await db.transactions.put(record);
  await queueSync('create', 'transactions', localId, record);
  return record;
}

/**
 * @param {string} id
 * @param {object} updates
 */
export async function updateTransaction(id, updates) {
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = await db.transactions.get(id);

  const merged = {
    ...(existing || {}),
    ...updates,
    id,
    updated_at: now,
    _sync_status: 'pending',
    _local_modified_at: now,
  };

  if (updates.meta !== undefined) merged.meta = normalizeMeta(updates.meta);
  if (updates.amount !== undefined) merged.amount = Number(updates.amount);

  await db.transactions.put(merged);
  await queueSync('update', 'transactions', id, merged);
  return merged;
}

/**
 * @param {string} id
 */
export async function deleteTransaction(id) {
  const db = await getDb();
  await queueSync('delete', 'transactions', id, { id });
  await db.transactions.update(id, {
    _sync_status: 'pending_delete',
    _local_modified_at: new Date().toISOString(),
  });
}

/**
 * @param {string} id
 */
export async function getTransaction(id) {
  const db = await getDb();
  return db.transactions.get(id);
}

/**
 * @param {object} [filters]
 */
export async function getTransactions(filters = {}) {
  const db = await getDb();
  let results;

  if (filters.userId) {
    results = await db.transactions.where('user_id').equals(filters.userId).toArray();
  } else {
    results = await db.transactions.toArray();
  }

  results = results.filter((t) => t._sync_status !== 'pending_delete');

  if (filters.startDate) {
    results = results.filter((t) => t.date >= filters.startDate);
  }
  if (filters.endDate) {
    results = results.filter((t) => t.date <= filters.endDate);
  }
  if (filters.type) {
    results = results.filter((t) => t.type === filters.type);
  }

  results.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  if (filters.limit) results = results.slice(0, filters.limit);
  return results;
}

/**
 * Mirror a server transaction into IndexedDB (no sync queue).
 * @param {object} tx
 */
export async function mirrorTransaction(tx) {
  if (!tx?.id) return;
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transactions.put({
    ...tx,
    user_id: tx.user_id || getUserId(),
    amount: Number(tx.amount || 0),
    meta: normalizeMeta(tx.meta),
    server_id: tx.id,
    _sync_status: 'synced',
    _server_updated_at: tx.updated_at || now,
  });
}

/**
 * @param {object[]} transactions
 */
export async function mirrorTransactionsBulk(transactions) {
  if (!Array.isArray(transactions) || !transactions.length) return;
  const db = await getDb();
  const now = new Date().toISOString();

  await db.transactions.bulkPut(
    transactions.map((tx) => ({
      ...tx,
      user_id: tx.user_id || getUserId(),
      amount: Number(tx.amount || 0),
      meta: normalizeMeta(tx.meta),
      server_id: tx.id,
      _sync_status: 'synced',
      _server_updated_at: tx.updated_at || now,
    }))
  );
}

/**
 * @param {Record<string, object>} budgetsByMonth
 */
export async function mirrorBudgetsFromState(budgetsByMonth) {
  const userId = getUserId();
  if (!userId || !budgetsByMonth) return;
  const db = await getDb();

  const rows = Object.entries(budgetsByMonth).map(([month, b]) => ({
    id: `${userId}_${month}`,
    user_id: userId,
    month,
    income: Number(b.income || 0),
    categories: b.categories || {},
    updated_at: b.updated_at || new Date().toISOString(),
    server_id: `${userId}_${month}`,
    _sync_status: 'synced',
  }));

  if (rows.length) await db.budgets.bulkPut(rows);
}

/**
 * @returns {Promise<object[]>}
 */
export async function getAccounts() {
  const userId = getUserId();
  if (!userId) return [];
  const db = await getDb();
  return db.accounts.where('user_id').equals(userId).toArray();
}

/**
 * @param {string} [period] - YYYY-MM month key
 */
export async function getBudgets(period) {
  const userId = getUserId();
  if (!userId) return [];
  const db = await getDb();
  let results = await db.budgets.where('user_id').equals(userId).toArray();
  if (period) results = results.filter((b) => b.month === period);
  return results;
}

/**
 * Hydrate in-memory STATE.transactions from IndexedDB when offline.
 * @returns {Promise<object[]>}
 */
export async function hydrateStateTransactions(filters) {
  const rows = await getTransactions(filters);
  return rows.map((t) => ({
    ...t,
    amount: Number(t.amount || 0),
    meta: normalizeMeta(t.meta),
  }));
}

/**
 * Cache profile + settings for offline boot.
 * @param {object} profile
 * @param {object} settings
 */
export async function cacheUserProfile(profile, settings) {
  const userId = getUserId() || profile?.id;
  if (!userId) return;
  const db = await getDb();
  await db.app_state.put({
    key: `profile_${userId}`,
    value: {
      profile,
      settings,
      cached_at: new Date().toISOString(),
    },
  });
}

/**
 * @param {string} userId
 */
export async function getCachedUserProfile(userId) {
  if (!userId) return null;
  const db = await getDb();
  const row = await db.app_state.get(`profile_${userId}`);
  return row?.value || null;
}
