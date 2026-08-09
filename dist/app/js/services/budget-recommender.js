/**
 * Rule-based budget recommendation engine (offline).
 * @module services/budget-recommender
 */

import {
  PRIORITY_LEVELS,
  calculateProgress,
  calculatePriorityTotals,
  rowsToBudgetList,
  inferCategoryType,
  CATEGORY_TYPES,
  isFlexibleOverBudget,
} from './budget-model.js';

/**
 * @param {number} num
 * @returns {string}
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {object[]} transactions
 * @param {object[]} rows
 * @returns {object[]}
 */
export function detectAnomalies(transactions, rows) {
  const flexibleRows = (rows || []).filter((r) => inferCategoryType(r) === CATEGORY_TYPES.FLEXIBLE);
  const flexibleNames = new Set(flexibleRows.map((r) => String(r.name || '').toLowerCase()));
  const flexibleTxs = (transactions || []).filter((t) => {
    if (t.type !== 'expense') return false;
    const cat = String(t.category || t.merchant || '').toLowerCase();
    return [...flexibleNames].some((n) => cat.includes(n) || n.includes(cat));
  });
  const amounts = flexibleTxs.map((t) => Math.abs(Number(t.amount || 0))).filter((a) => a > 0);
  if (amounts.length < 3) return [];
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 3;
  return flexibleTxs
    .filter((t) => Math.abs(Number(t.amount || 0)) > threshold)
    .slice(0, 3)
    .map((t) => ({
      name: t.merchant || t.category || 'Transaksi',
      amount: Number(t.amount || 0),
      date: t.date,
    }));
}

/**
 * @param {object} [options]
 * @returns {Promise<object[]>}
 */
export async function generateRecommendations(options = {}) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const month = options.month || state?.selectedMonth || getCurrentPeriod();
  const rows = options.budgets || rowsToBudgetList(month, state?.budgetsByMonth || {});
  const transactions = options.transactions || state?.transactions || [];
  const income = Number(
    options.income
    ?? state?.budgetsByMonth?.[month]?.income
    ?? 0,
  ) || estimateIncome(transactions, month);

  /** @type {object[]} */
  const recommendations = [];
  const now = new Date();
  const daysPassed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Priority 1: Flexible over 100%
  for (const row of rows) {
    if (!isFlexibleOverBudget(row, transactions, month)) continue;
    const progress = calculateProgress(row, transactions, month);
    recommendations.push({
      priority: 1,
      type: 'reduce_category',
      severity: 'high',
      icon: '⚠️',
      title: `${row.name} over budget`,
      message: `Kategori ${row.name} sudah ${progress.percentUsed}%. Coba tahan sampai akhir bulan.`,
      category: row.name,
      actions: [
        { label: `Freeze ${row.name}`, action: 'decrease_budget', budgetId: row.id },
      ],
    });
  }

  // Priority 2: Flexible 70–99%
  for (const row of rows) {
    if (inferCategoryType(row) !== CATEGORY_TYPES.FLEXIBLE) continue;
    const progress = calculateProgress(row, transactions, month);
    if (progress.percentUsed >= 70 && progress.percentUsed < 100) {
      recommendations.push({
        priority: 2,
        type: 'watch_category',
        severity: 'medium',
        icon: '👀',
        title: `${row.name} mendekati batas`,
        message: `${row.name} sudah ${progress.percentUsed}% — perhatikan pengeluaran ini.`,
        category: row.name,
        actions: [],
      });
    }
  }

  // Priority 3: Anomalies
  for (const a of detectAnomalies(transactions, rows)) {
    recommendations.push({
      priority: 3,
      type: 'anomaly',
      severity: 'medium',
      icon: '🔍',
      title: 'Transaksi tidak biasa',
      message: `Transaksi "${a.name}" Rp ${formatIDR(a.amount)} lebih besar dari biasanya.`,
      actions: [],
    });
  }

  // Priority 4: Saving behind pace
  for (const row of rows) {
    if (inferCategoryType(row) !== CATEGORY_TYPES.SAVING) continue;
    const progress = calculateProgress(row, transactions, month);
    if (daysPassed > daysInMonth / 2 && progress.percentUsed < 50) {
      recommendations.push({
        priority: 4,
        type: 'saving',
        severity: 'low',
        icon: '💰',
        title: 'Progress tabungan lambat',
        message: `Progress tabungan ${row.name} baru ${progress.percentUsed}%. Yuk sisihkan lagi.`,
        actions: [{ label: 'Lihat tabungan', action: 'view_category', budgetId: row.id }],
      });
    }
  }

  const flexibleOver = recommendations.filter((r) => r.type === 'reduce_category');
  if (!flexibleOver.length) {
    const fixedPaid = rows.filter((r) => {
      const p = calculateProgress(r, transactions, month);
      return inferCategoryType(r) === CATEGORY_TYPES.FIXED_BILL && p.status === 'paid';
    });
    if (fixedPaid.length > 0) {
      recommendations.push({
        priority: 5,
        type: 'fixed_bills_ok',
        severity: 'low',
        icon: '✅',
        title: 'Tagihan tetap lunas',
        message: 'Semua tagihan tetap sudah dibayar. Fokus jaga pengeluaran fleksibel: Makan, Hiburan, dll.',
        actions: [],
      });
    }
  }

  const priorityTotals = calculatePriorityTotals(rows, income);
  const harusPercent = priorityTotals.harus?.percentOfIncome || 0;
  if (harusPercent > 50) {
    recommendations.push({
      priority: 6,
      type: 'priority_imbalance',
      severity: 'medium',
      icon: '📊',
      title: 'HARUS terlalu besar',
      message: `Kategori wajib ${harusPercent}% dari income. Ideal max 40%.`,
      actions: [{ label: 'Review kategori HARUS', action: 'review_priority', priority: 'harus' }],
    });
  }

  recommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  return recommendations;
}

