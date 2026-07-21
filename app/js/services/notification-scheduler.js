/**
 * Smart local notification scheduler (offline-first, no server cron).
 * @module services/notification-scheduler
 */

import { showNotification, processQueue, isCategoryEnabled } from './push-notification.js';

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
 */
export async function runScheduledChecks() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  const { transactions, budgetRows, income, month } = loadFinanceSnapshot();
  const expenses = monthExpenses(transactions, month);
  const totalExpense = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  if (hour >= 7 && hour <= 8 && !checkedToday('morning_briefing')) {
    if (isCategoryEnabled('morningBriefing')) {
      await sendMorningBriefing(budgetRows, expenses, totalExpense, income, now);
    }
    markChecked('morning_briefing');
  }

  if (hour >= 8 && hour <= 20 && !checkedToday('bill_reminder')) {
    if (isCategoryEnabled('billReminders')) {
      await checkBillReminders(budgetRows, dayOfMonth);
    }
    markChecked('bill_reminder');
  }

  if (hour >= 10 && hour <= 20 && isCategoryEnabled('budgetMilestones')) {
    await checkBudgetMilestones(budgetRows, expenses);
  }

  if (dayOfWeek === 0 && hour === 20 && !checkedToday('weekly_recap')) {
    if (isCategoryEnabled('weeklyRecap')) {
      await sendWeeklyRecap(transactions, now);
    }
    markChecked('weekly_recap');
  }

  if (dayOfMonth === 1 && hour === 9 && !checkedToday('monthly_report')) {
    if (isCategoryEnabled('monthlyReport')) {
      await sendMonthlyReport(transactions, income, now);
    }
    markChecked('monthly_report');
  }

  if (hour >= 18 && hour <= 20 && !checkedToday('achievements')) {
    if (isCategoryEnabled('achievements')) {
      await checkAchievements(transactions, budgetRows, expenses, now);
    }
    markChecked('achievements');
  }

  if (hour >= 12 && hour <= 14 && [1, 3, 5].includes(dayOfWeek) && !checkedToday('smart_tip')) {
    if (isCategoryEnabled('smartTips')) {
      await sendSmartTip(transactions, budgetRows, expenses, now);
    }
    markChecked('smart_tip');
  }

  persistChecks();
}

async function sendMorningBriefing(budgetRows, expenses, totalExpense, income, now) {
  const totalBudget = budgetRows.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const percentUsed = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;
  const remaining = totalBudget - totalExpense;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const dailyBudget = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const savingRate = income > 0 ? Math.round(((income - totalExpense) / income) * 100) : 0;

  let title;
  let body;
  let tag;

  if (now.getDate() === 25) {
    title = 'Hari Gajian!';
    body = 'Jangan lupa alokasikan ke budget. Harus → Penting → Simpan → Mau.';
    tag = 'morning_payday';
  } else if (percentUsed >= 100 && totalBudget > 0) {
    title = 'Budget Sudah Over';
    body = `Over Rp ${fmt(Math.abs(remaining))}. Review pengeluaran yang bisa dikurangi.`;
    tag = 'morning_over';
  } else if (percentUsed >= 90 && totalBudget > 0) {
    title = `Budget Hampir Habis (${percentUsed}%)`;
    body = `Sisa Rp ${fmt(remaining)} untuk ${daysLeft} hari. Max Rp ${fmt(dailyBudget)}/hari.`;
    tag = 'morning_warning';
  } else if (savingRate >= 20) {
    title = `Good Morning! Saving Rate ${savingRate}%`;
    body = `Budget ${percentUsed}% terpakai. Sisa ${daysLeft} hari. Tetap on-track!`;
    tag = 'morning_good';
  } else if (totalBudget > 0) {
    title = `Selamat pagi! Sisa budget hari ini: Rp ${fmt(Math.max(0, dailyBudget))}`;
    body = `Budget ${percentUsed}% terpakai. ${daysLeft} hari tersisa. Yuk jaga pengeluaran!`;
    tag = 'morning_normal';
  } else {
    title = 'Selamat pagi!';
    body = 'Belum ada budget bulan ini. Buat budgeting supaya insight lebih akurat.';
    tag = 'morning_no_budget';
  }

  await showNotification({
    title,
    body,
    tag,
    categoryKey: 'morningBriefing',
    type: 'budget_tip',
    iconEmoji: '🌅',
    data: { url: '/app/#home' },
  });
}

