/**
 * Auto-generate budget — 50/30/20, copy+improve, learned patterns.
 * @module services/budget-generator
 */

import {
  PRIORITY_LEVELS,
  createBudgetRow,
  createBudgetItem,
  getLinkedTransactions,
} from './budget-model.js';
import { getSuggestedAllocation } from './budget-recommender.js';

const DEFAULT_TEMPLATES = {
  harus: [
    { name: 'Listrik', percent_of_priority: 15 },
    { name: 'Air / PDAM', percent_of_priority: 8 },
    { name: 'Internet', percent_of_priority: 15 },
    { name: 'Kontrakan / KPR', percent_of_priority: 50 },
    { name: 'Cicilan', percent_of_priority: 12 },
  ],
  penting: [
    { name: 'Makan Sehari-hari', percent_of_priority: 45 },
    { name: 'Transportasi', percent_of_priority: 20 },
    { name: 'Kesehatan', percent_of_priority: 10 },
    { name: 'Belanja Kebutuhan', percent_of_priority: 25 },
  ],
  mau: [
    { name: 'Hiburan', percent_of_priority: 40 },
    { name: 'Nongkrong & Kopi', percent_of_priority: 30 },
    { name: 'Hobi', percent_of_priority: 30 },
  ],
  simpan: [
    { name: 'Tabungan', percent_of_priority: 60 },
    { name: 'Dana Darurat', percent_of_priority: 25 },
    { name: 'Investasi', percent_of_priority: 15 },
  ],
};

