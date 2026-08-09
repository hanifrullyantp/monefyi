/**
 * Pull shared household transactions from Supabase and merge into local STATE.
 * @module services/household-shared-sync
 */

import { loadHousehold } from './household-mode.js';
import { hasActiveHousehold, getTransactionVisibility } from './household-shared.js';

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

/**
 * @param {object} row
 * @returns {object}
 */
function normalizeRemoteTx(row) {
  return {
    ...row,
    amount: Math.abs(Number(row.amount) || 0),
    meta: row.meta || {},
    visibility: row.visibility || row.meta?.visibility || 'personal',
  };
}

/**
 * @param {object[]} incoming
 * @param {object[]} [existing]
 * @returns {object[]}
 */
export function mergeSharedTransactions(incoming = [], existing = window.STATE?.transactions || []) {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const row of incoming) {
    if (!row?.id) continue;
    const normalized = normalizeRemoteTx(row);
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, normalized);
      continue;
    }
    const prevUpdated = new Date(prev.updated_at || prev.created_at || 0).getTime();
    const nextUpdated = new Date(normalized.updated_at || normalized.created_at || 0).getTime();
    if (nextUpdated >= prevUpdated) byId.set(row.id, { ...prev, ...normalized });
  }
  return [...byId.values()].sort((a, b) => {
    const d = String(b.date || '').localeCompare(String(a.date || ''));
    if (d !== 0) return d;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

/**
 * @param {{ startDate?: string, endDate?: string }} [opts]
 * @returns {Promise<{ merged: number, total: number }>}
 */
export async function pullSharedTransactionsFromRemote(opts = {}) {
  if (!hasActiveHousehold() || !navigator.onLine) return { merged: 0, total: 0 };

  const client = supa();
  const hh = loadHousehold();
  if (!client || !hh?.id) return { merged: 0, total: 0 };

  const end = opts.endDate || window.STATE?.period?.end
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-31`;
  const start = opts.startDate || window.STATE?.period?.start
    || `${end.slice(0, 7)}-01`;

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('household_id', hh.id)
      .eq('visibility', 'shared')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[household-shared-sync] pull failed', error);
      return { merged: 0, total: 0 };
    }

    const remote = (data || []).filter((t) => getTransactionVisibility(t) === 'shared');
    const before = window.STATE?.transactions?.length || 0;
    const mergedList = mergeSharedTransactions(remote);
    if (window.STATE) window.STATE.transactions = mergedList;
    window.dataStore?.mirrorTransactionsBulk?.(mergedList).catch(() => {});
    return { merged: Math.max(0, mergedList.length - before), total: remote.length };
  } catch (e) {
    console.warn('[household-shared-sync]', e);
    return { merged: 0, total: 0 };
  }
}

/**
 * Show/hide Bersama nav items when household is active.
 */
export function updateHouseholdNavVisibility() {
  const show = hasActiveHousehold();
  document.querySelectorAll('[data-nav-household]').forEach((el) => {
    el.classList.toggle('hidden', !show);
    el.toggleAttribute('hidden', !show);
  });
}

if (typeof window !== 'undefined') {
  window.monefyiHouseholdSharedSync = {
    pullSharedTransactionsFromRemote,
    mergeSharedTransactions,
    updateHouseholdNavVisibility,
  };
}