async function checkBillReminders(budgetRows, today) {
  for (const budget of budgetRows || []) {
    if (!budget.items?.length) continue;
    for (const item of budget.items) {
      if (item.status === 'done' || item.status === 'skipped') continue;
      const targetDay = parseTargetDay(item.target_date_day);
      if (targetDay == null) continue;
      const dayDiff = targetDay - today;
      if (![3, 1, 0].includes(dayDiff)) continue;

      const amount = Number(item.subtotal ?? (Number(item.qty || 1) * Number(item.price || 0)));
      const tag = `bill_${item.id}_${dayDiff}`;
      let title;
      let body;
      if (dayDiff === 3) {
        title = `${item.name || 'Tagihan'} dalam 3 hari`;
        body = `Estimasi: Rp ${fmt(amount)}. Kategori: ${budget.name || 'Budget'}.`;
      } else if (dayDiff === 1) {
        title = `Besok: ${item.name || 'Tagihan'}`;
        body = `Rp ${fmt(amount)}. Pastikan sudah siap.`;
      } else {
        title = `Hari ini: ${item.name || 'Tagihan'}`;
        body = `Rp ${fmt(amount)}. Jangan sampai terlambat!`;
      }

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

    const thresholds = Array.isArray(budget.notification_thresholds)
      && budget.notification_thresholds.length
      ? budget.notification_thresholds.map(Number)
      : [75, 90, 100];
    const milestones = [...new Set([...thresholds, 90, 100])].sort((a, b) => b - a);

    for (const milestone of milestones) {
      if (percent < milestone) continue;
      if (percent >= milestone + 15 && milestone < 100) continue;

      const tag = `milestone_${budget.id}_${milestone}`;
      let title;
      let body;
      if (milestone >= 100) {
        title = `${budget.name || 'Budget'} OVER BUDGET`;
        body = `Terpakai ${percent}% (Rp ${fmt(spent)} / ${fmt(planned)}). Perlu review.`;
      } else if (milestone >= 90) {
        title = `${budget.name || 'Budget'} hampir habis`;
        body = `${percent}% terpakai. Sisa Rp ${fmt(planned - spent)}.`;
      } else {
        title = `${budget.name || 'Budget'} ${percent}%`;
        body = `Sisa Rp ${fmt(planned - spent)}. Waspada overspending.`;
      }

      await showNotification({
        title,
        body,
        tag,
        categoryKey: 'budgetMilestones',
        type: 'budget_alert',
        iconEmoji: milestone >= 100 ? '🚨' : '⚠️',
        severity: milestone >= 90 ? 'high' : 'medium',
        requireInteraction: milestone >= 100,
        urgent: milestone >= 100,
        data: { url: '/app/#budget', budgetId: budget.id },
      });
      break;
    }
  }
}

async function sendWeeklyRecap(transactions, now) {
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const weekTx = transactions.filter((t) => t.type === 'expense' && t.date >= weekAgo);
  const weekTotal = weekTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
  const prevWeekTx = transactions.filter(
    (t) => t.type === 'expense' && t.date >= twoWeeksAgo && t.date < weekAgo,
  );
  const prevWeekTotal = prevWeekTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const change = prevWeekTotal > 0
    ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
    : 0;
  const changeText = change > 0 ? `↑${change}%` : change < 0 ? `↓${Math.abs(change)}%` : 'stabil';

  const catMap = {};
  for (const t of weekTx) {
    const cat = t.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + (Number(t.amount) || 0);
  }
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const topText = topCat && weekTotal > 0
    ? `Top: ${topCat[0]} ${Math.round((topCat[1] / weekTotal) * 100)}%`
    : '';

  await showNotification({
    title: 'Rekap Minggu Ini',
    body: `Pengeluaran Rp ${fmt(weekTotal)} (${changeText} vs minggu lalu). ${topText}`.trim(),
    tag: 'weekly_recap',
    categoryKey: 'weeklyRecap',
    type: 'ai_recommendation',
    iconEmoji: '📊',
    data: { url: '/app/#advisor' },
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
    title: `Laporan ${monthName}`,
    body: `Income ${fmtShort(prevIncome)}, Expense ${fmtShort(prevExpense)}, Tabungan ${prevSaving >= 0 ? '+' : ''}${fmtShort(prevSaving)} (${prevRate}%)`,
    tag: 'monthly_report',
    categoryKey: 'monthlyReport',
    type: 'ai_recommendation',
    iconEmoji: '📈',
    requireInteraction: true,
    data: { url: '/app/#advisor' },
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
  };
}
