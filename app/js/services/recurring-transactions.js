/**
 * Recurring fixed-bill schedules — auto pending + one-click confirm.
 * @module services/recurring-transactions
 */

import { inferCategoryType, CATEGORY_TYPES } from './budget-model.js';

const LS_SCHEDULES = 'monefyi_recurring_schedules';
const LS_PENDING = 'monefyi_recurring_pending';
const LS_DETECT_DISMISS = 'monefyi_recurring_detect_dismissed';

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeRecurringKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function modeDay(values) {
  const counts = new Map();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = values[0] || 1;
  let max = 0;
  for (const [d, c] of counts) {
    if (c > max) { max = c; best = d; }
  }
  return best;
}

/**
 * @returns {object[]}
 */
export function loadRecurringSchedules() {
  return loadSchedules();
}

/**
 * Scan last N months for repeating merchants/dates.
 * @param {object[]} [transactions]
 * @param {object} [opts]
 * @returns {object[]}
 */
export function detectRecurringCandidates(transactions = [], opts = {}) {
  const months = opts.months || 3;
  const now = opts.now instanceof Date ? opts.now : new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutStr = cutoff.toISOString().slice(0, 10);
  const dismissed = getDismissedDetectKeys();

  const expenses = transactions.filter(
    (t) => t.type === 'expense' && String(t.date || '').slice(0, 10) >= cutStr,
  );

  /** @type {Map<string, object[]>} */
  const groups = new Map();
  for (const t of expenses) {
    const key = normalizeRecurringKey(t.merchant || t.category || t.notes);
    if (!key || key.length < 3) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const existing = new Set(loadSchedules().map((s) => normalizeRecurringKey(s.name)));
  /** @type {object[]} */
  const candidates = [];

  for (const [key, txs] of groups) {
    if (txs.length < 3 || dismissed.has(key) || existing.has(key)) continue;

    const days = txs.map((t) => parseInt(String(t.date || '').slice(8, 10), 10)).filter(Boolean);
    const dueDay = modeDay(days);
    const amounts = txs.map((t) => Math.abs(Number(t.amount || 0)));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const fixed = amounts.every((a) => Math.abs(a - avg) / Math.max(avg, 1) < 0.2);

    candidates.push({
      id: `cand_${key.replace(/\s/g, '_').slice(0, 24)}`,
      key,
      name: txs[0].merchant || txs[0].category || key,
      amount: Math.round(avg),
      category: txs[0].category || txs[0].merchant,
      account: txs[0].account || 'Cash',
      due_day: dueDay,
      frequency: 'monthly',
      amount_type: fixed ? 'fixed' : 'variable',
      occurrences: txs.length,
      confidence: Math.min(95, 55 + txs.length * 12),
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * @returns {Set<string>}
 */
function getDismissedDetectKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_DETECT_DISMISS) || '[]'));
  } catch {
    return new Set();
  }
}

/**
 * @param {string} key
 */
export function dismissRecurringCandidate(key) {
  const set = getDismissedDetectKeys();
  set.add(key);
  localStorage.setItem(LS_DETECT_DISMISS, JSON.stringify([...set]));
}

/**
 * @param {object} candidate
 * @param {object} [opts]
 * @returns {object}
 */
export function addScheduleFromCandidate(candidate, opts = {}) {
  const id = `rec_${normalizeRecurringKey(candidate.name).replace(/\s/g, '_')}`;
  const row = {
    id,
    name: candidate.name,
    amount: Number(candidate.amount || 0),
    category: candidate.category || candidate.name,
    account: candidate.account || 'Cash',
    frequency: candidate.frequency || 'monthly',
    due_day: Number(candidate.due_day) || 1,
    amount_type: candidate.amount_type || 'fixed',
    reminder_days_before: opts.reminder_days_before || [3, 1, 0],
    auto_create: !!opts.auto_create,
    active: true,
    updated_at: new Date().toISOString(),
  };
  const schedules = loadSchedules().filter((s) => s.id !== id);
  schedules.push(row);
  saveSchedules(schedules);
  dismissRecurringCandidate(candidate.key || normalizeRecurringKey(candidate.name));
  return row;
}

/**
 * Upcoming reminder events for notification scheduler (H-3, H-1, H-0).
 * @param {Date} [now]
 * @returns {object[]}
 */
export function getRecurringReminderEvents(now = new Date()) {
  syncSchedulesFromBudget();
  const schedules = loadSchedules().filter((s) => s.active !== false);
  const day = now.getDate();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  /** @type {object[]} */
  const events = [];

  for (const sch of schedules) {
    if (!sch.amount || sch.amount <= 0) continue;
    const dueDay = Number(sch.due_day);
    const daysUntil = dueDay - day;
    const reminderDays = sch.reminder_days_before || [3, 1, 0];
    if (!reminderDays.includes(daysUntil)) continue;

    events.push({
      schedule: sch,
      daysUntil,
      month: monthKey,
      due_date: `${monthKey}-${String(dueDay).padStart(2, '0')}`,
      tag: `recurring_rem_${sch.id}_${monthKey}_d${daysUntil}`,
    });
  }

  return events;
}

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
      amount_type: 'fixed',
      reminder_days_before: [3, 1, 0],
      auto_create: false,
      active: true,
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

    if (sch.auto_create && day === dueDay) {
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
        auto_created: true,
        created_at: today,
      });
      pendingKeys.add(key);
      continue;
    }

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
 * Auto-confirm schedules marked auto_create on due day.
 * @param {Date} [now]
 */
export async function processAutoCreateRecurring(now = new Date()) {
  generateDueRecurring(now);
  const pending = loadRecurringPending().filter((p) => p.auto_created && p.status === 'pending');
  for (const item of pending) {
    try {
      await confirmRecurringPending(item.id);
    } catch (e) {
      console.warn('[recurring] auto_create failed', item.id, e);
    }
  }
}

/**
 * Build notification copy for reminder event.
 * @param {object} ev
 * @returns {{ title: string, body: string }}
 */
export function buildRecurringReminderCopy(ev) {
  const sch = ev.schedule;
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const amt = `Rp ${fmt(sch.amount)}`;

  if (ev.daysUntil === 3) {
    return {
      title: `📅 3 hari lagi: ${sch.name}`,
      body: `${amt} jatuh tempo. Saldo estimasi cukup? Cek dulu.`,
    };
  }
  if (ev.daysUntil === 1) {
    return {
      title: `Besok jatuh tempo: ${sch.name}`,
      body: `${amt} — siapkan pembayaran ya.`,
    };
  }
  return {
    title: `Hari ini: ${sch.name}`,
    body: `${amt} — sudah dibayar? Konfirmasi dari Beranda.`,
  };
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
    processAutoCreateRecurring,
    loadRecurringPending,
    loadRecurringSchedules,
    confirmRecurringPending,
    dismissRecurringPending,
    getRecurringPendingCount,
    detectRecurringCandidates,
    addScheduleFromCandidate,
    dismissRecurringCandidate,
    getRecurringReminderEvents,
    buildRecurringReminderCopy,
  };
}
