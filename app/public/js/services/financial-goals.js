/**
 * Financial goals — multi-goal tracker with progress & ETA.
 * Uses financial_goals table; falls back to financial_targets for legacy data.
 * @module services/financial-goals
 */

import { computeTargetStats } from './financial-targets.js';

const CACHE_KEY = 'financial_goals_';

function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

function getSupa() {
  return window.STATE?.db?.supa || null;
}

/**
 * @param {object} goal
 * @returns {object}
 */
export function enrichGoal(goal) {
  const stats = computeTargetStats({
    target_amount: goal.target_amount,
    current_amount: goal.current_amount,
    monthly_contribution: goal.monthly_contribution,
    target_date: goal.target_date,
  });
  return { ...goal, stats };
}

/**
 * @param {object[]} goals
 */
function setStateGoals(goals) {
  if (!window.STATE?.db) return;
  window.STATE.db.financialGoals = goals;
  const primary = goals.find((g) => g.is_primary && g.status === 'active')
    || goals.find((g) => g.status === 'active')
    || goals[0]
    || null;
  window.STATE.db.primaryGoalDisplay = primary ? enrichGoal(primary) : null;
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadFinancialGoals() {
  const uid = getUserId();
  if (!uid) return [];

  try {
    const supa = getSupa();
    if (supa && navigator.onLine !== false) {
      const { data, error } = await supa
        .from('financial_goals')
        .select('*')
        .eq('user_id', uid)
        .neq('status', 'achieved')
        .order('is_primary', { ascending: false })
        .order('priority', { ascending: true });
      if (!error && Array.isArray(data) && data.length) {
        setStateGoals(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('[financial-goals] remote load', e);
  }

  const { loadFinancialTargets } = await import('./financial-targets.js');
  const legacy = await loadFinancialTargets();
  const mapped = legacy.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    name: t.name,
    icon: '🎯',
    color: '#10b981',
    target_amount: t.target_amount,
    current_amount: t.current_amount,
    target_date: t.target_date,
    priority: 1,
    status: Number(t.current_amount) >= Number(t.target_amount) ? 'achieved' : 'active',
    linked_category_id: t.category_link,
    monthly_contribution: t.monthly_contribution,
    is_primary: t.is_primary,
  }));
  setStateGoals(mapped);
  return mapped;
}

/**
 * @param {object} input
 * @returns {Promise<object|null>}
 */
export async function saveFinancialGoal(input) {
  const uid = getUserId();
  if (!uid) return null;

  const row = {
    user_id: uid,
    name: String(input.name || '').trim(),
    icon: input.icon || '🎯',
    color: input.color || '#10b981',
    target_amount: Number(input.target_amount) || 0,
    current_amount: Number(input.current_amount) || 0,
    target_date: input.target_date || null,
    priority: Number(input.priority) || 1,
    status: input.status || 'active',
    linked_category_id: input.linked_category_id || null,
    monthly_contribution: input.monthly_contribution != null
      ? Number(input.monthly_contribution)
      : null,
    is_primary: !!input.is_primary,
    updated_at: new Date().toISOString(),
  };

  if (!row.name || row.target_amount <= 0) throw new Error('Nama dan nominal target wajib diisi');

  const supa = getSupa();
  let saved = null;

  if (input.id && supa) {
    const { data, error } = await supa
      .from('financial_goals')
      .update(row)
      .eq('id', input.id)
      .eq('user_id', uid)
      .select('*')
      .single();
    if (error) throw error;
    saved = data;
  } else if (supa) {
    const { data, error } = await supa
      .from('financial_goals')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    saved = data;
  } else {
    saved = { id: input.id || crypto.randomUUID(), ...row, created_at: new Date().toISOString() };
  }

  await loadFinancialGoals();
  return saved;
}

/**
 * Sync goal progress from linked category transactions.
 * @param {string} goalId
 * @param {object[]} [transactions]
 */
export async function syncGoalFromTransactions(goalId, transactions = window.STATE?.transactions || []) {
  const goals = window.STATE?.db?.financialGoals || [];
  const goal = goals.find((g) => g.id === goalId);
  if (!goal?.linked_category_id) return null;

  const month = window.STATE?.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const cat = String(goal.linked_category_id).toLowerCase();
  const spent = transactions
    .filter((t) => t.type === 'expense' && String(t.category || '').toLowerCase().includes(cat))
    .filter((t) => String(t.date || '').startsWith(month))
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  if (spent <= Number(goal.current_amount || 0)) return goal;

  return saveFinancialGoal({
    ...goal,
    current_amount: spent,
  });
}

/**
 * @returns {object|null}
 */
export function getPrimaryGoal() {
  return window.STATE?.db?.primaryGoalDisplay
    || window.STATE?.db?.primaryTargetDisplay
    || null;
}

if (typeof window !== 'undefined') {
  window.monefyiFinancialGoals = {
    loadFinancialGoals,
    saveFinancialGoal,
    syncGoalFromTransactions,
    getPrimaryGoal,
    enrichGoal,
  };
}
