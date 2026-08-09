/**
 * Enhanced budget model — 5-pillar support on existing categories.rows[] schema.
 * @module services/budget-model
 */

import { LABELS } from '../constants/language.js';

export const PRIORITY_LEVELS = {
  HARUS: {
    key: 'harus',
    label: LABELS.PRIORITY.harus,
    description: 'Tidak bisa ditunda (listrik, kontrakan, cicilan)',
    color: '#1e40af',
    icon: 'target',
    order: 1,
    typical_percent: 35,
    default_budgets: ['Listrik', 'Air', 'Kontrakan', 'Cicilan', 'Internet'],
  },
  PENTING: {
    key: 'penting',
    label: LABELS.PRIORITY.penting,
    description: 'Kebutuhan pokok (makan, transport, kesehatan)',
    color: '#3b82f6',
    icon: 'shoppingBag',
    order: 2,
    typical_percent: 40,
    default_budgets: ['Makan', 'Transport', 'Kesehatan', 'Belanja Pasar'],
  },
  MAU: {
    key: 'mau',
    label: LABELS.PRIORITY.mau,
    description: 'Ingin tapi bisa ditunda (hiburan, jajan, hobi)',
    color: '#eab308',
    icon: 'sparkles',
    order: 3,
    typical_percent: 15,
    default_budgets: ['Hiburan', 'Nongkrong', 'Jajan', 'Hobi'],
  },
  SIMPAN: {
    key: 'simpan',
    label: LABELS.PRIORITY.simpan,
    description: 'Tabungan & investasi masa depan',
    color: '#10b981',
    icon: 'wallet',
    order: 4,
    typical_percent: 10,
    default_budgets: ['Tabungan', 'Emergency Fund', 'Investasi'],
  },
};

export const TARGET_TYPES = {
  MONTHLY: { key: 'monthly', label: 'Bulanan', description: 'Reset setiap bulan' },
  WEEKLY: { key: 'weekly', label: 'Mingguan', description: 'Reset setiap minggu' },
  ONE_TIME: { key: 'one-time', label: 'Sekali Bayar', description: 'Target tanggal spesifik' },
  FLEXIBLE: { key: 'flexible', label: 'Fleksibel', description: 'Tanpa batas waktu' },
};

const PRIORITY_KEYS = Object.values(PRIORITY_LEVELS).map((p) => p.key);

const HARUS_HINTS = ['listrik', 'air', 'kontrakan', 'sewa', 'cicilan', 'internet', 'tagihan', 'bpjs'];
const SIMPAN_HINTS = ['tabungan', 'simpan', 'invest', 'emergency', 'dana darurat'];
const MAU_HINTS = ['hiburan', 'nongkrong', 'jajan', 'hobi', 'game', 'netflix'];

/** @type {{ value: string, label: string }[]} */
export const BUDGET_UNITS = [
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'gr', label: 'Gr' },
  { value: 'liter', label: 'Liter' },
  { value: 'ml', label: 'Ml' },
  { value: 'pack', label: 'Pack' },
  { value: 'botol', label: 'Botol' },
  { value: 'porsi', label: 'Porsi' },
  { value: 'kali', label: 'Kali' },
  { value: 'bulan', label: 'Bulan' },
  { value: 'minggu', label: 'Minggu' },
  { value: 'orang', label: 'Orang' },
  { value: 'unit', label: 'Unit' },
];

/**
 * @returns {string}
 */
export function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {unknown} s
 * @returns {string}
 */