/**
 * @param {object[]} transactions
 * @param {string} month
 * @returns {number}
 */
function estimateIncome(transactions, month) {
  return (transactions || [])
    .filter((t) => t.type === 'income' && t.date?.startsWith(month))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

/**
 * @returns {string}
 */
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {number} income
 * @returns {object}
 */
export function getSuggestedAllocation(income) {
  return {
    harus: {
      percent: 35,
      amount: Math.round(income * 0.35),
      description: 'Kebutuhan wajib (listrik, air, cicilan)',
    },
    penting: {
      percent: 40,
      amount: Math.round(income * 0.40),
      description: 'Kebutuhan pokok (makan, transport)',
    },
    mau: {
      percent: 10,
      amount: Math.round(income * 0.10),
      description: 'Hiburan & lifestyle',
    },
    simpan: {
      percent: 15,
      amount: Math.round(income * 0.15),
      description: 'Tabungan & investasi',
    },
  };
}

/**
 * @param {object[]} recommendations
 * @param {Record<string, object>} priorityTotals
 * @returns {string}
 */
export function buildAdvisorBudgetContext(recommendations, priorityTotals) {
  const lines = ['Konteks Budget Bulan Ini:'];

  for (const pl of Object.values(PRIORITY_LEVELS)) {
    const data = priorityTotals[pl.key];
    if (!data) continue;
    lines.push(`- ${pl.label}: Rp ${formatIDR(data.amount)} (${data.percentOfIncome}% income, ${data.count} kategori)`);
  }

  if (recommendations?.length) {
    lines.push('', 'Rekomendasi rule-based:');
    for (const rec of recommendations.slice(0, 5)) {
      lines.push(`- [${rec.severity}] ${rec.title}: ${rec.message}`);
    }
  }

  return lines.join('\n');
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetRecommender = {
    generateRecommendations,
    detectAnomalies,
    getSuggestedAllocation,
    buildAdvisorBudgetContext,
  };
}
