/**
 * Budget templates — built-ins + custom list (IndexedDB).
 * @module services/budget-template
 */

import {
  PRIORITY_LEVELS,
  createBudgetRow,
  createBudgetItem,
  serializeBudgetRows,
} from './budget-model.js';

const TEMPLATES_KEY = 'budget_templates_v2';
const LEGACY_KEY = 'budget_template_v1';
const ACTIVE_KEY = 'budget_template_active_id';

/**
 * Built-in presets (non-deletable).
 * @returns {object[]}
 */
export function getBuiltinTemplates() {
  return [
    {
      id: 'builtin_503020',
      builtin: true,
      label: '50/30/20',
      description: 'Needs 50% · Wants 30% · Savings 20%',
      income: 0,
      auto_apply: false,
      rows: [
        { name: 'Needs', priority: 'harus', amount_pct: 50, items: [] },
        { name: 'Wants', priority: 'mau', amount_pct: 30, items: [] },
        { name: 'Savings', priority: 'simpan', amount_pct: 20, items: [] },
      ],
    },
    {
      id: 'builtin_wajib_kebutuhan',
      builtin: true,
      label: 'Wajib · Kebutuhan · Keinginan',
      description: 'Kategori umum berdasarkan prioritas',
      income: 0,
      auto_apply: false,
      rows: buildDefaultPriorityRows(),
    },
  ];
}

function buildDefaultPriorityRows() {
  const rows = [];
  for (const level of Object.values(PRIORITY_LEVELS)) {
    const names = level.default_budgets || [];
    const share = (level.typical_percent || 10) / Math.max(1, names.length);
    for (const name of names) {
      rows.push({
        name,
        priority: level.key,
        amount_pct: share,
        items: [{ name, qty: 1, price_pct: share }],
      });
    }
  }
  return rows;
}

/**
 * @returns {Promise<object[]>}
 */
export async function listBudgetTemplates() {
  const custom = await loadCustomTemplates();
  return [...getBuiltinTemplates(), ...custom];
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getTemplateById(id) {
  if (!id) return null;
  const all = await listBudgetTemplates();
  return all.find((t) => t.id === id) || null;
}

/**
 * Legacy single-template getter (compat).
 * @returns {Promise<object|null>}
 */
export async function getBudgetTemplate() {
  const activeId = await getActiveTemplateId();
  if (activeId) {
    const t = await getTemplateById(activeId);
    if (t) return materializeTemplateMeta(t);
  }
  const custom = await loadCustomTemplates();
  if (custom[0]) return materializeTemplateMeta(custom[0]);
  return null;
}

function materializeTemplateMeta(t) {
  return {
    id: t.id,
    label: t.label,
    source_month: t.source_month || '',
    income: Number(t.income || 0),
    rows: t.rows || [],
    auto_apply: t.auto_apply !== false && !t.builtin,
    saved_at: t.saved_at,
    builtin: !!t.builtin,
  };
}

/**
 * @returns {Promise<string|null>}
 */
export async function getActiveTemplateId() {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(ACTIVE_KEY);
    return row?.value || null;
  } catch {
    return null;
  }
}

/**
 * @param {string|null} id
 */
export async function setActiveTemplateId(id) {
  const { getDb } = await import('./offline-db.js');
  const db = await getDb();
  await db.app_state.put({ key: ACTIVE_KEY, value: id || null });
}

/**
 * @returns {Promise<object[]>}
 */