export function normalizeCategoryName(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @param {string} name
 * @returns {string}
 */
function inferPriorityFromName(name) {
  const lower = normalizeCategoryName(name);
  if (HARUS_HINTS.some((h) => lower.includes(h))) return 'harus';
  if (SIMPAN_HINTS.some((h) => lower.includes(h))) return 'simpan';
  if (MAU_HINTS.some((h) => lower.includes(h))) return 'mau';
  return 'penting';
}

/**
 * @param {string} name
 * @returns {string[]}
 */
function defaultKeywordsFromName(name) {
  const n = String(name || '').trim();
  if (!n) return [];
  const words = n.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return words.length ? [...new Set([n.toLowerCase(), ...words])] : [n.toLowerCase()];
}

/**
 * @param {object} data
 * @returns {object}
 */
export function createBudgetLineItem(data = {}) {
  return {
    id: data.id || `bl_${crypto.randomUUID()}`,
    name: data.name || '',
    qty: Number(data.qty) || 1,
    unit: data.unit || 'pcs',
    amount: Number(data.amount ?? 0) || 0,
  };
}

/**
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function hasActiveLineItems(item) {
  return (item?.line_items || []).some(
    (line) => String(line.name || '').trim() || Number(line.amount) > 0,
  );
}

/**
 * @param {object|null|undefined} item
 * @returns {number}
 */
export function getItemTotalAmount(item) {
  if (!item) return 0;
  if (hasActiveLineItems(item)) {
    const total = (item.line_items || []).reduce((s, line) => s + Math.abs(Number(line.amount || 0)), 0);
    item.qty = 1;
    item.price = total;
    item.subtotal = total;
    return total;
  }
  const total = Number(item.qty || 1) * Number(item.price || 0);
  item.subtotal = total;
  return total;
}

/**
 * Sync item.price from line_items when breakdown is active.
 * @param {object|null|undefined} item
 */
export function syncItemAmountFromLines(item) {
  if (!item || !hasActiveLineItems(item)) return;
  getItemTotalAmount(item);
}

/**
 * @param {object} data
 * @returns {object}
 */
export function createBudgetItem(data = {}) {
  const qty = Number(data.qty) || 1;
  const price = Number(data.price ?? data.unit_price ?? 0) || 0;
  return {
    id: data.id || `item_${crypto.randomUUID()}`,
    name: data.name || '',
    qty,
    price,
    subtotal: qty * price,
    priority: data.priority || null,
    target_date: data.target_date || null,
    target_date_day: data.target_date_day || extractDayFromDate(data.target_date) || null,
    status: data.status || 'planned',
    notes: data.notes || '',
    linked_transactions: Array.isArray(data.linked_transactions) ? [...data.linked_transactions] : [],
    line_items: Array.isArray(data.line_items)
      ? data.line_items.map((line) => createBudgetLineItem(line))
      : [],
  };
}

/**
 * @param {string|null} iso
 * @returns {string|null}
 */
function extractDayFromDate(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^\d{4}-\d{2}-(\d{2})/);
  return m ? String(parseInt(m[1], 10)) : null;
}

/**
 * Sync item schedule fields from ISO date (or clear when empty).
 * @param {object} item
 * @param {string|null|undefined} isoDate YYYY-MM-DD
 */
export function syncItemTargetDate(item, isoDate) {
  if (!item) return;
  const iso = isoDate ? String(isoDate).slice(0, 10) : '';
  if (!iso) {
    item.target_date = null;
    item.target_date_day = null;
    return;
  }
  item.target_date = iso;
  item.target_date_day = extractDayFromDate(iso);
}

export const CATEGORY_TYPES = {
  FIXED_BILL: 'fixed_bill',
  FLEXIBLE: 'flexible',
  SAVING: 'saving',
};

/**
 * @param {object} row
 * @param {object} [prefs]
 * @returns {'fixed_bill'|'flexible'|'saving'}
 */
export function inferCategoryType(row, prefs = {}) {
  if (row?.category_type === CATEGORY_TYPES.FIXED_BILL
    || row?.category_type === CATEGORY_TYPES.FLEXIBLE
    || row?.category_type === CATEGORY_TYPES.SAVING) {
    return row.category_type;
  }
  if (row?.priority === 'simpan') return CATEGORY_TYPES.SAVING;
  const name = String(row?.name || '').toLowerCase();
  const bills = Array.isArray(prefs?.fixed_bills) ? prefs.fixed_bills : [];
  if (bills.some((b) => String(b.name || '').toLowerCase() === name)) return CATEGORY_TYPES.FIXED_BILL;
  if (row?.priority === 'harus') return CATEGORY_TYPES.FIXED_BILL;
  return CATEGORY_TYPES.FLEXIBLE;
}

/** UI labels per internal status */
export const BUDGET_STATUS_LABELS = {
  paid: 'Lunas',
  pending: 'Belum lunas',
  overpaid: 'Lebih bayar',
  healthy: 'Aman',
  warning: 'Waspada',
  critical: 'Kritis',
  over: 'Over',
  achieved: 'Tercapai',
  in_progress: 'Dalam progres',
  exceeded: 'Melebihi target',
};

/**
 * @param {string} status
 * @returns {string}
 */
export function getBudgetStatusLabel(status) {
  return BUDGET_STATUS_LABELS[status] || status;
}

/**
 * Avoid redundant "Kost Lunas" + badge "Lunas" (Roadmap Fase 1.3).
 * @param {string} name
 * @param {string} status
 * @returns {{ title: string, subtitle: string|null, hideStatusBadge: boolean }}
 */
