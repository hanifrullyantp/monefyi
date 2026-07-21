/**
 * Generate insight for a single transaction.
 * 100% local computation, no AI.
 * @module services/transaction-insight
 */

/**
 * @param {object} transaction
 * @param {object[]} [allTransactions]
 * @param {object[]} [budgets] - Flat rows `{ name|category, amount, priority }` or month bucket
 * @returns {Promise<object|null>}
 */
export async function getTransactionInsight(transaction, allTransactions, budgets) {
  if (!transaction) return null;

  if (!allTransactions) {
    try {
      const store = await import('./data-store.js');
      allTransactions = await store.getTransactions();
    } catch {
      allTransactions = [];
    }
  }

  if (!budgets) {
    try {
      const store = await import('./data-store.js');
      const month = (transaction.date || '').substring(0, 7) || currentMonthKey();
      budgets = await store.getBudgetRowsForMonth(month);
    } catch {
      budgets = [];
    }
  }

  const budgetRows = normalizeBudgetRows(budgets);
  const category = transaction.category || 'Lainnya';
  const isExpense = transaction.type === 'expense';

  const categoryTrend = computeCategoryTrend(category, allTransactions, 6);
  const comparison = computeComparison(category, allTransactions, transaction);
  const budgetInfo = computeBudgetProgress(category, allTransactions, budgetRows, transaction);
  const rank = computeSpendingRank(transaction, allTransactions);
  const similar = findSimilarTransactions(transaction, allTransactions);
  const dayPattern = analyzeDayPattern(transaction, allTransactions);

  return {
    transaction,
    categoryTrend,
    comparison,
    budgetInfo,
    rank,
    similar,
    dayPattern,
    isExpense,
    category,
  };
}

/**
 * Accept Monefyi budget rows, legacy flat budgets, or categories object.
 * @param {unknown} budgets
 * @returns {{ name: string, amount: number, priority?: string }[]}
 */
function normalizeBudgetRows(budgets) {
  if (!budgets) return [];
  if (Array.isArray(budgets)) {
    return budgets
      .map((b) => ({
        name: String(b?.name || b?.category || '').trim(),
        amount: Number(b?.amount || 0),
        priority: b?.priority || null,
      }))
      .filter((b) => b.name);
  }
  if (typeof budgets === 'object') {
    if (Array.isArray(budgets.rows)) return normalizeBudgetRows(budgets.rows);
    if (budgets.categories) return normalizeBudgetRows(budgets.categories);
    return Object.entries(budgets)
      .filter(([k]) => k !== 'rows' && k !== 'income')
      .map(([name, amount]) => ({
        name: String(name).trim(),
        amount: Number(amount) || 0,
        priority: null,
      }))
      .filter((b) => b.name);
  }
  return [];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function catEq(a, b) {
  return normCat(a) === normCat(b);
}

/**
 * @param {string} s
 * @returns {string}
 */
function normCat(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @returns {string}
 */
function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Category spending per month for last N months.
 * @param {string} category
 * @param {object[]} allTransactions
 * @param {number} months
 */
function computeCategoryTrend(category, allTransactions, months) {
  const now = new Date();
  const data = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });

    const total = allTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          String(t.date || '').startsWith(period) &&
          catEq(t.category || 'Lainnya', category)
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    data.push({ period, label: monthLabel, amount: total, isCurrent: i === 0 });
  }

  const max = Math.max(...data.map((d) => d.amount), 1);
  const avg =
    data.slice(0, -1).reduce((s, d) => s + d.amount, 0) / Math.max(data.length - 1, 1);
  const current = data[data.length - 1]?.amount || 0;

  let trendDirection = 'stable';
  let trendPercent = 0;
  if (avg > 0) {
    trendPercent = Math.round(((current - avg) / avg) * 100);
    if (trendPercent > 10) trendDirection = 'up';
    else if (trendPercent < -10) trendDirection = 'down';
  }

  return {
    data,
    max,
    avg: Math.round(avg),
    current: Math.round(current),
    trendDirection,
    trendPercent,
    hasData: data.some((d) => d.amount > 0),
  };
}

/**
 * Compare current month spending vs 3-month average.
 * @param {string} category
 * @param {object[]} allTransactions
 * @param {object} transaction
 */
