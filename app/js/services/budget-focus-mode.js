/**
 * Budget focus modes — survive, debt, emergency, irregular income, family.
 * @module services/budget-focus-mode
 */

import { calculateProgress, createBudgetRow, createBudgetItem } from './budget-model.js';
import { computeDailySituation } from './daily-situation.js';

/** @typedef {'survive'|'debt'|'emergency'|'irregular'|'family'} BudgetFocusMode */

export const DEFAULT_FOCUS_MODE = /** @type {BudgetFocusMode} */ ('survive');

export const FOCUS_MODES = {
  survive: {
    key: 'survive',
    label: 'Survive Sampai Gajian',
    shortLabel: 'Survive',
    icon: 'calendar',
    description: 'Pastikan tagihan wajib terbayar, fokus safe-to-spend harian.',
  },
  debt: {
    key: 'debt',
    label: 'Keluar dari Utang',
    shortLabel: 'Utang',
    icon: 'alertTriangle',
    description: 'Alokasi cicilan utang + timeline lunas.',
  },
  emergency: {
    key: 'emergency',
    label: 'Bangun Dana Darurat',
    shortLabel: 'Dana Darurat',
    icon: 'shield',
    description: 'Target 3× pengeluaran bulanan + progress.',
  },
  irregular: {
    key: 'irregular',
    label: 'Income Tidak Tetap',
    shortLabel: 'Freelancer',
    icon: 'trendingUp',
    description: 'Budget dari rata-rata 3 bulan + alert income rendah.',
  },
  family: {
    key: 'family',
    label: 'Keluarga / Pasangan',
    shortLabel: 'Keluarga',
    icon: 'user',
    description: 'Label kategori per anggota (siap multi-user).',
  },
};

/**
 * @param {object} [state]
 * @returns {BudgetFocusMode}
 */
export function getBudgetFocusMode(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const mode = state?.db?.userPreferences?.budget_focus_mode;
  if (mode && FOCUS_MODES[mode]) return /** @type {BudgetFocusMode} */ (mode);
  return DEFAULT_FOCUS_MODE;
}

/**
 * @param {BudgetFocusMode} mode
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveBudgetFocusMode(mode) {
  if (!FOCUS_MODES[mode]) return { success: false, error: 'Mode tidak valid' };
  try {
    const { saveUserPreferences } = await import('./onboarding-prefs.js');
    const existing = window.STATE?.db?.userPreferences || {};
    const result = await saveUserPreferences({ ...existing, budget_focus_mode: mode });
    return { success: !!result.success, error: result.error };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
}

/**
 * @param {object[]} transactions
 * @param {number} months
 * @returns {number}
 */
export function computeAvgMonthlyExpense(transactions = [], months = 3) {
  const now = new Date();
  const buckets = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = transactions
      .filter((t) => {
        const type = String(t.type || 'expense').toLowerCase();
        return (type === 'expense' || type === 'pengeluaran') && String(t.date || '').startsWith(key);
      })
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    if (total > 0) buckets.push(total);
  }
  if (!buckets.length) return 0;
  return buckets.reduce((a, b) => a + b, 0) / buckets.length;
}

/**
 * @param {object[]} transactions
 * @param {number} months
 * @returns {number}
 */
export function computeAvgMonthlyIncome(transactions = [], months = 3) {
  const now = new Date();
  const buckets = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = transactions
      .filter((t) => t.type === 'income' && String(t.date || '').startsWith(key))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    if (total > 0) buckets.push(total);
  }
  if (!buckets.length) return 0;
  return buckets.reduce((a, b) => a + b, 0) / buckets.length;
}

/**
 * Fixed bills from prefs + harus budget rows.
 * @param {object} prefs
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 * @returns {{ items: object[], totalPlanned: number, totalSpent: number, manageable: number, income: number }}
 */
