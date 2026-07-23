/**
 * Home page data aggregator — built from in-memory STATE helpers (no new Supabase queries).
 * @module services/home-data
 */

/**
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}
 */
function calcChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {number} days
 * @returns {string}
 */
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/**
 * @returns {number}
 */
function daysLeftInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

/**
 * @param {number} percentage
 * @returns {'healthy'|'attention'|'warning'|'danger'}
 */
function getBudgetStatus(percentage) {
  if (percentage < 70) return 'healthy';
  if (percentage < 90) return 'attention';
  if (percentage <= 100) return 'warning';
  return 'danger';
}

/**
 * @param {Array<{date:string,type:string,amount:number}>} transactions
 * @returns {{days:Array,dmax:number,avg:number,maxDay:object|null}}
 */
function build7DayChart(transactions) {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = isoDate(date);
    const total = transactions
      .filter((t) => t.date === dateStr && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      amount: total,
    });
  }

  const amounts = days.map((d) => d.amount);
  const dmax = Math.max(...amounts, 1);
  const avg = amounts.reduce((a, b) => a + b, 0) / days.length;
  const maxDay = days.find((d) => d.amount === Math.max(...amounts)) || null;

  return { days, max: dmax, avg, maxDay };
}

/**
 * @param {object} params
 * @param {Function} params.formatCompactIDR
 * @returns {object}
 */
function generateDailyTip({ summary, budgetSummary, chartData, formatCompactIDR }) {
  const tips = [];

  if (summary.savingsChange !== null && summary.savingsChange > 10) {
    tips.push({
      type: 'achievement',
      icon: 'sparkles',
      color: '#10b981',
      title: 'Pencapaian!',
      message: `Tabungan kamu bertambah ${Math.round(summary.savingsChange)}% dari periode sebelumnya. Pertahankan momentum!`,
      actionLabel: 'Lihat analitik',
      actionTarget: 'advisor',
    });
  }

  if (budgetSummary && budgetSummary.percentage > 80) {
    tips.push({
      type: 'warning',
      icon: 'exclamation',
      color: '#f59e0b',
      title: 'Perhatian Budget',
      message: `Budget periode ini sudah ${Math.round(budgetSummary.percentage)}% terpakai. Sisa Rp ${formatCompactIDR(budgetSummary.remaining)} untuk ${budgetSummary.daysLeft} hari.`,
      actionLabel: 'Cek budget',
      actionTarget: 'budget',
    });
  }

  if (chartData?.maxDay && chartData.maxDay.amount > chartData.avg * 1.5 && chartData.maxDay.amount > 0) {
    tips.push({
      type: 'pattern',
      icon: 'lightBulb',
      color: '#10B981',
      title: 'Pola Pengeluaran',
      message: `Pengeluaran tertinggi 7 hari terakhir di hari ${chartData.maxDay.dayName} (Rp ${formatCompactIDR(chartData.maxDay.amount)}).`,
      actionLabel: 'Lihat detail',
      actionTarget: 'advisor',
    });
  }

  if (summary.expenseChange !== null && summary.expenseChange < -10) {
    tips.push({
      type: 'achievement',
      icon: 'fire',
      color: '#10b981',
      title: 'Hemat!',
      message: `Pengeluaran kamu turun ${Math.abs(Math.round(summary.expenseChange))}% dari periode sebelumnya.`,
      actionLabel: 'Lihat detail',
      actionTarget: 'advisor',
    });
  }

  if (summary.txCount === 0) {
    tips.push({
      type: 'reminder',
      icon: 'lightBulb',
      color: '#3b82f6',
      title: 'Mulai Catat',
      message: 'Belum ada transaksi di periode ini. Mulai catat untuk mendapatkan insight keuangan kamu!',
      actionLabel: 'Tambah transaksi',
      actionTarget: 'add-transaction',
    });
  }

  if (tips.length === 0) {
    tips.push({
      type: 'tips',
      icon: 'lightBulb',
      color: '#10B981',
      title: 'Tips Hemat',
      message: 'Pantau pengeluaran harian untuk menjaga keuangan tetap sehat. Catat setiap transaksi sekecil apapun.',
      actionLabel: 'Lihat tips lainnya',
      actionTarget: 'advisor',
    });
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return tips[dayOfYear % tips.length];
}

/**
 * Build all data needed for mobile home page.
 * @param {object} ctx
 * @returns {object}
 */
export function buildHomePageData(ctx) {
  const {
    transactions,
    period,
    settings,
    user,
    helpers,
  } = ctx;

  const {
    sumByType,
    budgetForPeriod,
    computeAccountBalancesUpto,
    getTransactionsInPeriod,
    toMonthKey,
    monthsBetween,
    formatCompactIDR,
    estimateSaldoUpToPeriodEnd,
  } = helpers;

  const periodTxs = getTransactionsInPeriod();
  const summaryNow = sumByType(periodTxs);
  const summary = {
    totalIncome: summaryNow.income,
    totalExpense: summaryNow.expense,
    totalSavings: summaryNow.net,
    txCount: periodTxs.length,
  };

  const prevEnd = new Date(period.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  const prevTxs = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= prevStart && d <= prevEnd;
  });
  const prevSummary = sumByType(prevTxs);

  summary.incomeChange = calcChange(summary.totalIncome, prevSummary.income);
  summary.expenseChange = calcChange(summary.totalExpense, prevSummary.expense);
  summary.savingsChange = calcChange(summary.totalSavings, prevSummary.net);

  const totalBalance = estimateSaldoUpToPeriodEnd();
  const accountRows = computeAccountBalancesUpto(period.end);
  const absTotal = accountRows.reduce((s, a) => s + Math.abs(a.balance), 0) || 1;
  const accounts = accountRows.map((a) => ({
    name: a.account,
    balance: a.balance,
    percentage: (Math.abs(a.balance) / absTotal) * 100,
  }));

  const budget = budgetForPeriod();
  const planned = Number(budget.planned || 0);
  const totalSpent = summary.totalExpense;
  const percentage = planned > 0 ? (totalSpent / planned) * 100 : 0;

  let overCount = 0;
  let okCount = 0;
  const catMap = budget.categories || {};
  for (const [cat, plannedAmt] of Object.entries(catMap)) {
    const spent = periodTxs
      .filter((t) => t.type === 'expense' && (t.category || 'Lainnya') === cat)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    if (spent > Number(plannedAmt || 0)) overCount += 1;
    else okCount += 1;
  }

  const budgetSummary = {
    totalBudget: planned,
    totalSpent,
    remaining: planned - totalSpent,
    percentage,
    overCount,
    okCount,
    daysLeft: daysLeftInMonth(),
    status: getBudgetStatus(percentage),
  };

  const chartStart = dateOffset(-6);
  const last7Txs = transactions.filter((t) => t.date >= chartStart && t.date <= dateOffset(0));
  const chartData = build7DayChart(last7Txs);

  const recentTransactions = [...transactions]
    .sort((a, b) => (b.date.localeCompare(a.date)) || ((b.created_at || '').localeCompare(a.created_at || '')))
    .slice(0, 5);

  const dailyTip = generateDailyTip({ summary, budgetSummary, chartData, formatCompactIDR });

  return {
    totalBalance,
    summary,
    accounts,
    recentTransactions,
    budgetSummary,
    chartData,
    dailyTip,
    periodLabel: period.label || '',
    userName: user?.name || 'User',
    saldoMasked: !!ctx.ui?.saldoMasked,
  };
}