function getCurrentPeriod() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (state?.selectedMonth) return state.selectedMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonthKey(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthHasBudgets(budgetsByMonth, month) {
  const cats = budgetsByMonth?.[month]?.categories;
  if (!cats) return false;
  if (Array.isArray(cats.rows)) return cats.rows.length > 0;
  return Object.keys(cats).some((k) => k !== 'rows');
}

function rowsForMonth(budgetsByMonth, month) {
  const cats = budgetsByMonth?.[month]?.categories;
  if (!cats) return [];
  if (Array.isArray(cats.rows)) return JSON.parse(JSON.stringify(cats.rows));
  return Object.entries(cats)
    .filter(([k]) => k !== 'rows')
    .map(([name, amount]) => ({ name, amount: Number(amount) || 0, items: [] }));
}

/**
 * @returns {Promise<string>}
 */
export async function detectStrategy() {
  try {
    const state = typeof window !== 'undefined' ? window.STATE : null;
    const currentPeriod = getCurrentPeriod();
    const keys = Object.keys(state?.budgetsByMonth || {})
      .filter((m) => m !== currentPeriod && monthHasBudgets(state.budgetsByMonth, m));
    if (keys.length === 0) return 'no_history';
    if (keys.length >= 3) return 'learned';
    return 'copy_improve';
  } catch {
    return 'no_history';
  }
}

/**
 * Resolve income for budget generation (sources, draft, saved month, transactions).
 * @param {string} [period]
 */
async function resolveBudgetIncome(period) {
  const p = period || getCurrentPeriod();
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const draftIncome = state?.budgetDraft?.month === p ? Number(state.budgetDraft.income || 0) : 0;
  const legacy = draftIncome || Number(state?.budgetsByMonth?.[p]?.income || 0);

  try {
    const { getTotalIncome, migrateLegacyIncome } = await import('./income-source.js');
    await migrateLegacyIncome(p, legacy);
    let income = await getTotalIncome(p);
    if (!income) income = legacy;
    if (!income && state?.transactions?.length) {
      income = state.transactions
        .filter((t) => t.type === 'income' && String(t.date || '').startsWith(p))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }
    return income;
  } catch {
    return legacy;
  }
}

/**
 * @param {object} [options]
 */
export async function generateBudget(options = {}) {
  const strategy = options.strategy || await detectStrategy();
  const period = getCurrentPeriod();
  const income = Number(options.income) || await resolveBudgetIncome(period);

  if (!income || income <= 0) {
    throw new Error('Income belum diisi. Isi Budget Income atau sumber income dulu.');
  }

  let result;
  switch (strategy) {
    case 'copy_improve':
      result = await generateFromLastMonth(income);
      break;
    case 'learned':
      result = await generateFromLearning(income);
      break;
    case 'no_history':
    default:
      result = generateFromRule(income);
      break;
  }

  if (!result?.budgets?.length && typeof window.generateSmartBudgetRows === 'function') {
    const smart = window.generateSmartBudgetRows(income);
    if (smart?.rows?.length) {
      result = {
        budgets: smart.rows.map((r) => createBudgetRow(r)),
        strategy: 'no_history',
        strategy_label: 'Auto Budget',
        summary: {
          total: smart.rows.reduce((s, b) => s + Number(b.amount || 0), 0),
          count: smart.rows.length,
          by_priority: countByPriority(smart.rows),
        },
        explanation: `Auto Budget dari ${smart.source || 'data transaksi & template 50/30/20'}.`,
      };
    }
  }

  if (!result?.budgets?.length) {
    throw new Error('Tidak ada kategori budget yang bisa dibuat. Cek income dan coba lagi.');
  }

  return result;
}

/**
 * @param {number} income
 */
function generateFromRule(income) {
  const allocation = getSuggestedAllocation(income);
  const budgets = [];

  for (const [priorityKey, priorityData] of Object.entries(allocation)) {
    const templates = DEFAULT_TEMPLATES[priorityKey] || [];
    const priorityTotal = priorityData.amount;

    for (const template of templates) {
      const amount = Math.round(priorityTotal * (template.percent_of_priority / 100));
      if (amount < 10000) continue;

      budgets.push(createBudgetRow({
        name: template.name,
        priority: priorityKey,
        amount,
        items: [createBudgetItem({ name: template.name, qty: 1, price: amount, status: 'planned' })],
        auto_link_keywords: [template.name.toLowerCase()],
      }));
    }
  }

  return {
    budgets,
    strategy: 'no_history',
    strategy_label: 'Auto Budget',
    summary: {
      total: budgets.reduce((s, b) => s + b.amount, 0),
      count: budgets.length,
      by_priority: countByPriority(budgets),
    },
    explanation: 'Menggunakan aturan 50/30/20:\n• 35% kebutuhan wajib (Wajib)\n• 40% kebutuhan pokok (Kebutuhan)\n• 10% lifestyle (Keinginan)\n• 15% tabungan (Simpan)',
  };
}

/**
 * @param {number} income
 */
async function generateFromLastMonth(income) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const currentPeriod = getCurrentPeriod();
  const lastPeriod = prevMonthKey(currentPeriod);
  const lastRows = rowsForMonth(state?.budgetsByMonth || {}, lastPeriod);
  const transactions = state?.transactions || [];

  if (!lastRows.length) return generateFromRule(income);

  const budgets = [];
  const improvements = [];

  for (const oldBudget of lastRows) {
    const row = createBudgetRow(oldBudget);
    const spent = getLinkedTransactions(row, transactions, lastPeriod)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    let newAmount = Number(row.amount || 0);

    if (spent > newAmount * 1.15) {
      newAmount = Math.ceil(spent * 1.05 / 10000) * 10000;
      improvements.push(`↑ ${row.name}: ${fmt(newAmount)} (aktual ${fmt(spent)})`);
    } else if (spent < newAmount * 0.7 && spent > 0) {
      newAmount = Math.ceil((spent * 1.1) / 10000) * 10000;
      improvements.push(`↓ ${row.name}: ${fmt(newAmount)} (hemat dari ${fmt(row.amount)})`);
    }

    budgets.push(createBudgetRow({
      ...row,
      id: undefined,
      amount: newAmount,
      items: (row.items || []).map((item) => createBudgetItem({
        ...item,
        id: undefined,
        status: 'planned',
        linked_transactions: [],
        price: item.price || Math.round(newAmount / Math.max(row.items?.length || 1, 1)),
      })),
      last_month_actual: spent,
    }));
  }

  scaleToIncome(budgets, income, improvements);
  return {
    budgets,
    strategy: 'copy_improve',
    strategy_label: 'Salin & Perbaiki dari Bulan Lalu',
    summary: {
      total: budgets.reduce((s, b) => s + b.amount, 0),
      count: budgets.length,
      by_priority: countByPriority(budgets),
    },
    improvements,
    explanation: `Meniru struktur ${monthLabel(lastPeriod)} dengan penyesuaian berdasarkan realisasi.`,
  };
}

/**
 * @param {number} income
 */