export function formatBudgetRowLabels(name, status) {
  const raw = String(name || '').trim();
  if (status === 'paid' && /\blunas\b/i.test(raw)) {
    const title = raw.replace(/\s*[-–]?\s*lunas\s*/gi, ' ').replace(/\s+/g, ' ').trim() || raw;
    return { title, subtitle: '✅ Lunas', hideStatusBadge: true };
  }
  if (status === 'paid') {
    return { title: raw, subtitle: '✅ Lunas', hideStatusBadge: true };
  }
  return { title: raw, subtitle: null, hideStatusBadge: false };
}

/**
 * @param {string} status
 * @returns {string}
 */
export function getBudgetStatusClass(status) {
  if (status === 'paid' || status === 'achieved' || status === 'exceeded' || status === 'healthy') return 'status-ok';
  if (status === 'pending' || status === 'in_progress' || status === 'warning') return 'status-warn';
  if (status === 'critical') return 'status-critical';
  if (status === 'over' || status === 'overpaid') return 'over';
  return '';
}

/**
 * @param {object} row
 * @param {object[]} transactions
 * @param {string} [month]
 * @returns {boolean}
 */
export function isFlexibleOverBudget(row, transactions, month) {
  if (inferCategoryType(row) !== CATEGORY_TYPES.FLEXIBLE) return false;
  return calculateProgress(row, transactions, month).status === 'over';
}

/**
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} [month]
 * @returns {number}
 */
export function countFlexibleOverBudget(rows, transactions, month) {
  return (rows || []).filter((b) => isFlexibleOverBudget(b, transactions, month)).length;
}

/**
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} [month]
 * @returns {number}
 */
export function countFlexibleAttentionRows(rows, transactions, month) {
  return (rows || []).filter((b) => {
    if (inferCategoryType(b) !== CATEGORY_TYPES.FLEXIBLE) return false;
    const s = calculateProgress(b, transactions, month).status;
    return s === 'critical' || s === 'warning';
  }).length;
}

/**
 * @param {object} data
 * @returns {object}
 */
