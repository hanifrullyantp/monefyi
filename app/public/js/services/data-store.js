/**
 * Unified offline-first CRUD — writes locally first, syncs in background.
 * @module services/data-store
 */

import { getDb, generateLocalId, isLocalId } from './offline-db.js';
import { queueSync } from './sync-engine.js';
import { dedupeTransactions } from '../utils/transaction-utils.js';

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
  const existing = await db.transactions.get(id);
  if (existing) {
    await db.transactions.update(id, {
      _sync_status: 'pending_delete',
      _local_modified_at: new Date().toISOString(),
    });
  }
}

/**
 * IDs marked for local deletion (must not be restored from server pull).
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
export async function getPendingDeleteTransactionIds(userId) {
  if (!userId) return new Set();
  const db = await getDb();
  const rows = await db.transactions.where('user_id').equals(userId).toArray();
  const ids = new Set();
  for (const row of rows) {
    if (row._sync_status !== 'pending_delete') continue;
    if (row.id) ids.add(row.id);
    if (row.server_id) ids.add(row.server_id);
  }
  return ids;
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
  return dedupeTransactions(results);
}

/**
 * Mirror a server transaction into IndexedDB (no sync queue).
 * @param {object} tx
 */
export async function mirrorTransaction(tx) {
  if (!tx?.id) return;
  const db = await getDb();
  const existing = await db.transactions.get(tx.id);
  if (existing?._sync_status === 'pending_delete') return;
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
  const pendingDeletes = new Set(
    (await db.transactions.toArray())
      .filter((row) => row._sync_status === 'pending_delete')
      .flatMap((row) => [row.id, row.server_id].filter(Boolean))
  );

  const rows = [];
  for (const tx of transactions) {
    if (!tx?.id || pendingDeletes.has(tx.id)) continue;
    const existingByServer = tx.id
      ? (await db.transactions.where('server_id').equals(tx.id).first())
      : null;
    const rowId = existingByServer?.id || tx.id;
    rows.push({
      ...tx,
      id: rowId,
      user_id: tx.user_id || getUserId(),
      amount: Number(tx.amount || 0),
      meta: normalizeMeta(tx.meta),
      server_id: tx.id,
      _sync_status: 'synced',
      _server_updated_at: tx.updated_at || now,
    });
  }
  if (rows.length) await db.transactions.bulkPut(rows);
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
 * @param {string} month
 * @returns {Promise<object[]>}
 */
export async function getBudgetRowsForMonth(month) {
  const { migrateBudgetCategories } = await import('./budget-model.js');
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const fromState = state?.budgetsByMonth?.[month]?.categories;
  if (fromState) return migrateBudgetCategories(fromState).rows;

  const rows = await getBudgets(month);
  if (rows[0]?.categories) return migrateBudgetCategories(rows[0].categories).rows;
  return [];
}

/**
 * @param {string} month
 * @returns {number}
 */
export function getIncomeForMonth(month) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  return Number(state?.budgetsByMonth?.[month]?.income || 0);
}

/**
 * Persist budget rows for a month (caller handles Supabase via saveBudgetMonth).
 * @param {string} month
 * @param {number} income
 * @param {object[]} rows
 */
export async function saveBudgetRowsLocal(month, income, rows) {
  const { serializeBudgetRows } = await import('./budget-model.js');
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (!state) return;

  const categories = { rows: serializeBudgetRows(rows) };
  state.budgetsByMonth = state.budgetsByMonth || {};
  state.budgetsByMonth[month] = {
    income: Number(income || 0),
    categories,
    updated_at: new Date().toISOString(),
  };
  await mirrorBudgetsFromState(state.budgetsByMonth);
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