export function computeFixedBillsSection(prefs = {}, rows = [], transactions = [], month, income = 0) {
  const prefBills = Array.isArray(prefs.fixed_bills) ? prefs.fixed_bills : [];
  const harusRows = rows.filter((r) => (r.priority || 'penting') === 'harus');

  const items = [];
  const seen = new Set();

  for (const bill of prefBills) {
    const name = String(bill.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    seen.add(key);
    const row = harusRows.find((r) => String(r.name || '').toLowerCase() === key);
    const planned = Number(row?.amount ?? bill.amount ?? 0);
    const spent = row
      ? calculateProgress(row, transactions, month).spent
      : 0;
    items.push({ name, planned, spent, source: 'pref' });
  }

  for (const row of harusRows) {
    const name = String(row.name || '').trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const prog = calculateProgress(row, transactions, month);
    items.push({ name, planned: Number(row.amount || 0), spent: prog.spent, source: 'budget' });
  }

  const totalPlanned = items.reduce((s, i) => s + i.planned, 0);
  const totalSpent = items.reduce((s, i) => s + i.spent, 0);
  const savePlanned = rows
    .filter((r) => r.priority === 'simpan')
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const manageable = Math.max(0, Number(income || 0) - totalPlanned - savePlanned);

  return { items, totalPlanned, totalSpent, manageable, income: Number(income || 0), savePlanned };
}

/**
 * Mode-specific focus metrics for budget page panel.
 * @param {BudgetFocusMode} mode
 * @param {object} ctx
 * @returns {object}
 */
export function computeFocusInsights(mode, ctx = {}) {
  const {
    income = 0,
    rows = [],
    transactions = [],
    month = '',
    prefs = {},
  } = ctx;

  const fixed = computeFixedBillsSection(prefs, rows, transactions, month, income);
  const situation = computeDailySituation(typeof window !== 'undefined' ? window.STATE : {});

  /** @type {object} */
  const base = {
    mode,
    modeInfo: FOCUS_MODES[mode] || FOCUS_MODES.survive,
    fixed,
    headline: '',
    detail: '',
    metricLabel: '',
    metricValue: '',
    alert: null,
  };

  switch (mode) {
    case 'debt': {
      const debt = Number(prefs.debt_amount || 0);
      const debtName = prefs.debt_name || 'Utang';
      const cicilanRow = rows.find((r) => /cicilan|utang|kredit/i.test(String(r.name || '')));
      const monthlyPay = cicilanRow
        ? Number(cicilanRow.amount || 0)
        : (debt > 0 ? Math.max(500000, Math.round(debt / 24)) : 0);
      const monthsLeft = debt > 0 && monthlyPay > 0 ? Math.ceil(debt / monthlyPay) : null;
      const payoffDate = monthsLeft
        ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsLeft, 1)
        : null;
      base.headline = debt > 0
        ? `Fokus lunasi ${debtName}: ${fmt(debt)} tersisa`
        : 'Belum ada nominal utang — isi di onboarding atau tambah kategori cicilan';
      base.detail = monthsLeft && payoffDate
        ? `Lunas perkiraan: ${payoffDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} (${monthsLeft} bulan @ ${fmt(monthlyPay)}/bln)`
        : 'Tetapkan alokasi cicilan di kategori Wajib.';
      base.metricLabel = 'Target cicilan bulan ini';
      base.metricValue = fmt(monthlyPay);
      break;
    }
    case 'emergency': {
      const avgExp = computeAvgMonthlyExpense(transactions, 3) || fixed.totalSpent || 0;
      const target = Math.round(avgExp * 3);
      const simpanRows = rows.filter((r) => r.priority === 'simpan');
      const collected = simpanRows.reduce((s, b) => {
        const prog = calculateProgress(b, transactions, month);
        return s + Math.max(0, Number(b.amount || 0) - prog.spent);
      }, 0);
      const pct = target > 0 ? Math.round((collected / target) * 100) : 0;
      const gap = Math.max(0, target - collected);
      const monthlySave = Number(simpanRows.reduce((s, b) => s + Number(b.amount || 0), 0)) || Math.round(gap / 12);
      const monthsToGoal = monthlySave > 0 ? Math.ceil(gap / monthlySave) : null;
      base.headline = `Target dana darurat: ${fmt(target)} (3× pengeluaran)`;
      base.detail = monthsToGoal
        ? `Progress ${pct}% — sisihkan ${fmt(monthlySave)}/bln → ±${monthsToGoal} bulan lagi`
        : `Progress ${pct}% — tambah alokasi kategori Simpan`;
      base.metricLabel = 'Terkumpul';
      base.metricValue = `${fmt(collected)} (${pct}%)`;
      break;
    }
    case 'irregular': {
      const avgInc = computeAvgMonthlyIncome(transactions, 3);
      const currentInc = income;
      const below = avgInc > 0 && currentInc < avgInc * 0.85;
      base.headline = avgInc > 0
        ? `Rata-rata income 3 bulan: ${fmt(avgInc)}`
        : 'Belum cukup data income — catat pemasukan per proyek/minggu';
      base.detail = below
        ? `⚠️ Bulan ini ${fmt(currentInc)} — di bawah rata-rata (${Math.round((1 - currentInc / avgInc) * 100)}% lebih rendah)`
        : `Budget disarankan dari rata-rata, bukan angka bulan ini saja.`;
      base.metricLabel = 'Income bulan ini';
      base.metricValue = fmt(currentInc);
      if (below) base.alert = 'income_low';
      break;
    }
    case 'family': {
      const tagged = rows.filter((r) => r.member_label || r.memberLabel);
      base.headline = 'Mode keluarga — tandai kategori per anggota';
      base.detail = tagged.length
        ? `${tagged.length} kategori sudah berlabel anggota`
        : 'Edit kategori budget → tambahkan label anggota (Ayah/Ibu/Anak/dll)';
      base.metricLabel = 'Kategori bertag';
      base.metricValue = String(tagged.length);
      break;
    }
    case 'survive':
    default: {
      base.headline = situation.status === 'incomplete'
        ? 'Lengkapi income & tagihan wajib dulu'
        : `Aman pakai hari ini: ${fmt(situation.safeToSpend || 0)}`;
      base.detail = situation.paydayLabel
        ? `Gajian lagi ${situation.daysToPayday} hari · Prediksi akhir periode: ${fmt(situation.predictedEndBalance)}`
        : 'Fokus: tagihan wajib dulu, sisanya untuk kebutuhan harian.';
      base.metricLabel = 'Uang bisa dikelola';
      base.metricValue = fmt(fixed.manageable);
      break;
    }
  }

  return base;
}

