/**
 * Smart local notification scheduler (offline-first, no server cron).
 * @module services/notification-scheduler
 */

import { showNotification, processQueue, isCategoryEnabled } from './push-notification.js';
import { buildMorningBriefing, buildBillReminder, buildBudgetMilestoneMessage } from './contextual-notifications.js';
import { syncFinancialCondition } from './financial-condition.js';
import { inferCategoryType, CATEGORY_TYPES } from './budget-model.js';
import { generateWeeklyDigest, formatWeeklyDigestNotification } from './weekly-digest.js';

const CHECK_INTERVAL = 15 * 60 * 1000;
let _intervalId = null;
/** @type {Record<string, string>} */
let _lastChecks = {};

/**
 * Initialize scheduler once after auth.
 */
export function initScheduler() {
  if (_intervalId) return;

  try {
    _lastChecks = JSON.parse(localStorage.getItem('monefyi_sched_checks') || '{}');
  } catch {
    _lastChecks = {};
  }

  setTimeout(() => runScheduledChecks(), 5000);
  _intervalId = setInterval(() => runScheduledChecks(), CHECK_INTERVAL);

  window.addEventListener('online', () => {
    setTimeout(() => runScheduledChecks(), 3000);
  });

  setInterval(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 8) processQueue().catch(() => {});
  }, 30 * 60 * 1000);

  console.log('[scheduler] Initialized');
}

export function stopScheduler() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function checkedToday(key) {
  const today = new Date().toISOString().split('T')[0];
  return _lastChecks[key] === today;
}

function markChecked(key) {
  _lastChecks[key] = new Date().toISOString().split('T')[0];
}

function persistChecks() {
  try {
    localStorage.setItem('monefyi_sched_checks', JSON.stringify(_lastChecks));
  } catch { /* ignore */ }
}

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @returns {{ transactions: object[], budgetRows: object[], income: number, month: string }}
 */
function loadFinanceSnapshot() {
  const state = window.STATE || {};
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];
  const month = state.selectedMonth || currentMonthKey();
  const pack = state.budgetsByMonth?.[month];
  const budgetRows = Array.isArray(pack?.rows) ? pack.rows
    : Array.isArray(pack) ? pack
      : Array.isArray(state.budgetDraft?.rows) ? state.budgetDraft.rows
        : [];

  let income = 0;
  try {
    const monthTx = transactions.filter((t) => String(t.date || '').startsWith(month));
    income = monthTx
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    if (!income && typeof window.estimateIncomeForMonth === 'function') {
      income = Number(window.estimateIncomeForMonth(month)) || 0;
    }
  } catch { /* ignore */ }

  return { transactions, budgetRows, income, month };
}

function monthExpenses(transactions, month) {
  return (transactions || [])
    .filter((t) => t.type === 'expense' && String(t.date || '').startsWith(month));
}

function spentForCategory(expenses, categoryName) {
  const key = String(categoryName || '').toLowerCase();
  return expenses
    .filter((t) => String(t.category || '').toLowerCase() === key)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

function parseTargetDay(dayStr) {
  if (dayStr == null || dayStr === '') return null;
  const s = String(dayStr).trim();
  const n = parseInt(s.split(/[-/]/)[0], 10);
  if (Number.isNaN(n) || n < 1 || n > 31) return null;
  return n;
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n || 0)));
}

function fmtShort(n) {
  const num = Math.abs(n || 0);
  if (num >= 1e6) return `${(num / 1e6).toFixed(num < 1e7 ? 1 : 0)}jt`;
  if (num >= 1e3) return `${Math.round(num / 1e3)}rb`;
  return String(Math.round(num));
}

/**
 * Run all scheduled checks.
 * @param {{ ignoreSchedule?: boolean }} [opts]
 */