function computeComparison(category, allTransactions, transaction) {
  const anchor = transaction?.date ? new Date(transaction.date) : new Date();
  const currentMonth = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;

  let totalPrev = 0;
  let monthCount = 0;

  for (let i = 1; i <= 3; i++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthTotal = allTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          String(t.date || '').startsWith(period) &&
          catEq(t.category || 'Lainnya', category)
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    if (monthTotal > 0) {
      totalPrev += monthTotal;
      monthCount++;
    }
  }

  const avgMonthly = monthCount > 0 ? totalPrev / monthCount : 0;

  const currentTotal = allTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        String(t.date || '').startsWith(currentMonth) &&
        catEq(t.category || 'Lainnya', category)
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  let narrative = '';
  let status = 'neutral';
  let changePercent = 0;

  if (avgMonthly > 0) {
    changePercent = Math.round(((currentTotal - avgMonthly) / avgMonthly) * 100);

    if (changePercent > 15) {
      narrative = `Pengeluaran Anda di kategori ini naik ${changePercent}% bulan ini dibandingkan rata-rata 3 bulan terakhir.`;
      status = 'warning';
    } else if (changePercent < -15) {
      narrative = `Pengeluaran Anda di kategori ini turun ${Math.abs(changePercent)}% bulan ini. Bagus!`;
      status = 'good';
    } else {
      narrative = 'Pengeluaran di kategori ini relatif stabil dibandingkan 3 bulan terakhir.';
      status = 'stable';
    }
  } else {
    narrative = 'Belum ada data historis cukup untuk perbandingan.';
    status = 'no_data';
  }

  return { avgMonthly, currentTotal, narrative, status, changePercent };
}

/**
 * Budget progress for this category (Monefyi rows use `name`).
 * @param {string} category
 * @param {object[]} allTransactions
 * @param {object[]} budgetRows
 * @param {object} [transaction]
 */
function computeBudgetProgress(category, allTransactions, budgetRows, transaction) {
  const budget = (budgetRows || []).find((b) => catEq(b.name || b.category || '', category));

  if (!budget) {
    return { hasBudget: false };
  }

  const budgetAmount = Number(budget.amount) || 0;
  const anchor = transaction?.date ? new Date(transaction.date) : new Date();
  const currentMonth = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;

  const spent = allTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        String(t.date || '').startsWith(currentMonth) &&
        catEq(t.category || 'Lainnya', category)
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const remaining = budgetAmount - spent;
  const percentUsed = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

  let status = 'healthy';
  if (percentUsed >= 100) status = 'over';
  else if (percentUsed >= 90) status = 'critical';
  else if (percentUsed >= 75) status = 'warning';

  let warning = '';
  if (status === 'over') {
    warning = `Budget sudah melebihi Rp ${fmt(Math.abs(remaining))}. Perlu evaluasi.`;
  } else if (status === 'critical' || status === 'warning') {
    warning = `Sisa budget Anda untuk kategori ini tinggal Rp ${fmt(remaining)}. Waspada overspending.`;
  }

  return {
    hasBudget: true,
    budgetAmount,
    spent,
    remaining,
    percentUsed,
    status,
    warning,
    priority: budget.priority,
    budgetName: budget.name || budget.category || category,
  };
}

/**
 * @param {object} transaction
 * @param {object[]} allTransactions
 */
function computeSpendingRank(transaction, allTransactions) {
  if (transaction.type !== 'expense') return null;

  const txMonth = String(transaction.date || '').substring(0, 7);
  if (!txMonth) return null;

  const monthExpenses = allTransactions
    .filter((t) => t.type === 'expense' && String(t.date || '').startsWith(txMonth))
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

  const rank = monthExpenses.findIndex((t) => t.id === transaction.id) + 1;
  if (rank <= 0) return null;

  const total = monthExpenses.length;
  const totalSpent = monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const percentOfTotal =
    totalSpent > 0 ? Math.round(((Number(transaction.amount) || 0) / totalSpent) * 100) : 0;

  return { rank, total, percentOfTotal };
}

/**
 * @param {object} transaction
 * @param {object[]} allTransactions
 */
function findSimilarTransactions(transaction, allTransactions) {
  const category = transaction.category || 'Lainnya';
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  return allTransactions
    .filter(
      (t) =>
        t.id !== transaction.id &&
        t.type === transaction.type &&
        catEq(t.category || 'Lainnya', category) &&
        String(t.date || '') >= thirtyDaysAgo
    )
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 3)
    .map((t) => ({
      merchant: t.merchant || t.category,
      amount: t.amount,
      date: t.date,
    }));
}

/**
 * @param {object} transaction
 * @param {object[]} allTransactions
 */
function analyzeDayPattern(transaction, allTransactions) {
  if (!transaction.date) return null;

  const txDate = new Date(transaction.date);
  if (Number.isNaN(txDate.getTime())) return null;

  const dayName = txDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const dayIndex = txDate.getDay();
  const category = transaction.category || 'Lainnya';

  const sameDayTx = allTransactions.filter((t) => {
    if (t.type !== 'expense' || !catEq(t.category || 'Lainnya', category)) return false;
    const d = new Date(t.date);
    return !Number.isNaN(d.getTime()) && d.getDay() === dayIndex;
  });

  const avgOnDay =
    sameDayTx.length > 0
      ? sameDayTx.reduce((s, t) => s + (Number(t.amount) || 0), 0) / sameDayTx.length
      : 0;

  return { dayName, avgOnDay: Math.round(avgOnDay), count: sameDayTx.length };
}

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n || 0)));
}

if (typeof window !== 'undefined') {
  window.monefyiTxInsight = { getTransactionInsight };
}
