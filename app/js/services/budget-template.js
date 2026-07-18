/**
 * Budget month template — save current setup & auto-apply to new months.
 * @module services/budget-template
 */

import { createBudgetRow, createBudgetItem, serializeBudgetRows } from './budget-model.js';

const TEMPLATE_KEY = 'budget_template_v1';

/**
 * @returns {Promise<object|null>}
 */
export async function getBudgetTemplate() {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(TEMPLATE_KEY);
    return row?.value || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} month
 * @param {number} income
 * @param {object[]} rows
 * @param {object} [options]
 */
export async function saveBudgetTemplate(month, income, rows, options = {}) {
  const { getDb } = await import('./offline-db.js');
  const db = await getDb();
  const serialized = serializeBudgetRows(rows || []);

  await db.app_state.put({
    key: TEMPLATE_KEY,
    value: {
      source_month: month,
      income: Number(income || 0),
      rows: serialized,
      auto_apply: options.autoApply !== false,
      saved_at: new Date().toISOString(),
      label: options.label || `Template dari ${month}`,
    },
  });

  return getBudgetTemplate();
}

/**
 * @param {object[]} rows
 * @param {number} [scale]
 * @returns {object[]}
 */
export function cloneTemplateRows(rows, scale = 1) {
  return (rows || []).map((raw) => {
    const items = (raw.items || []).map((item) => createBudgetItem({
      ...item,
      id: undefined,
      status: 'planned',
      linked_transactions: [],
      price: Math.round(Number(item.price || 0) * scale / 1000) * 1000,
    }));
    const amount = Math.round(Number(raw.amount || 0) * scale / 1000) * 1000;
    return createBudgetRow({
      ...raw,
      id: undefined,
      amount,
      items,
      last_month_actual: 0,
      three_month_avg: 0,
    });
  }).filter((r) => Number(r.amount) > 0);
}

/**
 * @param {string} month
 * @returns {Promise<{ rows: object[], income: number }|null>}
 */
export async function applyTemplateForNewMonth(month) {
  const template = await getBudgetTemplate();
  if (!template?.rows?.length || template.auto_apply === false) return null;

  const income = await resolveMonthIncome(month, template.income);
  const templateIncome = Number(template.income) || income;
  const scale = templateIncome > 0 && income > 0 && income !== templateIncome
    ? income / templateIncome
    : 1;

  return {
    rows: cloneTemplateRows(template.rows, scale),
    income,
    from: 'template',
    template_label: template.label,
  };
}

/**
 * @param {string} month
 * @param {number} [fallback]
 */
async function resolveMonthIncome(month, fallback = 0) {
  try {
    const { getTotalIncome, migrateLegacyIncome } = await import('./income-source.js');
    const state = typeof window !== 'undefined' ? window.STATE : null;
    const legacy = Number(
      state?.budgetsByMonth?.[month]?.income
      || state?.budgetDraft?.income
      || fallback
      || 0,
    );
    await migrateLegacyIncome(month, legacy);
    let income = await getTotalIncome(month);
    if (!income) income = legacy;
    if (!income && state?.transactions?.length) {
      income = state.transactions
        .filter((t) => t.type === 'income' && t.date?.startsWith(month))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }
    return income;
  } catch {
    return Number(fallback || 0);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetTemplate = {
    getBudgetTemplate,
    saveBudgetTemplate,
    applyTemplateForNewMonth,
    cloneTemplateRows,
  };
}