export function createBudgetRow(data = {}) {
  const items = (data.items || []).map((item) => createBudgetItem(item));
  const amountFromItems = items.reduce((sum, i) => sum + getItemTotalAmount(i), 0);
  const name = data.name || data.category || '';
  const prefs = typeof window !== 'undefined' ? (window.STATE?.db?.userPreferences || {}) : {};

  return {
    id: data.id || crypto.randomUUID(),
    name,
    amount: Number(data.amount) || amountFromItems || 0,
    items,
    priority: data.priority || inferPriorityFromName(name),
    category_type: data.category_type || inferCategoryType({ ...data, name }, prefs),
    target_start: data.target_start || null,
    target_end: data.target_end || null,
    target_type: data.target_type || 'monthly',
    auto_link_keywords: Array.isArray(data.auto_link_keywords) && data.auto_link_keywords.length
      ? [...data.auto_link_keywords]
      : defaultKeywordsFromName(name),
    auto_link_enabled: data.auto_link_enabled !== false,
    allow_overspend: data.allow_overspend !== false,
    rollover_enabled: data.rollover_enabled === true,
    notification_thresholds: Array.isArray(data.notification_thresholds)
      ? [...data.notification_thresholds]
      : [75, 100],
    last_month_actual: Number(data.last_month_actual) || 0,
    three_month_avg: Number(data.three_month_avg) || 0,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

/**
 * @param {object} row
 * @returns {object}
 */
export function normalizeBudgetRow(row) {
  if (!row) return createBudgetRow({});
  const normalized = createBudgetRow(row);
  normalized.id = row.id || normalized.id;
  normalized.created_at = row.created_at || normalized.created_at;
  normalized.updated_at = new Date().toISOString();
  return normalized;
}

/**
 * @param {object} categories
 * @returns {{ rows: object[] }}
 */
export function migrateBudgetCategories(categories) {
  if (!categories) return { rows: [] };

  let rows = [];

  if (Array.isArray(categories.rows)) {
    rows = categories.rows.map((r) => normalizeBudgetRow(r));
  } else if (typeof categories === 'object') {
    for (const [cat, amt] of Object.entries(categories)) {
      if (cat === 'rows') continue;
      rows.push(createBudgetRow({ name: cat, amount: Number(amt) || 0, items: [] }));
    }
  }

  return { rows };
}

/**
 * @param {object[]} rows
 * @returns {object[]}
 */
export function serializeBudgetRows(rows) {
  return (rows || []).map((r) => {
    const row = normalizeBudgetRow(r);
    return {
      id: row.id,
      name: row.name,
      amount: row.amount,
      items: (row.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        priority: item.priority,
        target_date: item.target_date,
        target_date_day: item.target_date_day || extractDayFromDate(item.target_date),
        status: item.status,
        notes: item.notes,
        linked_transactions: item.linked_transactions || [],
        line_items: (item.line_items || []).map((line) => ({
          id: line.id,
          name: line.name,
          qty: line.qty,
          unit: line.unit,
          amount: line.amount,
        })),
      })),
      priority: row.priority,
      category_type: row.category_type || inferCategoryType(row),
      target_start: row.target_start,
      target_end: row.target_end,
      target_type: row.target_type,
      auto_link_keywords: row.auto_link_keywords,
      auto_link_enabled: row.auto_link_enabled,
      allow_overspend: row.allow_overspend,
      rollover_enabled: row.rollover_enabled,
      notification_thresholds: row.notification_thresholds,
      last_month_actual: row.last_month_actual,
      three_month_avg: row.three_month_avg,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

/**
 * @param {string} month YYYY-MM
 * @param {Record<string, object>} budgetsByMonth
 * @returns {object[]}
 */
export function rowsToBudgetList(month, budgetsByMonth) {
  const b = budgetsByMonth?.[month];
  if (!b?.categories) return [];
  const migrated = migrateBudgetCategories(b.categories);
  return migrated.rows;
}

/**
 * @param {object} transaction
 * @param {object} row
 * @returns {boolean}
 */
export function matchesAutoLink(transaction, row) {
  if (!row?.auto_link_enabled) return false;
  const keywords = row.auto_link_keywords;
  if (!keywords?.length) return false;

  const text = [
    transaction.category,
    transaction.merchant,
    transaction.notes,
    transaction.description,
  ].filter(Boolean).join(' ').toLowerCase();

  return keywords.some((kw) => text.includes(String(kw).toLowerCase()));
}

/**
 * @param {object} row
 * @param {object[]} transactions
 * @param {string} [month] YYYY-MM
 * @returns {object[]}
 */
export function getLinkedTransactions(row, transactions, month) {
  const rowId = row.id;
  const catNorm = normalizeCategoryName(row.name);

  return (transactions || []).filter((t) => {
    if (t.type !== 'expense') return false;
    if (month && t.date && !t.date.startsWith(month)) return false;

    const meta = typeof t.meta === 'object' ? t.meta : {};
    if (meta.budget_id === rowId) return true;
    if (normalizeCategoryName(t.category) === catNorm) return true;
    if (matchesAutoLink(t, row)) return true;
    return false;
  });
}

/**
 * @param {object} row
 * @param {object[]} transactions
 * @param {string} [month]
 * @returns {object}
 */
export function calculateProgress(row, transactions, month) {
  const linked = getLinkedTransactions(row, transactions, month);
  // Amounts are stored as positive; use abs for legacy negative expenses
  const spent = linked.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);
  const budgetAmount = Math.abs(Number(row.amount || 0));
  const remaining = budgetAmount - spent;
  const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((monthEnd - now) / 86400000));
  const dailyBudget = daysLeft > 0 ? remaining / daysLeft : 0;

  let status = 'healthy';
  const categoryType = inferCategoryType(row);

  if (categoryType === CATEGORY_TYPES.FIXED_BILL) {
    if (percentUsed > 100) status = 'overpaid';
    else if (percentUsed >= 100) status = 'paid';
    else status = 'pending';
  } else if (categoryType === CATEGORY_TYPES.SAVING) {
    if (percentUsed >= 100) status = percentUsed > 100 ? 'exceeded' : 'achieved';
    else status = 'in_progress';
  } else if (percentUsed > 100) {
    status = 'over';
  } else if (percentUsed > 90) {
    status = 'critical';
  } else if (percentUsed >= 70) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  const daysPassed = now.getDate();
  const dailyAvg = daysPassed > 0 ? spent / daysPassed : 0;
  const daysInMonth = monthEnd.getDate();
  const predictedTotal = dailyAvg * daysInMonth;

  return {
    spent,
    remaining,
    percentUsed: Math.round(percentUsed),
    daysLeft,
    dailyBudget: Math.round(dailyBudget),
    dailyAvg: Math.round(dailyAvg),
    predictedTotal: Math.round(predictedTotal),
    status,
    categoryType,
    transactionCount: linked.length,
    linkedTransactions: linked,
  };
}

/**
 * @param {object} transaction
 * @param {object[]} rows
 * @returns {{ budget: object, confidence: number, reason: string }|null}
 */
export function suggestBudget(transaction, rows) {
  if (!transaction || !rows?.length) return null;

  const meta = typeof transaction.meta === 'object' ? transaction.meta : {};
  if (meta.budget_id) {
    const byId = rows.find((b) => b.id === meta.budget_id);
    if (byId) return { budget: byId, confidence: 0.98, reason: 'existing_link' };
  }

  const catNorm = normalizeCategoryName(transaction.category);
  const exactMatch = rows.find((b) => normalizeCategoryName(b.name) === catNorm);
  if (exactMatch) return { budget: exactMatch, confidence: 0.95, reason: 'category_match' };

  const keywordMatch = rows.find((b) => matchesAutoLink(transaction, b));
  if (keywordMatch) return { budget: keywordMatch, confidence: 0.85, reason: 'keyword_match' };

  const txText = `${transaction.merchant || ''} ${transaction.notes || ''}`.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const row of rows) {
    for (const item of row.items || []) {
      if (!item.name) continue;
      const itemText = item.name.toLowerCase();
      let score = 0;
      if (txText.includes(itemText) || itemText.includes(txText.trim())) score += 0.5;
      const itemAmt = (item.qty || 1) * (item.price || 0);
      const txAmt = Number(transaction.amount || 0);
      if (itemAmt > 0 && txAmt > 0) {
        const ratio = 1 - Math.abs(itemAmt - txAmt) / Math.max(itemAmt, txAmt);
        score += ratio * 0.3;
      }
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }

  if (best && bestScore > 0.3) {
    return { budget: best, confidence: 0.7, reason: 'pattern' };
  }

  return null;
}

/**
 * @param {object[]} rows
 * @returns {Record<string, object[]>}
 */
export function groupByPriority(rows) {
  /** @type {Record<string, object[]>} */
  const groups = {};
  for (const key of PRIORITY_KEYS) groups[key] = [];

  for (const row of rows || []) {
    const key = PRIORITY_KEYS.includes(row.priority) ? row.priority : 'penting';
    groups[key].push(row);
  }

  return groups;
}

/**
 * @param {object[]} rows
 * @param {number} income
 * @returns {Record<string, object>}
 */
export function calculatePriorityTotals(rows, income) {
  const groups = groupByPriority(rows);
  /** @type {Record<string, object>} */
  const totals = {};

  for (const [key, list] of Object.entries(groups)) {
    const total = list.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    totals[key] = {
      amount: total,
      count: list.length,
      percentOfIncome: income > 0 ? Math.round((total / income) * 100) : 0,
      budgets: list,
    };
  }

  return totals;
}

/**
 * @param {string} month YYYY-MM
 * @returns {string}
 */
function prevMonthKey(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {object[]} rows
 * @param {object[]} transactions
 * @param {string} month
 * @returns {object[]}
 */
export function computeHistoricalBaselines(rows, transactions, month) {
  const prevMonths = [1, 2, 3].map((n) => {
    let mk = month;
    for (let i = 0; i < n; i++) mk = prevMonthKey(mk);
    return mk;
  });

  return (rows || []).map((row) => {
    const lastMonth = prevMonths[0];
    const lastLinked = getLinkedTransactions(row, transactions, lastMonth);
    const lastActual = lastLinked.reduce((s, t) => s + Number(t.amount || 0), 0);

    const monthTotals = prevMonths.map((mk) => {
      const linked = getLinkedTransactions(row, transactions, mk);
      return linked.reduce((s, t) => s + Number(t.amount || 0), 0);
    });
    const threeMonthAvg = monthTotals.length
      ? monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length
      : 0;

    return {
      ...row,
      last_month_actual: Math.round(lastActual),
      three_month_avg: Math.round(threeMonthAvg),
    };
  });
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetModel = {
    PRIORITY_LEVELS,
    TARGET_TYPES,
    createBudgetRow,
    createBudgetItem,
    createBudgetLineItem,
    BUDGET_UNITS,
    hasActiveLineItems,
    getItemTotalAmount,
    syncItemAmountFromLines,
    normalizeBudgetRow,
    migrateBudgetCategories,
    serializeBudgetRows,
    CATEGORY_TYPES,
    inferCategoryType,
    getBudgetStatusLabel,
    getBudgetStatusClass,
    isFlexibleOverBudget,
    countFlexibleOverBudget,
    countFlexibleAttentionRows,
    calculateProgress,
    matchesAutoLink,
    suggestBudget,
    groupByPriority,
    calculatePriorityTotals,
    computeHistoricalBaselines,
    getCurrentPeriod,
    rowsToBudgetList,
    getLinkedTransactions,
    normalizeCategoryName,
  };
}