async function loadCustomTemplates() {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(TEMPLATES_KEY);
    if (row?.value?.templates && Array.isArray(row.value.templates)) {
      return row.value.templates;
    }

    // Migrate legacy single template
    const legacy = await db.app_state.get(LEGACY_KEY);
    if (legacy?.value?.rows?.length) {
      const migrated = [{
        id: `custom_${Date.now()}`,
        builtin: false,
        label: legacy.value.label || `Template dari ${legacy.value.source_month || 'lama'}`,
        source_month: legacy.value.source_month,
        income: Number(legacy.value.income || 0),
        rows: legacy.value.rows,
        auto_apply: legacy.value.auto_apply !== false,
        saved_at: legacy.value.saved_at || new Date().toISOString(),
      }];
      await persistCustomTemplates(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * @param {object[]} templates
 */
async function persistCustomTemplates(templates) {
  const { getDb } = await import('./offline-db.js');
  const db = await getDb();
  await db.app_state.put({
    key: TEMPLATES_KEY,
    value: { templates, updated_at: new Date().toISOString() },
  });
}

/**
 * Save current month as custom template (new or overwrite by id).
 * @param {string} month
 * @param {number} income
 * @param {object[]} rows
 * @param {object} [options]
 */
export async function saveBudgetTemplate(month, income, rows, options = {}) {
  const custom = await loadCustomTemplates();
  const serialized = serializeBudgetRows(rows || []);
  const id = options.id || `custom_${crypto.randomUUID?.() || Date.now()}`;
  const label = options.label || `Template dari ${month}`;

  const next = {
    id,
    builtin: false,
    label,
    source_month: month,
    income: Number(income || 0),
    rows: serialized,
    auto_apply: options.autoApply !== false,
    saved_at: new Date().toISOString(),
  };

  const idx = custom.findIndex((t) => t.id === id);
  if (idx >= 0) custom[idx] = next;
  else custom.unshift(next);

  await persistCustomTemplates(custom);
  await setActiveTemplateId(id);
  return next;
}

/**
 * @param {string} id
 * @param {object} patch
 */
export async function updateBudgetTemplate(id, patch = {}) {
  if (!id || String(id).startsWith('builtin_')) {
    throw new Error('Template bawaan tidak bisa diedit langsung — simpan salinan dulu');
  }
  const custom = await loadCustomTemplates();
  const idx = custom.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('Template tidak ditemukan');
  custom[idx] = { ...custom[idx], ...patch, id, builtin: false, saved_at: new Date().toISOString() };
  await persistCustomTemplates(custom);
  return custom[idx];
}

/**
 * @param {string} id
 */
export async function deleteBudgetTemplate(id) {
  if (!id || String(id).startsWith('builtin_')) {
    throw new Error('Template bawaan tidak bisa dihapus');
  }
  const custom = await loadCustomTemplates();
  const next = custom.filter((t) => t.id !== id);
  await persistCustomTemplates(next);
  const active = await getActiveTemplateId();
  if (active === id) await setActiveTemplateId(null);
  return true;
}

/**
 * Expand template rows with optional income scaling.
 * @param {object} template
 * @param {number} income
 * @returns {object[]}
 */
export function materializeTemplateRows(template, income = 0) {
  const baseIncome = Number(template.income || 0);
  const targetIncome = Number(income || baseIncome || 0);
  const rows = (template.rows || []).map((raw) => {
    let amount = Number(raw.amount || 0);
    if (raw.amount_pct != null && targetIncome > 0) {
      amount = Math.round((targetIncome * Number(raw.amount_pct)) / 100 / 1000) * 1000;
    } else if (baseIncome > 0 && targetIncome > 0 && targetIncome !== baseIncome) {
      amount = Math.round((amount * targetIncome) / baseIncome / 1000) * 1000;
    }

    const items = (raw.items || []).map((item) => {
      let price = Number(item.price || 0);
      if (item.price_pct != null && targetIncome > 0) {
        price = Math.round((targetIncome * Number(item.price_pct)) / 100 / 1000) * 1000;
      } else if (baseIncome > 0 && targetIncome > 0 && targetIncome !== baseIncome) {
        price = Math.round((price * targetIncome) / baseIncome / 1000) * 1000;
      }
      return createBudgetItem({
        ...item,
        id: undefined,
        status: 'planned',
        linked_transactions: [],
        price,
        qty: item.qty || 1,
      });
    });

    return createBudgetRow({
      ...raw,
      id: undefined,
      amount: amount || items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
      items,
      last_month_actual: 0,
      three_month_avg: 0,
    });
  }).filter((r) => Number(r.amount) > 0 || (r.items || []).length > 0);

  return rows;
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
 * Apply template by id into current draft month.
 * @param {string} templateId
 * @param {string} month
 * @returns {Promise<{ rows: object[], income: number, template_label: string }|null>}
 */
export async function applyTemplateById(templateId, month) {
  const template = await getTemplateById(templateId);
  if (!template) return null;

  const income = await resolveMonthIncome(month, template.income);
  const rows = materializeTemplateRows(template, income);
  await setActiveTemplateId(template.id);

  return {
    rows,
    income,
    from: 'template',
    template_label: template.label,
  };
}

/**
 * Auto-apply for empty months (custom with auto_apply only).
 * @param {string} month
 */
export async function applyTemplateForNewMonth(month) {
  const custom = await loadCustomTemplates();
  const auto = custom.find((t) => t.auto_apply !== false && t.rows?.length);
  if (!auto) return null;
  return applyTemplateById(auto.id, month);
}

/**
 * @param {string} month
 * @param {number} [fallback]
 */
async function resolveMonthIncome(month, fallback = 0) {
  try {
    const { getTotalIncome, migrateLegacyIncome } = await import('./income-source.js');
    const state = typeof window !== 'undefined' ? window.STATE : null;
    let legacy = Number(
      state?.budgetsByMonth?.[month]?.income
      || state?.budgetDraft?.income
      || fallback
      || 0,
    );
    if (legacy === 5500000) legacy = 0;

    await migrateLegacyIncome(month, legacy);
    let income = await getTotalIncome(month);
    if (!income && state?.transactions?.length) {
      income = state.transactions
        .filter((t) => t.type === 'income' && t.date?.startsWith(month))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }
    return income || 0;
  } catch {
    return Number(fallback === 5500000 ? 0 : fallback || 0);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetTemplate = {
    listBudgetTemplates,
    getBudgetTemplate,
    getTemplateById,
    saveBudgetTemplate,
    updateBudgetTemplate,
    deleteBudgetTemplate,
    applyTemplateById,
    applyTemplateForNewMonth,
    cloneTemplateRows,
    materializeTemplateRows,
    getBuiltinTemplates,
  };
}
