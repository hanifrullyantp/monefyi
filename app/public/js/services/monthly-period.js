/**
 * Monthly period boundaries — cash flow per bulan, tutup buku.
 * @module services/monthly-period
 */

import { getDb, generateLocalId } from './offline-db.js';
import {
  dedupeTransactions,
  sumByTransactionType,
  isExpenseTransaction,
  isIncomeTransaction,
  isConsumptionExpense,
  isReportableTransaction,
} from '../utils/transaction-utils.js';

/**
 * @param {string|Date} [ref]
 * @returns {string} YYYY-MM
 */
export function toPeriodKey(ref) {
  if (ref && /^\d{4}-\d{2}/.test(String(ref))) return String(ref).slice(0, 7);
  const d = ref instanceof Date ? ref : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} period YYYY-MM
 * @returns {{ start: string, end: string }}
 */
export function periodDateRange(period) {
  const [y, m] = String(period).slice(0, 7).split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mk = `${y}-${String(m).padStart(2, '0')}`;
  return { start: `${mk}-01`, end: `${mk}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * @param {object} tx
 * @returns {string}
 */
export function inferTransactionPeriod(tx) {
  return toPeriodKey(tx?.date || new Date());
}

/**
 * @param {object[]|null|undefined} transactions
 * @param {string} period YYYY-MM
 * @returns {{ income: number, expense: number, transfer: number, net: number, txCount: number }}
 */
export function computePeriodTotals(transactions, period, opts = {}) {
  const { start, end } = periodDateRange(period);
  const filtered = dedupeTransactions(transactions).filter((tx) => {
    const d = String(tx.date || '').slice(0, 10);
    return d >= start && d <= end && isReportableTransaction(tx);
  });
  const totals = sumByTransactionType(filtered, opts.consumptionOnly ? { consumptionOnly: true } : {});
  return { ...totals, txCount: filtered.length };
}

/**
 * @param {object} data
 * @returns {object}
 */
function normalizePeriodRow(data = {}) {
  const period = toPeriodKey(data.period);
  return {
    id: data.id || generateLocalId(),
    user_id: data.user_id,
    period,
    opening_balance: Number(data.opening_balance || 0),
    total_income: Number(data.total_income || 0),
    total_expense: Number(data.total_expense || 0),
    closing_balance: Number(data.closing_balance || 0),
    status: data.status === 'closed' ? 'closed' : 'active',
    closed_at: data.closed_at || null,
    carry_over_allocated: data.carry_over_allocated || {},
    report_payload: data.report_payload || {},
    server_id: data.server_id || null,
    _sync_status: data._sync_status || 'pending',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {string} userId
 * @param {string} period
 * @returns {Promise<object|null>}
 */
export async function getPeriodByKey(userId, period) {
  const db = await getDb();
  const mk = toPeriodKey(period);
  return db.monthly_periods
    .where('[user_id+period]')
    .equals([userId, mk])
    .first()
    .catch(async () => {
      const rows = await db.monthly_periods.where('user_id').equals(userId).toArray();
      return rows.find((r) => r.period === mk) || null;
    });
}

/**
 * Refresh totals from transactions into period row (in-memory + optional persist).
 * @param {object} periodRow
 * @param {object[]} transactions
 * @returns {object}
 */
export function refreshPeriodTotals(periodRow, transactions) {
  const totals = computePeriodTotals(transactions, periodRow.period);
  const net = totals.net;
  return {
    ...periodRow,
    total_income: totals.income,
    total_expense: totals.expense,
    closing_balance: Number(periodRow.opening_balance || 0) + net,
    updated_at: new Date().toISOString(),
    report_payload: {
      ...(periodRow.report_payload || {}),
      txCount: totals.txCount,
      lastComputedAt: new Date().toISOString(),
    },
  };
}

/**
 * @param {string} userId
 * @param {string} period
 * @param {object[]} [transactions]
 * @returns {Promise<object>}
 */
export async function getOrCreateActivePeriod(userId, period, transactions) {
  const db = await getDb();
  const mk = toPeriodKey(period);
  let row = await getPeriodByKey(userId, mk);

  if (!row) {
    row = normalizePeriodRow({
      user_id: userId,
      period: mk,
      status: 'active',
      opening_balance: 0,
    });
  }

  const txs = transactions ?? window.STATE?.transactions ?? [];
  row = refreshPeriodTotals(row, txs);

  await db.monthly_periods.put(row);

  if (window.STATE) {
    if (!window.STATE.monthlyPeriods) window.STATE.monthlyPeriods = {};
    window.STATE.monthlyPeriods[mk] = row;
    window.STATE.activePeriodKey = mk;
  }

  return row;
}

/**
 * Ensure period rows exist for all months with transactions.
 * @param {string} userId
 * @param {object[]} transactions
 * @returns {Promise<object[]>}
 */
export async function backfillPeriodsFromTransactions(userId, transactions) {
  const db = await getDb();
  const months = new Set();
  for (const tx of dedupeTransactions(transactions)) {
    if (tx.date) months.add(inferTransactionPeriod(tx));
  }
  months.add(toPeriodKey());

  const results = [];
  for (const mk of [...months].sort()) {
    const row = await getOrCreateActivePeriod(userId, mk, transactions);
    results.push(row);
  }

  const active = toPeriodKey(window.STATE?.period?.end || window.STATE?.selectedMonth);
  const allRows = await db.monthly_periods.where('user_id').equals(userId).toArray();
  for (const r of allRows) {
    if (r.period !== active && r.status === 'active' && months.has(r.period)) {
      const pastEnd = periodDateRange(r.period).end;
      const today = new Date().toISOString().slice(0, 10);
      if (pastEnd < today.slice(0, 10)) {
        await db.monthly_periods.update(r.id, { status: 'closed', updated_at: new Date().toISOString() });
      }
    }
  }

  return results;
}

/**
 * @param {string} periodId
 * @param {object} allocation
 * @param {object[]} transactions
 * @returns {Promise<{ success: boolean, period?: object, error?: string }>}
 */
export async function closePeriod(periodId, allocation, transactions) {
  const db = await getDb();
  const row = await db.monthly_periods.get(periodId);
  if (!row) return { success: false, error: 'Periode tidak ditemukan' };
  if (row.status === 'closed') return { success: false, error: 'Periode sudah ditutup' };

  const refreshed = refreshPeriodTotals(row, transactions);
  const closed = {
    ...refreshed,
    status: 'closed',
    closed_at: new Date().toISOString(),
    carry_over_allocated: allocation || {},
    report_payload: {
      ...(refreshed.report_payload || {}),
      closedSummary: {
        income: refreshed.total_income,
        expense: refreshed.total_expense,
        net: refreshed.closing_balance - refreshed.opening_balance,
        allocation,
      },
    },
    updated_at: new Date().toISOString(),
    _sync_status: 'pending',
  };

  await db.monthly_periods.put(closed);

  const userId = row.user_id;
  const [y, m] = row.period.split('-').map(Number);
  const next = new Date(y, m, 1);
  const nextKey = toPeriodKey(next);
  await getOrCreateActivePeriod(userId, nextKey, []);

  if (window.STATE?.monthlyPeriods) {
    window.STATE.monthlyPeriods[row.period] = closed;
  }

  try {
    const supa = window.STATE?.db?.supa;
    if (supa && userId) {
      await supa.from('monthly_periods').upsert({
        id: closed.server_id || closed.id,
        user_id: userId,
        period: closed.period,
        opening_balance: closed.opening_balance,
        total_income: closed.total_income,
        total_expense: closed.total_expense,
        closing_balance: closed.closing_balance,
        status: 'closed',
        closed_at: closed.closed_at,
        carry_over_allocated: closed.carry_over_allocated,
        report_payload: closed.report_payload,
        updated_at: closed.updated_at,
      }, { onConflict: 'user_id,period' });
    }
  } catch (e) {
    console.warn('[monthly-period] close sync', e);
  }

  return { success: true, period: closed };
}

/**
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function listClosedPeriods(userId) {
  const db = await getDb();
  const rows = await db.monthly_periods.where('user_id').equals(userId).toArray();
  return rows
    .filter((r) => r.status === 'closed')
    .sort((a, b) => String(b.period).localeCompare(String(a.period)));
}

/**
 * Stamp period field on transaction objects (client-side).
 * @param {object} tx
 * @returns {object}
 */
export function stampTransactionPeriod(tx) {
  if (!tx) return tx;
  return { ...tx, period: inferTransactionPeriod(tx) };
}

/**
 * Load periods from Supabase into IndexedDB.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function pullPeriodsFromSupabase(userId) {
  const supa = window.STATE?.db?.supa;
  if (!supa || !userId) return 0;
  const db = await getDb();
  const { data, error } = await supa
    .from('monthly_periods')
    .select('*')
    .eq('user_id', userId)
    .order('period', { ascending: false });
  if (error || !data?.length) return 0;

  for (const row of data) {
    await db.monthly_periods.put({
      ...row,
      id: row.id,
      server_id: row.id,
      amount: undefined,
      _sync_status: 'synced',
    });
    if (window.STATE) {
      if (!window.STATE.monthlyPeriods) window.STATE.monthlyPeriods = {};
      window.STATE.monthlyPeriods[row.period] = row;
    }
  }
  return data.length;
}

/**
 * @param {object} state
 * @returns {object|null}
 */
export function getActivePeriodFromState(state = window.STATE) {
  const key = state?.activePeriodKey
    || toPeriodKey(state?.period?.end || state?.selectedMonth);
  return state?.monthlyPeriods?.[key] || null;
}

/**
 * Category breakdown for a period.
 * @param {object[]} transactions
 * @param {string} period
 * @returns {{ category: string, amount: number }[]}
 */
export function computePeriodCategoryBreakdown(transactions, period) {
  const { start, end } = periodDateRange(period);
  const map = new Map();
  for (const tx of dedupeTransactions(transactions)) {
    if (!isConsumptionExpense(tx)) continue;
    const d = String(tx.date || '').slice(0, 10);
    if (d < start || d > end) continue;
    const cat = tx.category || 'Lainnya';
    map.set(cat, (map.get(cat) || 0) + Math.abs(Number(tx.amount || 0)));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

if (typeof window !== 'undefined') {
  window.monefyiMonthlyPeriod = {
    toPeriodKey,
    periodDateRange,
    computePeriodTotals,
    getOrCreateActivePeriod,
    backfillPeriodsFromTransactions,
    closePeriod,
    listClosedPeriods,
    refreshPeriodTotals,
    getActivePeriodFromState,
    computePeriodCategoryBreakdown,
    pullPeriodsFromSupabase,
  };
}