async function generateFromLearning(income) {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  const currentPeriod = getCurrentPeriod();
  const transactions = state?.transactions || [];
  const periods = [1, 2, 3].map((n) => {
    let mk = currentPeriod;
    for (let i = 0; i < n; i++) mk = prevMonthKey(mk);
    return mk;
  });

  /** @type {Record<string, object>} */
  const categoryStats = {};

  for (const period of periods) {
    const periodRows = rowsForMonth(state?.budgetsByMonth || {}, period);
    for (const raw of periodRows) {
      const row = createBudgetRow(raw);
      const key = row.name;
      if (!categoryStats[key]) {
        categoryStats[key] = {
          name: row.name,
          priority: row.priority,
          budgets: [],
          actuals: [],
          items: row.items || [],
        };
      }
      const spent = getLinkedTransactions(row, transactions, period)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      categoryStats[key].budgets.push(Number(row.amount || 0));
      categoryStats[key].actuals.push(spent);
    }
  }

  const budgets = [];
  const insights = [];

  for (const stats of Object.values(categoryStats)) {
    if (!stats.actuals.length) continue;
    const avgActual = Math.round(stats.actuals.reduce((a, b) => a + b, 0) / stats.actuals.length);
    let optimalBudget = Math.ceil(avgActual * 1.1 / 10000) * 10000;
    if (optimalBudget < 50000) optimalBudget = 50000;

    const trend = detectTrend(stats.actuals);
    if (trend === 'increasing') {
      optimalBudget = Math.ceil(optimalBudget * 1.05 / 10000) * 10000;
      insights.push(`↗ ${stats.name}: trend naik, +5% buffer`);
    } else if (trend === 'decreasing') {
      insights.push(`↘ ${stats.name}: trend turun, potensi hemat`);
    }

    budgets.push(createBudgetRow({
      name: stats.name,
      priority: stats.priority || 'penting',
      amount: optimalBudget,
      items: stats.items.length
        ? stats.items.map((item) => createBudgetItem({ ...item, id: undefined, status: 'planned', linked_transactions: [] }))
        : [createBudgetItem({ name: stats.name, qty: 1, price: optimalBudget })],
      three_month_avg: avgActual,
      last_month_actual: stats.actuals[0] || 0,
    }));
  }

  scaleToIncome(budgets, income, insights);
  return {
    budgets,
    strategy: 'learned',
    strategy_label: 'Optimized dari 3 Bulan Terakhir',
    summary: {
      total: budgets.reduce((s, b) => s + b.amount, 0),
      count: budgets.length,
      by_priority: countByPriority(budgets),
    },
    insights,
    explanation: 'Menganalisis pola 3 bulan: rata-rata realisasi + buffer 10%, trend dipertimbangkan.',
  };
}

/**
 * @param {object[]} budgets
 * @param {number} income
 * @param {string[]} notes
 */
function scaleToIncome(budgets, income, notes) {
  const total = budgets.reduce((s, b) => s + b.amount, 0);
  if (total <= income || !income) return;
  const scale = income / total;
  budgets.forEach((b) => {
    b.amount = Math.round(b.amount * scale / 10000) * 10000;
    if (b.items?.[0]) {
      b.items[0].price = b.amount;
      b.items[0].subtotal = b.amount;
    }
  });
  notes.push(`Total disesuaikan agar tidak melebihi income (${Math.round(scale * 100)}%)`);
}

function detectTrend(values) {
  if (values.length < 2) return 'stable';
  const [latest, prev, older = prev] = values;
  const recentAvg = (latest + prev) / 2;
  if (!older) return 'stable';
  const diff = ((recentAvg - older) / Math.max(older, 1)) * 100;
  if (diff > 10) return 'increasing';
  if (diff < -10) return 'decreasing';
  return 'stable';
}

function countByPriority(budgets) {
  const counts = { harus: 0, penting: 0, mau: 0, simpan: 0 };
  for (const b of budgets) {
    const key = (b.priority || 'penting').toLowerCase();
    if (counts[key] !== undefined) counts[key] += Number(b.amount || 0);
  }
  return counts;
}

function monthLabel(period) {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {object[]} budgets
 * @param {object} [options]
 */
export async function applyGeneratedBudgets(budgets, options = {}) {
  const { replaceExisting = false } = options;
  const state = typeof window !== 'undefined' ? window.STATE : null;

  if (!state?.budgetDraft) {
    if (typeof window.renderBudgetPageView === 'function') {
      await window.renderBudgetPageView();
    }
  }
  if (!state?.budgetDraft) {
    throw new Error('Budget draft belum siap. Buka halaman Budget dulu.');
  }

  const before = JSON.parse(JSON.stringify(state.budgetDraft.rows || []));
  const normalized = (budgets || []).map((b) => createBudgetRow(b));

  if (replaceExisting) {
    state.budgetDraft.rows = normalized;
  } else {
    state.budgetDraft.rows = [...(state.budgetDraft.rows || []), ...normalized];
  }

  const period = getCurrentPeriod();
  const income = await resolveBudgetIncome(period);
  if (income > 0) state.budgetDraft.income = income;

  const { recordBudgetRowsChange } = await import('./budget-changes-tracker.js');
  recordBudgetRowsChange('Auto Budget', before, state.budgetDraft.rows);
  return normalized.length;
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetGen = {
    detectStrategy,
    generateBudget,
    applyGeneratedBudgets,
  };
}
