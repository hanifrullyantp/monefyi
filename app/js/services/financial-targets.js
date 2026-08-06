/**
 * Financial targets — CRUD, progress, ETA, savings sync.
 * @module services/financial-targets
 */

import { NEAR_TERM_GOALS } from './onboarding-plan-generator.js';
import { computeAvgMonthlyExpense } from './budget-focus-mode.js';

const CACHE_KEY_PREFIX = 'financial_targets_';

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
 * @param {object[]} targets
 */
function setStateTargets(targets) {
  if (!window.STATE?.db) return;
  window.STATE.db.financialTargets = targets;
  const primary = targets.find((t) => t.is_primary) || targets[0] || null;
  window.STATE.db.primaryTargetDisplay = primary ? enrichTarget(primary) : null;
}

/**
 * @param {object} target
 * @returns {object}
 */
export function computeTargetStats(target) {
  const targetAmount = Number(target.target_amount || 0);
  const current = Number(target.current_amount || 0);
  const pct = targetAmount > 0 ? Math.min(100, Math.round((current / targetAmount) * 100)) : 0;
  const remaining = Math.max(0, targetAmount - current);
  const monthly = Number(target.monthly_contribution || 0);
  const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const etaDate = monthsLeft
    ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsLeft, 1)
    : (target.target_date ? new Date(target.target_date) : null);

  const boost = 200000;
  const boostedMonthly = monthly + boost;
  const monthsBoosted = boostedMonthly > 0 && remaining > 0
    ? Math.ceil(remaining / boostedMonthly)
    : null;
  const etaBoosted = monthsBoosted
    ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsBoosted, 1)
    : null;

  return {
    pct,
    current,
    targetAmount,
    remaining,
    monthly,
    monthsLeft,
    etaDate,
    etaLabel: etaDate
      ? etaDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : null,
    boostMonthly: boost,
    etaBoostedLabel: etaBoosted
      ? etaBoosted.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      : null,
  };
}

/**
 * @param {object} target
 * @returns {object}
 */
export function enrichTarget(target) {
  const stats = computeTargetStats(target);
  return { ...target, stats };
}

/**
 * @param {string} userId
 * @param {object[]} targets
 */
async function cacheLocal(userId, targets) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    await db.app_state.put({ key: `${CACHE_KEY_PREFIX}${userId}`, value: targets });
  } catch (e) {
    console.warn('[financial-targets] cache', e);
  }
}

/**
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function loadLocal(userId) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(`${CACHE_KEY_PREFIX}${userId}`);
    return row?.value || [];
  } catch {
    return [];
  }
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadFinancialTargets() {
  const uid = getUserId();
  if (!uid) return [];

  try {
    const supa = getSupa();
    if (supa && navigator.onLine !== false) {
      const { data, error } = await supa
        .from('financial_targets')
        .select('*')
        .eq('user_id', uid)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        await cacheLocal(uid, data);
        setStateTargets(data);
        if (!data.length) await seedDefaultTargetFromPrefs();
        return window.STATE?.db?.financialTargets || data;
      }
    }
  } catch (e) {
    console.warn('[financial-targets] load remote', e);
  }

  const local = await loadLocal(uid);
  setStateTargets(local);
  if (!local.length) await seedDefaultTargetFromPrefs();
  return window.STATE?.db?.financialTargets || local;
}

/**
 * Seed primary target from onboarding answers when none exist.
 * @returns {Promise<object|null>}
 */
export async function seedDefaultTargetFromPrefs() {
  const uid = getUserId();
  const prefs = window.STATE?.db?.userPreferences;
  if (!uid || !prefs?.near_term_goal) return null;

  const txs = window.STATE?.transactions || [];
  let name = 'Target Finansial';
  let targetAmount = 10000000;
  let monthly = 500000;

  switch (prefs.near_term_goal) {
    case 'emergency_fund_3mo': {
      name = 'Dana Darurat';
      const avg = computeAvgMonthlyExpense(txs, 3) || Number(prefs.monthly_income || 0) * 0.6;
      targetAmount = Math.max(1000000, Math.round(avg * 3));
      monthly = Math.max(100000, Math.round(targetAmount / 12));
      break;
    }
    case 'pay_off_debt':
      name = prefs.debt_name ? `Lunas ${prefs.debt_name}` : 'Bebas Utang';
      targetAmount = Math.max(1000000, Number(prefs.debt_amount || 0));
      monthly = Math.max(500000, Math.round(targetAmount / 24));
      break;
    case 'start_investing':
      name = 'Investasi Rutin';
      targetAmount = Math.max(5000000, Number(prefs.monthly_income || 0) * 6);
      monthly = Math.max(200000, Math.round(Number(prefs.monthly_income || 0) * 0.1));
      break;
    case 'vacation_no_debt':
      name = 'Liburan Tanpa Utang';
      targetAmount = 15000000;
      monthly = 1000000;
      break;
    case 'safe_until_payday':
      name = 'Buffer Sampai Gajian';
      targetAmount = Math.max(500000, Number(prefs.monthly_income || 0) * 0.15);
      monthly = Math.max(100000, Math.round(targetAmount / 6));
      break;
    case 'custom':
      name = prefs.near_term_goal_custom || 'Target Pribadi';
      targetAmount = Math.max(1000000, Number(prefs.monthly_income || 0));
      monthly = Math.max(100000, Math.round(targetAmount / 12));
      break;
    default: {
      const meta = NEAR_TERM_GOALS.find((g) => g.id === prefs.near_term_goal);
      name = meta?.label || name;
    }
  }

  return saveFinancialTarget({
    name,
    target_amount: targetAmount,
    current_amount: 0,
    monthly_contribution: monthly,
    is_primary: true,
  });
}

