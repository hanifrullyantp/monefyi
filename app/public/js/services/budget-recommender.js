/**
 * Rule-based budget recommendation engine (offline).
 * @module services/budget-recommender
 */

import {
  PRIORITY_LEVELS,
  calculateProgress,
  calculatePriorityTotals,
  rowsToBudgetList,
} from './budget-model.js';

/**
 * @param {number} num
 * @returns {string}
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
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
    ?? 0
  ) || estimateIncome(transactions, month);

  const recommendations = [];

  for (const row of rows) {
    const progress = calculateProgress(row, transactions, month);
    if (progress.percentUsed >= 100) {
      recommendations.push({
        type: 'over_budget',
        severity: 'high',
        icon: '⚠️',
        title: `${row.name} over budget`,
        message: `Terpakai ${progress.percentUsed}% (Rp ${formatIDR(progress.spent - row.amount)} lebih)`,
        actions: [
          { label: 'Naikkan budget', action: 'increase_budget', budgetId: row.id },
          { label: 'Realokasi', action: 'reallocate' },
        ],
      });
    }
  }

  const priorityTotals = calculatePriorityTotals(rows, income);
  const harusPercent = priorityTotals.harus?.percentOfIncome || 0;
  const simpanPercent = priorityTotals.simpan?.percentOfIncome || 0;

  if (harusPercent > 50) {
    recommendations.push({
      type: 'priority_imbalance',
      severity: 'medium',
      icon: '📊',
      title: 'HARUS terlalu besar',
      message: `Kategori wajib ${harusPercent}% dari income. Ideal max 40%.`,
      actions: [{ label: 'Review kategori HARUS', action: 'review_priority', priority: 'harus' }],
    });
  }

  if (income > 0 && simpanPercent < 10) {
    recommendations.push({
      type: 'low_savings',
      severity: 'medium',
      icon: '💰',
      title: 'Tabungan terlalu kecil',
      message: `Cuma ${simpanPercent}% untuk simpanan. Ideal minimal 15-20%.`,
      actions: [{ label: 'Tingkatkan tabungan', action: 'increase_savings' }],
    });
  }

  for (const row of rows) {
    if (!row.three_month_avg) continue;
    const progress = calculateProgress(row, transactions, month);
    const predictedVsAvg = ((progress.predictedTotal - row.three_month_avg) / row.three_month_avg) * 100;
    if (Math.abs(predictedVsAvg) > 20) {
      recommendations.push({
        type: 'trend_alert',
        severity: 'medium',
        icon: predictedVsAvg > 0 ? '📈' : '📉',
        title: `${row.name} trend ${predictedVsAvg > 0 ? 'naik' : 'turun'} ${Math.abs(Math.round(predictedVsAvg))}%`,
        message: `vs rata-rata 3 bulan (Rp ${formatIDR(row.three_month_avg)})`,
        actions: [],
      });
    }
  }

  const totalBudget = rows.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const unallocated = income - totalBudget;
  if (income > 0 && unallocated > income * 0.1) {
    recommendations.push({
      type: 'unallocated',
      severity: 'low',
      icon: '💡',
      title: 'Sisa income belum dialokasikan',
      message: `Rp ${formatIDR(unallocated)} bisa masuk tabungan atau kategori lain`,
      actions: [{ label: 'Alokasikan ke tabungan', action: 'add_to_savings' }],
    });
  }

  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.ceil((monthEnd - now) / 86400000);

  for (const row of rows) {
    if (row.priority !== 'penting' && row.priority !== 'mau') continue;
    const progress = calculateProgress(row, transactions, month);
    if (progress.dailyBudget < 10000 && progress.percentUsed < 90 && progress.remaining > 0) {
      recommendations.push({
        type: 'tight_daily',
        severity: 'medium',
        icon: '⏰',
        title: `${row.name}: hanya Rp ${formatIDR(progress.dailyBudget)}/hari`,
        message: `Sisa ${daysLeft} hari, sisa Rp ${formatIDR(progress.remaining)}`,
        actions: [],
      });
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return recommendations;
}

/**
 * @param {object[]} transactions
 * @param {string} month
 * @returns {number}
 */
function estimateIncome(transactions, month) {
  const income = (transactions || [])
    .filter((t) => t.type === 'income' && t.date?.startsWith(month))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  return income || 5500000;
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
    getSuggestedAllocation,
    buildAdvisorBudgetContext,
  };
}
