/**
 * First-week plan CRUD, auto-complete detection, home checklist support.
 * @module services/first-week-plan
 */

import { generateFirstWeekPlan } from './onboarding-plan-generator.js';

const CACHE_KEY_PREFIX = 'first_week_plan_';
const PLAN_DURATION_DAYS = 7;

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function getSupa() {
  return window.STATE?.db?.supa || null;
}

/**
 * @param {object} plan
 */
function setStatePlan(plan) {
  if (window.STATE?.db) window.STATE.db.firstWeekPlan = plan;
}

/**
 * @param {object} plan
 * @param {string} userId
 */
async function cachePlanLocal(userId, plan) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    await db.app_state.put({ key: `${CACHE_KEY_PREFIX}${userId}`, value: plan });
  } catch (e) {
    console.warn('[first-week-plan] cache', e);
  }
}

/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function loadPlanLocal(userId) {
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
 * @param {object} plan
 * @returns {boolean}
 */
export function isPlanActive(plan) {
  if (!plan || plan.completed_at) return false;
  const started = new Date(plan.started_at || plan.created_at || Date.now());
  const now = new Date();
  const days = Math.floor((now - started) / 86400000);
  return days < PLAN_DURATION_DAYS;
}

/**
 * Current calendar day index (1–7) within plan.
 * @param {object} plan
 * @returns {number}
 */
export function getPlanDayIndex(plan) {
  if (!plan?.started_at) return 1;
  const started = new Date(plan.started_at);
  const now = new Date();
  const days = Math.floor((now - started) / 86400000);
  return Math.min(PLAN_DURATION_DAYS, Math.max(1, days + 1));
}

/**
 * @param {object} plan
 * @returns {number}
 */
export function countCompletedTasks(plan) {
  return (plan?.tasks || []).filter((t) => t.completed).length;
}

/**
 * Save plan from onboarding prefs.
 * @param {object} prefsInput
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function createFirstWeekPlan(prefsInput) {
  const uid = getUserId();
  if (!uid) return { success: false, error: 'Not authenticated' };

  const tasks = generateFirstWeekPlan(prefsInput);
  const now = new Date().toISOString();
  const row = {
    user_id: uid,
    started_at: now,
    completed_at: null,
    tasks,
    source_problems: prefsInput.financial_problems || [],
    updated_at: now,
  };

  try {
    const supa = getSupa();
    if (supa) {
      const { data, error } = await supa.from('first_week_plans').upsert(row, { onConflict: 'user_id' }).select('*').single();
      if (error) throw error;
      setStatePlan(data);
      await cachePlanLocal(uid, data);
      return { success: true, data };
    }
  } catch (e) {
    console.warn('[first-week-plan] save remote failed', e);
  }

  setStatePlan(row);
  await cachePlanLocal(uid, row);
  return { success: true, data: row };
}

/**
 * Load active plan.
 * @returns {Promise<object|null>}
 */
export async function loadFirstWeekPlan() {
  const uid = getUserId();
  if (!uid) return null;

  try {
    const supa = getSupa();
    if (supa && navigator.onLine !== false) {
      const { data, error } = await supa.from('first_week_plans').select('*').eq('user_id', uid).maybeSingle();
      if (!error && data) {
        setStatePlan(data);
        await cachePlanLocal(uid, data);
        return data;
      }
    }
  } catch (e) {
    console.warn('[first-week-plan] load remote', e);
  }

  const local = await loadPlanLocal(uid);
  if (local) setStatePlan(local);
  return local;
}

/**
 * Get plan from STATE or load.
 * @returns {Promise<object|null>}
 */
export async function getActivePlan() {
  const existing = window.STATE?.db?.firstWeekPlan;
  if (existing && isPlanActive(existing)) return existing;
  const loaded = await loadFirstWeekPlan();
  if (loaded && isPlanActive(loaded)) return loaded;
  return null;
}

/**
 * Persist updated tasks.
 * @param {object} plan
 */
async function persistPlan(plan) {
  const uid = getUserId();
  if (!uid || !plan) return;

  const tasks = plan.tasks || [];
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
  const patch = {
    user_id: uid,
    tasks,
    completed_at: allDone ? (plan.completed_at || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };

  plan.completed_at = patch.completed_at;
  setStatePlan(plan);
  await cachePlanLocal(uid, plan);

  try {
    const supa = getSupa();
    if (supa) {
      await supa.from('first_week_plans').upsert({ ...plan, ...patch }, { onConflict: 'user_id' });
    }
  } catch (e) {
    console.warn('[first-week-plan] persist', e);
  }
}

/**
 * Mark a task complete by id.
 * @param {string} taskId
 * @returns {Promise<object|null>}
 */
export async function markTaskComplete(taskId) {
  const plan = await getActivePlan();
  if (!plan) return null;

  let changed = false;
  plan.tasks = (plan.tasks || []).map((t) => {
    if (t.id === taskId && !t.completed) {
      changed = true;
      return { ...t, completed: true, completed_at: new Date().toISOString() };
    }
    return t;
  });

  if (changed) await persistPlan(plan);
  return changed ? plan : null;
}

/**
 * Auto-complete detectors keyed by auto_key.
 * @param {string} autoKey
 * @param {object} [ctx]
 * @returns {boolean}
 */
function checkAutoKey(autoKey, ctx = {}) {
  const state = window.STATE || {};
  const today = new Date().toISOString().slice(0, 10);
  const txs = state.transactions || [];

  switch (autoKey) {
    case 'add_fixed_bills': {
      const period = state.selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const rows = state.budgetsByMonth?.[period]?.categories?.rows || [];
      const harus = rows.filter((r) => r.priority === 'harus' || !r.priority);
      const prefs = state.db?.userPreferences;
      const seeded = (prefs?.fixed_bills || []).length > 0;
      return harus.length > 0 || seeded;
    }
    case 'log_today_spending':
      return txs.some((t) => {
        if (t.date !== today) return false;
        const type = String(t.type || 'expense').toLowerCase();
        return type === 'expense' || type === 'pengeluaran' || type === 'out';
      });
    case 'view_top_categories':
      return !!ctx.openedAdvisor;
    case 'set_daily_limit':
      return !!ctx.openedBudget;
    case 'review_spending':
      return !!ctx.openedTransactions;
    case 'first_saving': {
      const simpanTx = txs.some((t) => {
        const cat = String(t.category || '').toLowerCase();
        const type = String(t.type || '').toLowerCase();
        return (type === 'income' || type === 'pemasukan') && (
          cat.includes('tabung') || cat.includes('simpan') || cat.includes('invest')
        );
      });
      const period = state.selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const rows = state.budgetsByMonth?.[period]?.categories?.rows || [];
      const simpanBudget = rows.some((r) => r.priority === 'simpan' && Number(r.amount) > 0);
      return simpanTx || simpanBudget;
    }
    case 'open_monevisor':
      return !!ctx.openedAdvisor;
    default:
      return false;
  }
}

/**
 * Evaluate and auto-complete pending tasks.
 * @param {object} [ctx]
 * @returns {Promise<object|null>}
 */
export async function evaluateAutoComplete(ctx = {}) {
  const plan = await getActivePlan();
  if (!plan) return null;

  let changed = false;
  plan.tasks = (plan.tasks || []).map((t) => {
    if (t.completed || !t.auto_key) return t;
    if (checkAutoKey(t.auto_key, ctx)) {
      changed = true;
      return { ...t, completed: true, completed_at: new Date().toISOString() };
    }
    return t;
  });

  if (changed) await persistPlan(plan);
  return plan;
}

/**
 * Deep link target for a task auto_key.
 * @param {string} autoKey
 * @returns {string}
 */
export function getTaskActionTarget(autoKey) {
  const map = {
    add_fixed_bills: 'budget',
    log_today_spending: 'add_tx',
    view_top_categories: 'advisor',
    set_daily_limit: 'budget',
    review_spending: 'transactions',
    first_saving: 'budget',
    open_monevisor: 'advisor',
  };
  return map[autoKey] || 'home';
}

if (typeof window !== 'undefined') {
  window.__monefyiFirstWeekPlan = {
    createFirstWeekPlan,
    loadFirstWeekPlan,
    getActivePlan,
    evaluateAutoComplete,
    markTaskComplete,
    isPlanActive,
    getPlanDayIndex,
    countCompletedTasks,
    getTaskActionTarget,
  };
}