export async function runScheduledChecks(opts = {}) {
  const ignoreSchedule = !!opts.ignoreSchedule;
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  const { transactions, budgetRows, income, month } = loadFinanceSnapshot();
  const expenses = monthExpenses(transactions, month);
  const totalExpense = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  try {
    await syncFinancialCondition(window.STATE || {});
  } catch { /* ignore */ }

  if (ignoreSchedule || (hour >= 7 && hour <= 8 && !checkedToday('morning_briefing'))) {
    if (ignoreSchedule || isCategoryEnabled('morningBriefing')) {
      await sendMorningBriefing(budgetRows, expenses, totalExpense, income, now);
    }
    if (!ignoreSchedule) markChecked('morning_briefing');
  }

  if (ignoreSchedule || (hour >= 8 && hour <= 20 && !checkedToday('bill_reminder'))) {
    if (ignoreSchedule || isCategoryEnabled('billReminders')) {
      await checkBillReminders(budgetRows, dayOfMonth);
      await checkRecurringDue();
    }
    if (!ignoreSchedule) markChecked('bill_reminder');
  }

  if (ignoreSchedule || (hour >= 10 && hour <= 20 && isCategoryEnabled('budgetMilestones'))) {
    if (ignoreSchedule || isCategoryEnabled('budgetMilestones')) {
      await checkBudgetMilestones(budgetRows, expenses);
    }
  }

  if (ignoreSchedule || (dayOfWeek === 0 && hour === 20 && !checkedToday('weekly_recap'))) {
    if (ignoreSchedule || isCategoryEnabled('weeklyRecap')) {
      await sendWeeklyRecap(transactions, now);
    }
    if (!ignoreSchedule) markChecked('weekly_recap');
  }

  if (ignoreSchedule || (dayOfMonth >= 28 && hour === 18 && !checkedToday('monthly_closing'))) {
    if (ignoreSchedule || isCategoryEnabled('monthlyReport')) {
      await sendMonthlyClosingReminder(transactions, now);
    }
    if (!ignoreSchedule) markChecked('monthly_closing');
  }

  if (ignoreSchedule || (dayOfMonth === 1 && hour === 9 && !checkedToday('monthly_report'))) {
    if (ignoreSchedule || isCategoryEnabled('monthlyReport')) {
      await sendMonthlyReport(transactions, income, now);
    }
    if (!ignoreSchedule) markChecked('monthly_report');
  }

  if (ignoreSchedule || (hour >= 18 && hour <= 20 && !checkedToday('achievements'))) {
    if (ignoreSchedule || isCategoryEnabled('achievements')) {
      await checkAchievements(transactions, budgetRows, expenses, now);
    }
    if (!ignoreSchedule) markChecked('achievements');
  }

  if (ignoreSchedule || (hour >= 12 && hour <= 14 && [1, 3, 5].includes(dayOfWeek) && !checkedToday('smart_tip'))) {
    if (ignoreSchedule || isCategoryEnabled('smartTips')) {
      await sendSmartTip(transactions, budgetRows, expenses, now);
    }
    if (!ignoreSchedule) markChecked('smart_tip');
  }

  if (!ignoreSchedule) persistChecks();
}

/**
 * Manually trigger all checks (for testing).
 * Bypasses time/day checks and quiet-hour gates; does not mark schedule history.
 */
export async function forceRunAllChecks() {
  console.log('[scheduler] Force running all checks...');
  const { setForceBypass } = await import('./push-notification.js');
  const backup = { ..._lastChecks };
  setForceBypass(true);
  try {
    await runScheduledChecks({ ignoreSchedule: true });
  } finally {
    setForceBypass(false);
    _lastChecks = backup;
  }
  console.log('[scheduler] Force run complete');
}

async function sendMorningBriefing(_budgetRows, _expenses, _totalExpense, _income, _now) {
  const briefing = buildMorningBriefing(window.STATE || {}, _now);
  if (!briefing) return;

  await showNotification({
    title: briefing.title,
    body: briefing.body,
    tag: briefing.tag,
    categoryKey: 'morningBriefing',
    type: 'budget_tip',
    iconEmoji: briefing.iconEmoji || '🌅',
    data: { url: '/app/#home' },
  });
}