/**
 * @param {object} input
 * @returns {Promise<object|null>}
 */
export async function saveFinancialTarget(input) {
  const uid = getUserId();
  if (!uid) return null;

  const row = {
    user_id: uid,
    name: String(input.name || '').trim(),
    target_amount: Number(input.target_amount) || 0,
    current_amount: Number(input.current_amount) || 0,
    target_date: input.target_date || null,
    monthly_contribution: input.monthly_contribution != null
      ? Number(input.monthly_contribution)
      : null,
    is_primary: !!input.is_primary,
    category_link: input.category_link || null,
    updated_at: new Date().toISOString(),
  };

  if (!row.name || row.target_amount <= 0) throw new Error('Nama dan nominal target wajib diisi');

  const supa = getSupa();
  let saved = null;

  if (input.id) {
    if (supa) {
      const { data, error } = await supa
        .from('financial_targets')
        .update(row)
        .eq('id', input.id)
        .eq('user_id', uid)
        .select('*')
        .single();
      if (error) throw error;
      saved = data;
    }
  } else if (supa) {
    const { data, error } = await supa
      .from('financial_targets')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    saved = data;
  } else {
    saved = { id: `tgt_${crypto.randomUUID()}`, ...row, created_at: new Date().toISOString() };
  }

  if (saved?.is_primary) {
    await setPrimaryTarget(saved.id, { skipReload: true });
  }

  await loadFinancialTargets();
  return saved;
}

/**
 * @param {string} targetId
 * @param {object} [opts]
 */
export async function setPrimaryTarget(targetId, opts = {}) {
  const uid = getUserId();
  const supa = getSupa();
  if (!uid || !supa) return;

  await supa.from('financial_targets').update({ is_primary: false }).eq('user_id', uid);
  await supa.from('financial_targets').update({ is_primary: true }).eq('id', targetId).eq('user_id', uid);

  if (!opts.skipReload) await loadFinancialTargets();
}

/**
 * @returns {object|null}
 */
export function getPrimaryTarget() {
  const targets = window.STATE?.db?.financialTargets || [];
  const primary = targets.find((t) => t.is_primary) || targets[0];
  return primary ? enrichTarget(primary) : window.STATE?.db?.primaryTargetDisplay || null;
}

/**
 * @param {object} tx
 * @returns {number}
 */
export function inferSavingsContribution(tx) {
  const type = String(tx.type || '').toLowerCase();
  const cat = String(tx.category || tx.merchant || '').toLowerCase();
  const amt = Number(tx.amount || 0);
  if (amt <= 0) return 0;

  if (type === 'income' || type === 'pemasukan') {
    if (/tabung|simpan|darurat|invest|nabung/.test(cat)) return amt;
  }
  if ((type === 'expense' || type === 'pengeluaran') && /tabung|simpan|darurat/.test(cat)) {
    return amt;
  }
  return 0;
}

/**
 * Apply savings tx to primary target current_amount.
 * @param {object} tx
 * @returns {Promise<object|null>}
 */
export async function applySavingsContribution(tx) {
  const contribution = inferSavingsContribution(tx);
  if (contribution <= 0) return null;

  const primary = getPrimaryTarget();
  if (!primary?.id) return null;

  const newCurrent = Math.min(
    Number(primary.target_amount),
    Number(primary.current_amount || 0) + contribution,
  );

  const supa = getSupa();
  const uid = getUserId();
  if (supa && uid && !String(primary.id).startsWith('tgt_')) {
    await supa.from('financial_targets').update({
      current_amount: newCurrent,
      updated_at: new Date().toISOString(),
    }).eq('id', primary.id).eq('user_id', uid);
  }

  const targets = (window.STATE?.db?.financialTargets || []).map((t) => (
    t.id === primary.id ? { ...t, current_amount: newCurrent } : t
  ));
  setStateTargets(targets);
  return getPrimaryTarget();
}

/**
 * Build target stats snapshot for impact diff.
 * @param {object} [state]
 * @returns {object|null}
 */
export function getPrimaryTargetStatsFromState(state = window.STATE) {
  const t = state?.db?.primaryTargetDisplay
    || (state?.db?.financialTargets || []).find((x) => x.is_primary);
  return t ? computeTargetStats(t) : null;
}

if (typeof window !== 'undefined') {
  window.__monefyiFinancialTargets = {
    loadFinancialTargets,
    getPrimaryTarget,
    saveFinancialTarget,
    applySavingsContribution,
  };
}
