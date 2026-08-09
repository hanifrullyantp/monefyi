/**
 * Debt Supabase store — sync with local debt-payoff-planner cache.
 * @module services/debt-store
 */

const LS_DEBTS = 'monefyi_debts';

function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {object} row
 * @returns {object}
 */
function mapFromRemote(row) {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.current_balance),
    original_amount: Number(row.original_amount),
    min_payment: Number(row.minimum_payment),
    interest_rate: Number(row.interest_rate),
    due_date_day: row.due_date_day,
    status: row.status,
    priority_order: row.priority_order,
    source: 'remote',
  };
}

/**
 * @param {object} d
 * @returns {object}
 */
function mapToRemote(d) {
  return {
    name: d.name,
    original_amount: Number(d.original_amount ?? d.balance ?? 0),
    current_balance: Number(d.balance ?? d.current_balance ?? 0),
    minimum_payment: Number(d.min_payment ?? d.minimum_payment ?? 0),
    interest_rate: Number(d.interest_rate ?? 0),
    due_date_day: d.due_date_day ?? null,
    status: d.status || 'active',
    priority_order: Number(d.priority_order ?? 1),
    updated_at: new Date().toISOString(),
  };
}

/**
 * @param {object[]} rows
 */
export function cacheDebtsLocally(rows) {
  localStorage.setItem(LS_DEBTS, JSON.stringify(rows));
  if (window.STATE?.db) window.STATE.db.debts = rows;
}

/**
 * @returns {Promise<object[]>}
 */
export async function syncDebtsFromRemote() {
  const uid = userId();
  const client = supa();
  if (!uid || !client) return [];

  try {
    const { data, error } = await client
      .from('debts')
      .select('*')
      .eq('user_id', uid)
      .neq('status', 'paid')
      .order('priority_order', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map(mapFromRemote);
    if (mapped.length) {
      cacheDebtsLocally(mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[debt-store] sync', e);
  }
  return [];
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function upsertDebtRemote(input) {
  const uid = userId();
  const client = supa();
  const payload = { ...mapToRemote(input), user_id: uid };

  if (client && uid) {
    if (input.id && !String(input.id).startsWith('debt_')) {
      const { data, error } = await client
        .from('debts')
        .update(payload)
        .eq('id', input.id)
        .eq('user_id', uid)
        .select('*')
        .single();
      if (error) throw error;
      await syncDebtsFromRemote();
      return mapFromRemote(data);
    }
    const { data, error } = await client
      .from('debts')
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    await syncDebtsFromRemote();
    return mapFromRemote(data);
  }

  const { upsertDebt } = await import('./debt-payoff-planner.js');
  return upsertDebt(input);
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDebtRemote(id) {
  const uid = userId();
  const client = supa();
  if (client && uid && id && !String(id).startsWith('debt_')) {
    await client.from('debts').delete().eq('id', id).eq('user_id', uid);
    await syncDebtsFromRemote();
    return;
  }
  const { deleteDebt } = await import('./debt-payoff-planner.js');
  deleteDebt(id);
}

if (typeof window !== 'undefined') {
  window.monefyiDebtStore = {
    syncDebtsFromRemote,
    upsertDebtRemote,
    deleteDebtRemote,
    cacheDebtsLocally,
  };
}