async function checkRecurringDue() {
  try {
    const {
      generateDueRecurring,
      getRecurringReminderEvents,
      buildRecurringReminderCopy,
      processAutoCreateRecurring,
    } = await import('./recurring-transactions.js');

    await processAutoCreateRecurring();

    for (const ev of getRecurringReminderEvents()) {
      const { title, body } = buildRecurringReminderCopy(ev);
      await showNotification({
        title,
        body,
        tag: ev.tag,
        categoryKey: 'billReminders',
        type: ev.daysUntil === 0 ? 'recurring_due' : 'recurring_reminder',
        iconEmoji: ev.daysUntil === 0 ? '🔁' : '📅',
        severity: ev.daysUntil === 0 ? 'high' : 'medium',
        requireInteraction: ev.daysUntil === 0,
        urgent: ev.daysUntil === 0,
        data: { url: '/app/#home', scheduleId: ev.schedule.id },
        inboxActions: ev.daysUntil === 0
          ? [{ label: 'Konfirmasi', action: 'open_home' }]
          : [{ label: 'Lihat Beranda', action: 'open_home' }],
      });
    }

    const pending = generateDueRecurring();
    for (const item of pending.slice(0, 2)) {
      const tag = `recurring_overdue_${item.schedule_id}_${item.month}`;
      await showNotification({
        title: `Tagihan rutin: ${item.name}`,
        body: `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(item.amount || 0))} jatuh tempo. Konfirmasi dari Beranda.`,
        tag,
        categoryKey: 'billReminders',
        type: 'recurring_due',
        iconEmoji: '🔁',
        severity: 'medium',
        data: { url: '/app/#home', pendingId: item.id },
        inboxActions: [{ label: 'Konfirmasi', action: 'confirm_recurring', pendingId: item.id }],
      });
    }
  } catch (e) {
    console.warn('[scheduler] recurring due check failed', e);
  }
}

async function checkBillReminders(budgetRows, today) {
  for (const budget of budgetRows || []) {
    if (!budget.items?.length) continue;
    for (const item of budget.items) {
      if (item.status === 'done' || item.status === 'skipped') continue;
      let targetDay = parseTargetDay(item.target_date_day);
      if (targetDay == null && item.target_date) {
        const m = String(item.target_date).match(/^\d{4}-\d{2}-(\d{2})/);
        if (m) targetDay = parseInt(m[1], 10);
      }
      if (targetDay == null) continue;
      const dayDiff = targetDay - today;
      if (![3, 1, 0].includes(dayDiff)) continue;

      const amount = Number(item.subtotal ?? (Number(item.qty || 1) * Number(item.price || 0)));
      const tag = `bill_${item.id}_${dayDiff}`;
      const { title, body } = buildBillReminder(item, budget, dayDiff, window.STATE || {});

      await showNotification({
        title,
        body,
        tag,
        categoryKey: 'billReminders',
        type: 'budget_reminder',
        iconEmoji: '📅',
        severity: dayDiff === 0 ? 'high' : 'medium',
        requireInteraction: dayDiff === 0,
        urgent: dayDiff === 0,
        data: { url: '/app/#budget', budgetId: budget.id },
        inboxActions: [{ label: 'Lihat Budget', action: 'open_budget', budgetId: budget.id }],
      });
    }
  }
}

async function checkBudgetMilestones(budgetRows, expenses) {
  for (const budget of budgetRows || []) {
    const planned = Number(budget.amount) || 0;
    if (planned <= 0) continue;
    const spent = spentForCategory(expenses, budget.name);
    const percent = Math.round((spent / planned) * 100);
    const categoryType = inferCategoryType(budget);

    if (categoryType === CATEGORY_TYPES.FIXED_BILL && percent >= 100) continue;

    const thresholds = Array.isArray(budget.notification_thresholds)
      && budget.notification_thresholds.length
      ? budget.notification_thresholds.map(Number).filter((t) => t >= 75)
      : [75, 90, 100];
    const milestones = [...new Set([...thresholds, 90, 100])].sort((a, b) => b - a);

    for (const milestone of milestones) {
      if (percent < milestone) continue;
      if (percent >= milestone + 15 && milestone < 100) continue;

      const tag = `milestone_${budget.id}_${milestone}`;
      const msg = buildBudgetMilestoneMessage(budget, percent, spent, planned);

      await showNotification({
        title: msg.title,
        body: msg.body,
        tag,
        categoryKey: 'budgetMilestones',
        type: 'budget_alert',
        iconEmoji: milestone >= 100 ? '🚨' : milestone >= 90 ? '⚠️' : '📊',
        severity: msg.severity === 'high' ? 'high' : 'medium',
        requireInteraction: milestone >= 100,
        urgent: milestone >= 100,
        data: { url: '/app/#budget', budgetId: budget.id },
      });
      break;
    }
  }
}

