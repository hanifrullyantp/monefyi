/**
 * Local-first store for Neraca (balance sheet) entities.
 * @module services/neraca-store
 */

import { getDb, generateLocalId } from './offline-db.js';

export const CHART_DEFAULTS = [
  { code: 'kas', name: 'Kas', side: 'aktiva', category: 'kas', sort_order: 10 },
  { code: 'piutang', name: 'Piutang', side: 'aktiva', category: 'piutang', sort_order: 20 },
  { code: 'stok', name: 'Stok / Inventori', side: 'aktiva', category: 'stok', sort_order: 30 },
  { code: 'properti', name: 'Properti', side: 'aktiva', category: 'properti', sort_order: 40 },
  { code: 'pra_bayar', name: 'Pra Bayar', side: 'aktiva', category: 'pra_bayar', sort_order: 50 },
  { code: 'investasi', name: 'Investasi', side: 'aktiva', category: 'investasi', sort_order: 60 },
  { code: 'aset_lainnya', name: 'Aset Lainnya', side: 'aktiva', category: 'aset_lainnya', sort_order: 70 },
  { code: 'hutang_dagang', name: 'Hutang Dagang', side: 'pasiva', category: 'hutang_dagang', sort_order: 10 },
  { code: 'hutang_pajak', name: 'Hutang Pajak', side: 'pasiva', category: 'hutang_pajak', sort_order: 20 },
  { code: 'hutang_lainnya', name: 'Hutang Lainnya', side: 'pasiva', category: 'hutang_lainnya', sort_order: 30 },
  { code: 'modal', name: 'Modal', side: 'pasiva', category: 'modal', sort_order: 40 },
  { code: 'simpanan', name: 'Simpanan', side: 'pasiva', category: 'simpanan', sort_order: 50 },
  { code: 'laba_ditahan', name: 'Laba Ditahan', side: 'pasiva', category: 'laba_ditahan', sort_order: 60 },
  { code: 'kewajiban_lainnya', name: 'Kewajiban Lainnya', side: 'pasiva', category: 'kewajiban_lainnya', sort_order: 70 },
  { code: 'suspense', name: 'Selisih / Suspense', side: 'pasiva', category: 'suspense', sort_order: 99 },
];

/**
 * @returns {string|null}
 */
function currentUserId() {
  return window.STATE?.db?.user?.id || window.STATE?.user?.id || null;
}

/**
 * @param {string} table
 * @param {object} row
 */
async function putLocal(table, row) {
  const db = await getDb();
  await db.table(table).put(row);
  return row;
}

/**
 * @param {string} table
 * @param {string} userId
 */
async function listByUser(table, userId) {
  const db = await getDb();
  return db.table(table).where('user_id').equals(userId).toArray();
}

/**
 * Seed chart of accounts for user if empty.
 * @param {string} [userId]
 */
