/**
 * Recurring fixed-bill schedules — auto pending + one-click confirm.
 * @module services/recurring-transactions
 */

import { inferCategoryType, CATEGORY_TYPES } from './budget-model.js';

const LS_SCHEDULES = 'monefyi_recurring_schedules';
const LS_PENDING = 'monefyi_recurring_pending';

/**
 * @returns {object[]}
 */
function loadSchedules() {
  try {
    return JSON.parse(localStorage.getItem(LS_SCHEDULES) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} rows
 */
function saveSchedules(rows) {
  localStorage.setItem(LS_SCHEDULES, JSON.stringify(rows));
}

/**
 * @returns {object[]}
 */
export function loadRecurringPending() {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} rows
 */
function saveRecurringPending(rows) {
  localStorage.setItem(LS_PENDING, JSON.stringify(rows));
}

/**
 * Sync schedules from fixed-bill budget rows.
 * @param {object} [state]
 */
export function syncSchedulesFromBudget(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const pack = state.budgetsByMonth?.[month];
  const rows = pack?.categories?.rows || pack?.rows || state.budgetDraft?.rows || [];
  const existing = loadSchedules();
  const map = new Map(existing.map((s) => [s.id, s]));

  for (const row of rows) {
    if (inferCategoryType(row) !== CATEGORY_TYPES.FIXED_BILL) continue;
    const day = parseDueDay(row);
    if (!day) continue;
    const id = `rec_${row.id || row.name}`;
    map.set(id, {
      id,
      budget_id: row.id,
      name: row.name,
      amount: Number(row.amount || 0),
      category: row.name,
      account: row.default_account || 'Cash',
      frequency: row.recurrence || 'monthly',
      due_day: day,
      priority: row.priority || 'harus',
      updated_at: new Date().toISOString(),
    });
  }

  saveSchedules([...map.values()]);
}

/**
 * @param {object} row
 * @returns {number|null}
 */
function parseDueDay(row) {
  if (row.due_day) return Math.min(31, Math.max(1, Number(row.due_day)));
  for (const item of row.items || []) {
    const d = item.target_date_day || item.due_day;
    if (d) return Math.min(31, Math.max(1, Number(d)));
    if (item.target_date) {
      const m = String(item.target_date).match(/^\d{4}-\d{2}-(\d{2})/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return null;
}

/**
 * Generate pending recurring transactions due today or overdue this month.
 * @param {Date} [now]
 * @returns {object[]}
 */
export function generateDueRecurring(now = new Date()) {
  syncSchedulesFromBudget();
  const schedules = loadSchedules();
  const pending = loadRecurringPending();
  const today = now.toISOString().slice(0, 10);
  const day = now.getDate();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const pendingKeys = new Set(pending.map((p) => `${p.schedule_id}_${p.month}`));

  for (const sch of schedules) {
    if (!sch.amount || sch.amount <= 0) continue;
    const dueDay = Number(sch.due_day);
    if (day < dueDay) continue;
    const key = `${sch.id}_${monthKey}`;
    if (pendingKeys.has(key)) continue;

    const alreadyPaid = (typeof window !== 'undefined' ? window.STATE?.transactions : [])?.some(
      (t) => t.type === 'expense'
        && String(t.date || '').startsWith(monthKey)
        && String(t.category || '').toLowerCase() === String(sch.category || '').toLowerCase()
        && Math.abs(Number(t.amount || 0)) >= sch.amount * 0.9,
    );
    if (alreadyPaid) continue;

    pending.push({
      id: `rp_${crypto.randomUUID()}`,
      schedule_id: sch.id,
      month: monthKey,
      name: sch.name,
      amount: sch.amount,
      category: sch.category,
      account: sch.account || 'Cash',
      due_date: `${monthKey}-${String(dueDay).padStart(2, '0')}`,
      status: 'pending',
      created_at: today,
    });
    pendingKeys.add(key);
  }

  saveRecurringPending(pending);
  return pending.filter((p) => p.status === 'pending');
}

/**
 * @returns {number}
 */
export function getRecurringPendingCount() {
  return loadRecurringPending().filter((p) => p.status === 'pending').length;
}

/**
 * Confirm pending recurring → real transaction.
 * @param {string} pendingId
 * @returns {Promise<object|null>}
 */
export async function confirmRecurringPending(pendingId) {
  const pending = loadRecurringPending();
  const item = pending.find((p) => p.id === pendingId && p.status === 'pending');
  if (!item) return null;

  const tx = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
    date: item.due_date || new Date().toISOString().slice(0, 10),
    type: 'expense',
    amount: Math.abs(Number(item.amount || 0)),
    category: item.category || item.name,
    merchant: item.name,
    account: item.account || 'Cash',
    notes: 'Tagihan rutin',
    meta: { recurring: true, schedule_id: item.schedule_id },
  };

  if (typeof window.upsertTransaction === 'function') {
    await window.upsertTransaction(tx);
  } else {
    const { createTransaction } = await import('./data-store.js');
    await createTransaction(tx);
  }

  item.status = 'confirmed';
  item.confirmed_at = new Date().toISOString();
  saveRecurringPending(pending);
  return tx;
}

/**
 * Dismiss pending without creating transaction.
 * @param {string} pendingId
 */
export function dismissRecurringPending(pendingId) {
  const pending = loadRecurringPending();
  const item = pending.find((p) => p.id === pendingId);
  if (!item) return;
  item.status = 'dismissed';
  saveRecurringPending(pending);
}

if (typeof window !== 'undefined') {
  window.monefyiRecurring = {
    syncSchedulesFromBudget,
    generateDueRecurring,
    loadRecurringPending,
    confirmRecurringPending,
    dismissRecurringPending,
    getRecurringPendingCount,
  };
}
