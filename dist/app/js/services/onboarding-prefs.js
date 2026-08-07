/**
 * Persist onboarding diagnostic answers to Supabase user_preferences.
 * @module services/onboarding-prefs
 */

/**
 * @typedef {object} OnboardingPrefsInput
 * @property {string[]} [financial_problems]
 * @property {number|null} [payday_day]
 * @property {boolean} [payday_irregular]
 * @property {{ id?: string, name: string, amount: number }[]} [fixed_bills]
 * @property {boolean} [has_debt]
 * @property {number|null} [debt_amount]
 * @property {string|null} [debt_name]
 * @property {string|null} [near_term_goal]
 * @property {string|null} [near_term_goal_custom]
 * @property {number|null} [monthly_income]
 * @property {string|null} [income_source]
 * @property {string} [budget_focus_mode]
 * @property {string} [home_view_mode]
 */

const CACHE_KEY_PREFIX = 'user_prefs_';

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function getSupa() {
  return window.STATE?.db?.supa || null;
}

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * Normalize prefs payload for DB.
 * @param {OnboardingPrefsInput} input
 * @returns {object}
 */
export function normalizePrefsPayload(input = {}) {
  const bills = (input.fixed_bills || []).map((b, i) => ({
    id: b.id || `bill_${i}_${Date.now()}`,
    name: String(b.name || '').trim(),
    amount: Number(b.amount) || 0,
  })).filter((b) => b.name && b.amount > 0);

  return {
    financial_problems: Array.isArray(input.financial_problems) ? [...input.financial_problems] : [],
    payday_day: input.payday_irregular ? null : (Number(input.payday_day) || null),
    payday_irregular: !!input.payday_irregular,
    fixed_bills: bills,
    has_debt: !!input.has_debt,
    debt_amount: input.has_debt ? (Number(input.debt_amount) || null) : null,
    debt_name: input.has_debt ? String(input.debt_name || '').trim() || null : null,
    near_term_goal: input.near_term_goal || null,
    near_term_goal_custom: input.near_term_goal === 'custom'
      ? String(input.near_term_goal_custom || '').trim() || null
      : null,
    monthly_income: Number(input.monthly_income) || null,
    income_source: input.income_source || null,
    budget_focus_mode: input.budget_focus_mode || undefined,
    home_view_mode: input.home_view_mode || undefined,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Cache prefs locally for offline.
 * @param {string} userId
 * @param {object} prefs
 */
async function cachePrefsLocal(userId, prefs) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    await db.app_state.put({ key: `${CACHE_KEY_PREFIX}${userId}`, value: prefs });
  } catch (e) {
    console.warn('[onboarding-prefs] cache', e);
  }
}

/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function loadPrefsLocal(userId) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(`${CACHE_KEY_PREFIX}${userId}`);
    return row?.value || null;
  } catch {
    return null;
  }
}

/**
 * Save user preferences to Supabase.
 * @param {OnboardingPrefsInput} input
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function saveUserPreferences(input) {
  const uid = getUserId();
  if (!uid) return { success: false, error: 'Not authenticated' };

  const payload = normalizePrefsPayload(input);
  if (payload.budget_focus_mode === undefined) {
    delete payload.budget_focus_mode;
  }
  if (payload.home_view_mode === undefined) {
    delete payload.home_view_mode;
  }
  const row = { user_id: uid, ...payload };

  try {
    const supa = getSupa();
    if (supa) {
      const { data, error } = await supa.from('user_preferences').upsert(row, { onConflict: 'user_id' }).select('*').single();
      if (error) throw error;
      await cachePrefsLocal(uid, data);
      if (window.STATE?.db) window.STATE.db.userPreferences = data;
      return { success: true, data };
    }
  } catch (e) {
    console.warn('[onboarding-prefs] save remote failed, caching local', e);
  }

  await cachePrefsLocal(uid, row);
  if (window.STATE?.db) window.STATE.db.userPreferences = row;
  return { success: true, data: row };
}

/**
 * Load user preferences (remote with local fallback).
 * @returns {Promise<object|null>}
 */
export async function loadUserPreferences() {
  const uid = getUserId();
  if (!uid) return null;

  try {
    const supa = getSupa();
    if (supa && navigator.onLine !== false) {
      const { data, error } = await supa.from('user_preferences').select('*').eq('user_id', uid).maybeSingle();
      if (!error && data) {
        await cachePrefsLocal(uid, data);
        if (window.STATE?.db) window.STATE.db.userPreferences = data;
        return data;
      }
    }
  } catch (e) {
    console.warn('[onboarding-prefs] load remote', e);
  }

  const local = await loadPrefsLocal(uid);
  if (local && window.STATE?.db) window.STATE.db.userPreferences = local;
  return local;
}

/**
 * Seed fixed bills from onboarding into budget (harus priority).
 * @param {OnboardingPrefsInput} input
 * @returns {Promise<number>} rows added
 */
export async function seedFixedBillsToBudget(input) {
  const bills = normalizePrefsPayload(input).fixed_bills;
  if (!bills.length) return 0;

  const { createBudgetRow } = await import('./budget-model.js');
  const { saveBudgetRowsLocal } = await import('./data-store.js');

  const period = window.STATE?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const existing = window.STATE?.budgetsByMonth?.[period]?.categories?.rows || [];
  const existingNames = new Set(existing.map((r) => String(r.name || '').toLowerCase()));

  const newRows = bills
    .filter((b) => !existingNames.has(b.name.toLowerCase()))
    .map((b) => createBudgetRow({
      name: b.name,
      amount: b.amount,
      priority: 'harus',
      items: [{ name: b.name, qty: 1, price: b.amount }],
    }));

  if (!newRows.length) return 0;

  const merged = [...existing.map((r) => ({ ...r })), ...newRows];
  const income = Number(input.monthly_income) || Number(window.STATE?.budgetsByMonth?.[period]?.income) || 0;
  await saveBudgetRowsLocal(period, income, merged);

  if (typeof window.saveBudgetMonth === 'function') {
    try {
      const { serializeBudgetRows } = await import('./budget-model.js');
      await window.saveBudgetMonth(period, income, { rows: serializeBudgetRows(merged) });
    } catch (e) { console.warn('[onboarding-prefs] saveBudgetMonth', e); }
  }

  return newRows.length;
}

/**
 * Map near_term_goal to monevisor primary_goal.
 * @param {string|null} goal
 * @returns {string}
 */
export function mapGoalToMonevisor(goal) {
  const map = {
    safe_until_payday: 'track',
    emergency_fund_3mo: 'save_more',
    pay_off_debt: 'pay_debt',
    start_investing: 'invest',
    vacation_no_debt: 'save_more',
    custom: 'track',
  };
  return map[goal] || 'track';
}

/**
 * Sync monevisor prefs from onboarding answers.
 * @param {OnboardingPrefsInput} input
 */
export async function syncMonevisorFromOnboarding(input) {
  const uid = getUserId();
  const supa = getSupa();
  if (!uid || !supa) return;

  const primaryGoal = mapGoalToMonevisor(input.near_term_goal);
  try {
    await supa.from('monevisor_prefs').upsert({
      user_id: uid,
      primary_goal: primaryGoal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[onboarding-prefs] monevisor sync', e);
  }
}

if (typeof window !== 'undefined') {
  window.__monefyiOnboardingPrefs = {
    saveUserPreferences,
    loadUserPreferences,
    seedFixedBillsToBudget,
    normalizePrefsPayload,
    syncMonevisorFromOnboarding,
  };
}