export async function ensureChartAccounts(userId) {
  const uid = userId || currentUserId();
  if (!uid) return [];
  const existing = await listByUser('neraca_chart_accounts', uid);
  if (existing.length) return existing;
  const rows = CHART_DEFAULTS.map((c) => ({
    id: generateLocalId(),
    user_id: uid,
    ...c,
    is_system: true,
    created_at: new Date().toISOString(),
  }));
  const db = await getDb();
  await db.table('neraca_chart_accounts').bulkPut(rows);
  return rows;
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export async function setNeracaMeta(key, value) {
  const db = await getDb();
  await db.table('neraca_meta').put({ key, value, updated_at: new Date().toISOString() });
}

/**
 * @param {string} key
 * @returns {Promise<unknown>}
 */
export async function getNeracaMeta(key) {
  const db = await getDb();
  const row = await db.table('neraca_meta').get(key);
  return row?.value;
}

/**
 * @returns {Promise<{ assets: object[], debts: object[], receivables: object[], equity: object[] }>}
 */
export async function loadNeracaEntities(userId) {
  const uid = userId || currentUserId();
  if (!uid) {
    return { assets: [], debts: [], receivables: [], equity: [] };
  }
  await ensureChartAccounts(uid);
  const [assets, debts, receivables, equity] = await Promise.all([
    listByUser('neraca_assets', uid),
    listByUser('neraca_debts', uid),
    listByUser('neraca_receivables', uid),
    listByUser('neraca_equity_events', uid),
  ]);
  return { assets, debts, receivables, equity };
}

/**
 * @param {object} data
 */
export async function upsertAsset(data) {
  const uid = currentUserId();
  if (!uid) throw new Error('Not authenticated');
  const row = {
    id: data.id || generateLocalId(),
    user_id: uid,
    category: data.category || 'aset_lainnya',
    name: data.name || 'Aset',
    amount: Math.abs(Number(data.amount || 0)),
    notes: data.notes || '',
    acquired_at: data.acquired_at || null,
    meta: data.meta || {},
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _sync_status: 'pending',
  };
  await putLocal('neraca_assets', row);
  pushRemote('neraca_assets', row).catch(() => {});
  return row;
}

/**
 * @param {string} id
 */
export async function deleteAsset(id) {
  const db = await getDb();
  await db.table('neraca_assets').delete(id);
  deleteRemote('neraca_assets', id).catch(() => {});
}

/**
 * @param {object} data
 */
export async function upsertDebt(data) {
  const uid = currentUserId();
  if (!uid) throw new Error('Not authenticated');
  const row = {
    id: data.id || generateLocalId(),
    user_id: uid,
    category: data.category || 'hutang_lainnya',
    name: data.name || 'Hutang',
    amount: Math.abs(Number(data.amount || 0)),
    due_date: data.due_date || null,
    notes: data.notes || '',
    meta: data.meta || {},
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _sync_status: 'pending',
  };
  await putLocal('neraca_debts', row);
  pushRemote('neraca_debts', row).catch(() => {});
  return row;
}

/**
 * @param {string} id
 */
export async function deleteDebt(id) {
  const db = await getDb();
  await db.table('neraca_debts').delete(id);
  deleteRemote('neraca_debts', id).catch(() => {});
}

/**
 * @param {object} data
 */
export async function upsertReceivable(data) {
  const uid = currentUserId();
  if (!uid) throw new Error('Not authenticated');
  const row = {
    id: data.id || generateLocalId(),
    user_id: uid,
    name: data.name || 'Piutang',
    amount: Math.abs(Number(data.amount || 0)),
    due_date: data.due_date || null,
    status: data.status || 'open',
    notes: data.notes || '',
    meta: data.meta || {},
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _sync_status: 'pending',
  };
  await putLocal('neraca_receivables', row);
  pushRemote('neraca_receivables', row).catch(() => {});
  return row;
}

/**
 * @param {string} id
 */
export async function deleteReceivable(id) {
  const db = await getDb();
  await db.table('neraca_receivables').delete(id);
  deleteRemote('neraca_receivables', id).catch(() => {});
}

/**
 * @param {object} data
 */
export async function upsertEquityEvent(data) {
  const uid = currentUserId();
  if (!uid) throw new Error('Not authenticated');
  const row = {
    id: data.id || generateLocalId(),
    user_id: uid,
    kind: data.kind || 'modal',
    name: data.name || (data.kind === 'simpanan' ? 'Simpanan' : 'Modal'),
    amount: Number(data.amount || 0),
    event_date: data.event_date || new Date().toISOString().slice(0, 10),
    notes: data.notes || '',
    meta: data.meta || {},
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _sync_status: 'pending',
  };
  await putLocal('neraca_equity_events', row);
  pushRemote('neraca_equity_events', row).catch(() => {});
  return row;
}

/**
 * @param {string} id
 */
export async function deleteEquityEvent(id) {
  const db = await getDb();
  await db.table('neraca_equity_events').delete(id);
  deleteRemote('neraca_equity_events', id).catch(() => {});
}

/**
 * Replace all auto journal rows for a transaction.
 * @param {string} transactionId
 * @param {object[]} entries
 */
export async function replaceJournalForTransaction(transactionId, entries) {
  const uid = currentUserId();
  if (!uid || !transactionId) return;
  const db = await getDb();
  const existing = await db.table('journal_entries')
    .where('[user_id+transaction_id]')
    .equals([uid, transactionId])
    .catch(async () => {
      const all = await db.table('journal_entries').where('user_id').equals(uid).toArray();
      return all.filter((e) => e.transaction_id === transactionId);
    });
  const ids = (existing || []).map((e) => e.id);
  if (ids.length) await db.table('journal_entries').bulkDelete(ids);

  const rows = (entries || []).map((e) => ({
    id: e.id || generateLocalId(),
    user_id: uid,
    transaction_id: transactionId,
    entry_date: e.entry_date,
    account_code: e.account_code,
    sub_account: e.sub_account || '',
    debit: Math.abs(Number(e.debit || 0)),
    credit: Math.abs(Number(e.credit || 0)),
    memo: e.memo || '',
    source: e.source || 'auto',
    created_at: new Date().toISOString(),
    _sync_status: 'pending',
  }));
  if (rows.length) await db.table('journal_entries').bulkPut(rows);
}

/**
 * @param {string} transactionId
 */
export async function deleteJournalForTransaction(transactionId) {
  const uid = currentUserId();
  if (!uid || !transactionId) return;
  const db = await getDb();
  const all = await db.table('journal_entries').where('user_id').equals(uid).toArray();
  const ids = all.filter((e) => e.transaction_id === transactionId).map((e) => e.id);
  if (ids.length) await db.table('journal_entries').bulkDelete(ids);
}

/**
 * @returns {Promise<object[]>}
 */
export async function listJournalEntries(userId) {
  const uid = userId || currentUserId();
  if (!uid) return [];
  return listByUser('journal_entries', uid);
}

/**
 * Clear auto/rebuild journal entries for user (keep manual).
 */
export async function clearAutoJournals(userId) {
  const uid = userId || currentUserId();
  if (!uid) return;
  const db = await getDb();
  const all = await db.table('journal_entries').where('user_id').equals(uid).toArray();
  const ids = all.filter((e) => e.source === 'auto' || e.source === 'rebuild').map((e) => e.id);
  if (ids.length) await db.table('journal_entries').bulkDelete(ids);
}

/**
 * @param {string} month YYYY-MM
 * @param {object} payload
 */
export async function saveBalanceSnapshot(month, payload) {
  const uid = currentUserId();
  if (!uid || !month) return null;
  const db = await getDb();
  const existing = (await listByUser('balance_snapshots', uid)).find((s) => s.month === month);
  const row = {
    id: existing?.id || generateLocalId(),
    user_id: uid,
    month,
    payload,
    created_at: new Date().toISOString(),
  };
  await putLocal('balance_snapshots', row);
  pushRemote('balance_snapshots', row).catch(() => {});
  return row;
}

/**
 * @param {string} month
 */
export async function getBalanceSnapshot(month) {
  const uid = currentUserId();
  if (!uid) return null;
  const list = await listByUser('balance_snapshots', uid);
  return list.find((s) => s.month === month) || null;
}

/**
 * @param {object} log
 */
export async function saveSuspenseLog(log) {
  const uid = currentUserId();
  if (!uid) return null;
  const row = {
    id: generateLocalId(),
    user_id: uid,
    as_of: log.as_of,
    side: log.side,
    amount: Number(log.amount || 0),
    reasons: log.reasons || [],
    created_at: new Date().toISOString(),
  };
  await putLocal('suspense_log', row);
  return row;
}

/**
 * Best-effort remote upsert (ignore if table missing / offline).
 * @param {string} table
 * @param {object} row
 */
async function pushRemote(table, row) {
  const supa = window.STATE?.db?.supa;
  if (!supa || !navigator.onLine) return;
  const { _sync_status, ...clean } = row;
  try {
    await supa.from(table).upsert(clean);
  } catch {
    /* table may not exist yet */
  }
}

/**
 * @param {string} table
 * @param {string} id
 */
async function deleteRemote(table, id) {
  const supa = window.STATE?.db?.supa;
  if (!supa || !navigator.onLine) return;
  try {
    await supa.from(table).delete().eq('id', id);
  } catch {
    /* ignore */
  }
}