/**
 * Post-process auto-generated budgets for focus mode.
 * @param {object[]} budgets
 * @param {BudgetFocusMode} mode
 * @param {number} income
 * @param {object} prefs
 * @returns {object[]}
 */
export function adjustBudgetsForFocusMode(budgets, mode, income, prefs = {}) {
  let rows = [...(budgets || [])];

  const ensureFixedFromPrefs = () => {
    const bills = Array.isArray(prefs.fixed_bills) ? prefs.fixed_bills : [];
    const names = new Set(rows.map((r) => String(r.name || '').toLowerCase()));
    for (const bill of bills) {
      const name = String(bill.name || '').trim();
      if (!name || names.has(name.toLowerCase())) continue;
      rows.push(createBudgetRow({
        name,
        priority: 'harus',
        amount: Number(bill.amount) || 0,
        items: [createBudgetItem({ name, qty: 1, price: Number(bill.amount) || 0 })],
        auto_link_keywords: [name.toLowerCase()],
      }));
      names.add(name.toLowerCase());
    }
  };

  switch (mode) {
    case 'survive':
      ensureFixedFromPrefs();
      rows = rows.map((r) => {
        if (r.priority === 'mau') {
          return { ...r, amount: Math.round(Number(r.amount || 0) * 0.7) };
        }
        return r;
      });
      break;
    case 'debt': {
      ensureFixedFromPrefs();
      const debt = Number(prefs.debt_amount || 0);
      const hasCicilan = rows.some((r) => /cicilan utang|utang/i.test(String(r.name || '')));
      if (debt > 0 && !hasCicilan) {
        const pay = Math.max(500000, Math.round(debt / 24));
        rows.push(createBudgetRow({
          name: prefs.debt_name ? `Cicilan ${prefs.debt_name}` : 'Cicilan Utang',
          priority: 'harus',
          amount: Math.min(pay, Math.round(income * 0.25)),
          items: [createBudgetItem({ name: 'Cicilan', qty: 1, price: pay })],
          auto_link_keywords: ['cicilan', 'utang'],
        }));
      }
      rows = rows.map((r) => (r.priority === 'mau'
        ? { ...r, amount: Math.round(Number(r.amount || 0) * 0.5) }
        : r));
      break;
    }
    case 'emergency': {
      const avgExp = computeAvgMonthlyExpense(
        typeof window !== 'undefined' ? (window.STATE?.transactions || []) : [],
        3,
      ) || income * 0.6;
      const monthlyTarget = Math.round((avgExp * 3) / 12);
      const hasEmergency = rows.some((r) => /darurat|emergency/i.test(String(r.name || '')));
      if (!hasEmergency && monthlyTarget > 0) {
        rows.push(createBudgetRow({
          name: 'Dana Darurat',
          priority: 'simpan',
          amount: monthlyTarget,
          items: [createBudgetItem({ name: 'Sisihkan', qty: 1, price: monthlyTarget })],
          auto_link_keywords: ['darurat', 'tabungan'],
        }));
      }
      break;
    }
    case 'irregular':
      ensureFixedFromPrefs();
      break;
    case 'family':
      rows = rows.map((r, i) => ({
        ...r,
        member_label: r.member_label || (i % 2 === 0 ? 'Keluarga' : ''),
      }));
      break;
    default:
      break;
  }

  return rows;
}

/**
 * Resolve income for irregular mode (avg 3 months).
 * @param {number} currentIncome
 * @param {BudgetFocusMode} mode
 * @param {object[]} transactions
 * @returns {number}
 */
export function resolveFocusIncome(currentIncome, mode, transactions = []) {
  if (mode !== 'irregular') return currentIncome;
  const avg = computeAvgMonthlyIncome(transactions, 3);
  return avg > 0 ? Math.round(avg) : currentIncome;
}