async function sendWeeklyRecap(transactions, now) {
  const digest = generateWeeklyDigest({ ...(window.STATE || {}), transactions });
  if (!digest.has_data) return;
  const { title, body } = formatWeeklyDigestNotification(digest);

  await showNotification({
    title,
    body,
    tag: 'weekly_recap',
    categoryKey: 'weeklyRecap',
    type: 'ai_recommendation',
    iconEmoji: '📊',
    data: { url: '/app/#home', action: 'weekly_digest' },
  });
}

async function sendMonthlyClosingReminder(transactions, now) {
  const period = currentMonthKey(now);
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const monthTx = transactions.filter((t) => String(t.date || '').startsWith(period));
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const net = income - expense;

  await showNotification({
    title: `Siap tutup buku ${monthName}?`,
    body: `Net bulan ini ${net >= 0 ? '+' : ''}${fmtShort(net)}. Alokasikan surplus/defisit sebelum bulan baru.`,
    tag: 'monthly_closing_reminder',
    categoryKey: 'monthlyReport',
    type: 'budget_tip',
    iconEmoji: '📒',
    data: { url: '/app/#reports', action: 'monthly_closing', period },
  });
}

async function sendMonthlyReport(transactions, _income, now) {
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPeriod = currentMonthKey(prevMonth);
  const prevTx = transactions.filter((t) => String(t.date || '').startsWith(prevPeriod));
  const prevIncome = prevTx.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const prevExpense = prevTx.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const prevSaving = prevIncome - prevExpense;
  const prevRate = prevIncome > 0 ? Math.round((prevSaving / prevIncome) * 100) : 0;
  const monthName = prevMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  await showNotification({
    title: `Tutup buku ${monthName}`,
    body: `Income ${fmtShort(prevIncome)}, Expense ${fmtShort(prevExpense)}, Net ${prevSaving >= 0 ? '+' : ''}${fmtShort(prevSaving)} (${prevRate}%). Tap untuk alokasi surplus/defisit.`,
    tag: 'monthly_report',
    categoryKey: 'monthlyReport',
    type: 'ai_recommendation',
    iconEmoji: '📈',
    requireInteraction: true,
    data: { url: '/app/#reports', action: 'monthly_closing', period: prevPeriod },
  });
}

async function checkAchievements(transactions, budgetRows, expenses, now) {
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
    if (transactions.some((t) => t.date === d)) streak += 1;
    else break;
  }

  if ([7, 14, 30].includes(streak)) {
    await showNotification({
      title: `Streak ${streak} hari!`,
      body: `${streak} hari berturut catat transaksi. Konsistensi adalah kunci!`,
      tag: `achievement_streak_${streak}`,
      categoryKey: 'achievements',
      type: 'achievement',
      iconEmoji: '🎉',
      data: { url: '/app/#home' },
    });
  }

  const month = currentMonthKey(now);
  const monthRows = budgetRows.filter((b) => !b.period || b.period === month);
  if (monthRows.length >= 3 && now.getDate() >= 25) {
    const allInBudget = monthRows.every((b) => {
      const spent = spentForCategory(expenses, b.name);
      return spent <= (Number(b.amount) || 0);
    });
    if (allInBudget) {
      await showNotification({
        title: 'Semua Budget Terkendali!',
        body: 'Semua kategori budget dalam batas bulan ini. Luar biasa!',
        tag: `achievement_all_budget_${month}`,
        categoryKey: 'achievements',
        type: 'achievement',
        iconEmoji: '⭐',
        data: { url: '/app/#budget' },
      });
    }
  }
}

