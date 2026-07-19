/**
 * Manage multiple income sources per period.
 * @module services/income-source
 */

/** @type {import('dexie').Dexie|null} */
let _dbInstance = null;

/**
 * @returns {Promise<import('dexie').Dexie>}
 */
async function getDb() {
  if (_dbInstance) return _dbInstance;
  const { getDb: get } = await import('./offline-db.js');
  _dbInstance = await get();
  return _dbInstance;
}

export const INCOME_TYPES = [
  { key: 'salary', label: 'Gaji', icon: '💼' },
  { key: 'freelance', label: 'Freelance', icon: '💻' },
  { key: 'business', label: 'Usaha', icon: '🏪' },
  { key: 'investment', label: 'Investasi', icon: '📈' },
  { key: 'bonus', label: 'Bonus/THR', icon: '🎁' },
  { key: 'rental', label: 'Sewa', icon: '🏠' },
  { key: 'gift', label: 'Hadiah', icon: '🎊' },
  { key: 'other', label: 'Lainnya', icon: '💰' },
];

/**
 * @returns {string}
 */
export function getCurrentPeriod() {
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (state?.selectedMonth) return state.selectedMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {object} [data]
 * @returns {object}
 */
export function createIncomeSource(data = {}) {
  return {
    id: data.id || `income_${crypto.randomUUID()}`,
    period: data.period || getCurrentPeriod(),
    name: data.name || '',
    type: data.type || 'salary',
    amount: Number(data.amount) || 0,
    date_expected: data.date_expected || null,
    is_recurring: data.is_recurring !== false,
    notes: data.notes || '',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Sync total income to budget draft when sources change.
 * @param {string} period
 */
async function syncBudgetDraftIncome(period) {
  const total = await getTotalIncome(period);
  const state = typeof window !== 'undefined' ? window.STATE : null;
  if (!state) return;

  if (state.budgetDraft && state.budgetDraft.month === period) {
    state.budgetDraft.income = total;
  }
  if (state.budgetsByMonth?.[period]) {
    state.budgetsByMonth[period].income = total;
  }
}

/**
 * @param {object} source
 */
export async function saveIncomeSource(source) {
  const db = await getDb();
  if (!db.income_sources) {
    console.warn('[income] income_sources table missing');
    return source;
  }
  const record = createIncomeSource({ ...source, updated_at: new Date().toISOString() });
  await db.income_sources.put(record);
  await syncBudgetDraftIncome(record.period);
  return record;
}

/**
 * @param {string} id
 */
export async function deleteIncomeSource(id) {
  const db = await getDb();
  if (!db.income_sources) return;
  const existing = await db.income_sources.get(id);
  await db.income_sources.delete(id);
  if (existing?.period) await syncBudgetDraftIncome(existing.period);
}

/**
 * @param {string|null} [period]
 * @returns {Promise<object[]>}
 */
export async function getIncomeSources(period = null) {
  const db = await getDb();
  if (!db.income_sources) return [];

  const p = period || getCurrentPeriod();
  const all = await db.income_sources.toArray();
  const sources = all.filter((s) => s.period === p);

  // Purge known recommender mock (5.5jt) seeded as legacy "Income Bulanan"
  const mocks = sources.filter(
    (s) => Number(s.amount) === 5500000 && /income bulanan/i.test(s.name || ''),
  );
  if (mocks.length && mocks.length === sources.length) {
    await Promise.all(mocks.map((s) => db.income_sources.delete(s.id)));
    return [];
  }

  return sources;
}

/**
 * @param {string|null} [period]
 * @returns {Promise<number>}
 */
export async function getTotalIncome(period = null) {
  const sources = await getIncomeSources(period);
  return sources.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
}

/**
 * Migrate legacy single income value into one source if none exist.
 * @param {string} period
 * @param {number} legacyIncome
 */
export async function migrateLegacyIncome(period, legacyIncome) {
  const existing = await getIncomeSources(period);
  const amount = Number(legacyIncome || 0);
  // Skip empty or known mock/recommender fallback (5.5jt)
  if (existing.length > 0 || amount <= 0 || amount === 5500000) return;

  await saveIncomeSource(createIncomeSource({
    period,
    name: 'Income Bulanan',
    type: 'salary',
    amount,
    is_recurring: true,
  }));
}

if (typeof window !== 'undefined') {
  window.monefyiIncome = {
    INCOME_TYPES,
    createIncomeSource,
    saveIncomeSource,
    deleteIncomeSource,
    getIncomeSources,
    getTotalIncome,
    migrateLegacyIncome,
    getCurrentPeriod,
  };
}