async function sendSmartTip(transactions, budgetRows, expenses, now) {
  const today = now.toISOString().split('T')[0];
  const todayTx = transactions.filter((t) => t.date === today);

  if (todayTx.length === 0 && now.getHours() >= 12) {
    await showNotification({
      title: 'Belum ada catatan hari ini',
      body: 'Lupa catat transaksi? Atau memang hemat hari ini?',
      tag: 'tip_no_tx',
      categoryKey: 'smartTips',
      type: 'budget_tip',
      iconEmoji: '💡',
      silent: true,
      data: { url: '/app/#transactions' },
    });
    return;
  }

  const otherCount = expenses.filter((t) => {
    const c = String(t.category || '').toLowerCase();
    return c === 'lainnya' || c === 'other';
  }).length;
  const otherPercent = expenses.length > 0 ? Math.round((otherCount / expenses.length) * 100) : 0;
  if (otherPercent > 30) {
    await showNotification({
      title: 'Kategorikan transaksimu',
      body: `${otherPercent}% transaksi masih "Lainnya". Kategorikan untuk insight lebih baik.`,
      tag: 'tip_categorize',
      categoryKey: 'smartTips',
      type: 'budget_tip',
      iconEmoji: '💡',
      silent: true,
      data: { url: '/app/#transactions' },
    });
    return;
  }

  const totalBudget = budgetRows.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const totalSpent = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = totalBudget - totalSpent;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  if (remaining > 0 && daysLeft <= 5 && daysLeft > 0) {
    await showNotification({
      title: 'Potensi Hemat',
      body: `Sisa ${daysLeft} hari, budget masih Rp ${fmt(remaining)}. Bisa jadi tabungan!`,
      tag: 'tip_savings',
      categoryKey: 'smartTips',
      type: 'budget_tip',
      iconEmoji: '💡',
      silent: true,
      data: { url: '/app/#budget' },
    });
  }
}

/**
 * Real-time spending alert after a large expense save.
 * @param {object} transaction
 */
export async function checkSpendingAlert(transaction) {
  if (!transaction || transaction.type !== 'expense') return;
  if (!isCategoryEnabled('spendingAlerts')) return;

  const amount = Number(transaction.amount) || 0;
  const { budgetRows, expenses, month } = loadFinanceSnapshot();
  const category = transaction.category || '';
  const budget = budgetRows.find(
    (b) => String(b.name || '').toLowerCase() === String(category).toLowerCase(),
  );

  let remaining = Infinity;
  let budgetInfo = '';
  if (budget) {
    const spent = spentForCategory(
      monthExpenses(window.STATE?.transactions || expenses, month),
      budget.name,
    );
    const planned = Number(budget.amount) || 0;
    remaining = planned - spent;
    const percentUsed = planned > 0 ? Math.round((spent / planned) * 100) : 0;
    budgetInfo = ` Budget ${budget.name} ${percentUsed}%.`;
  }

  const bigAbsolute = amount >= 500000;
  const bigRelative = remaining !== Infinity && remaining > 0 && amount > remaining * 0.2;
  if (!bigAbsolute && !bigRelative) return;

  await showNotification({
    title: 'Pengeluaran Besar',
    body: `Rp ${fmt(amount)} untuk ${transaction.merchant || category || 'Transaksi'}.${budgetInfo}`,
    tag: `spending_alert_${transaction.id}`,
    categoryKey: 'spendingAlerts',
    type: 'budget_alert',
    iconEmoji: '💸',
    data: {
      url: '/app/#transactions',
      transactionId: transaction.id,
    },
  });
}

/**
 * Optional sync status push (prefs off by default).
 * @param {object} options
 */
export async function notifySyncStatus(options = {}) {
  if (!isCategoryEnabled('syncStatus')) return;
  await showNotification({
    title: options.title || 'Sinkronisasi',
    body: options.body || '',
    tag: options.tag || `sync_${Date.now()}`,
    categoryKey: 'syncStatus',
    type: 'sync_status',
    iconEmoji: '🔄',
    silent: true,
    data: { url: '/app/#home' },
  });
}

if (typeof window !== 'undefined') {
  window.monefyiScheduler = {
    initScheduler,
    stopScheduler,
    checkSpendingAlert,
    runScheduledChecks,
    notifySyncStatus,
    forceRunAllChecks,
  };
}
