/**
 * Test scenario generator — shared by CLI seeds, tests, and admin test lab.
 * @module shared/test-scenario-generator
 */

/** @typedef {object} ScenarioConfig */

let txCounter = 0;

/**
 * @param {string} month YYYY-MM
 * @param {number} day
 */
export function dateKey(month, day) {
  return `${month}-${String(day).padStart(2, '0')}`;
}

/**
 * @param {object} partial
 */
export function mkTx(partial) {
  txCounter += 1;
  return {
    id: partial.id || `acc-tx-${partial.date}-${txCounter}`,
    type: partial.type || 'expense',
    currency: 'IDR',
    status: partial.status || 'confirmed',
    confirmed_at: partial.status === 'pending' ? null : `${partial.date}T12:00:00.000Z`,
    meta: partial.meta || { source: 'test-scenario' },
    payment_method: partial.account || 'BCA',
    ...partial,
  };
}

/**
 * Reset internal tx id counter (call before each generate).
 */
export function resetTxCounter() {
  txCounter = 0;
}

/**
 * @param {number} total
 * @param {number} n
 */
export function splitAmount(total, n) {
  const base = Math.floor(total / n);
  const parts = Array(n).fill(base);
  let rem = total - base * n;
  for (let i = 0; parts[i] != null && rem > 0; i += 1, rem -= 1) {
    parts[i] += 1;
  }
  return parts;
}

/**
 * @param {string} month
 * @param {Record<string, number>} categoryTotals
 * @param {object} [opts]
 */
export function buildMonthTransactions(month, categoryTotals, opts = {}) {
  const txs = [];
  const incomeDay = opts.incomeDay ?? 25;

  if (opts.income > 0) {
    txs.push(mkTx({
      id: `acc-tx-${month}-income`,
      date: dateKey(month, incomeDay),
      type: 'income',
      amount: opts.income,
      category: 'Gaji',
      merchant: 'Gaji Bulanan',
      account: 'BCA',
    }));
  }

  const fixedMap = {
    Kost: { day: 1, account: 'BCA', merchant: 'Kost' },
    Listrik: { day: 5, account: 'BCA', merchant: 'PLN' },
    Internet: { day: 10, account: 'BCA', merchant: 'Indihome' },
    'Cicilan HP': { day: 15, account: 'BCA', merchant: 'Cicilan HP' },
  };

  for (const [cat, total] of Object.entries(categoryTotals)) {
    if (!total || total <= 0) continue;

    if (fixedMap[cat]) {
      const f = fixedMap[cat];
      txs.push(mkTx({
        date: dateKey(month, f.day),
        amount: total,
        category: cat,
        merchant: f.merchant,
        account: f.account,
        meta: { expense_treatment: cat === 'Cicilan HP' ? 'loan_payment' : 'consumption' },
      }));
      continue;
    }

    if (cat === 'Tabungan' || cat === 'Dana Darurat') {
      txs.push(mkTx({
        date: dateKey(month, incomeDay),
        amount: total,
        category: cat,
        merchant: `Transfer ${cat}`,
        account: 'BCA',
        meta: { expense_treatment: 'transfer', transfer_to: cat },
      }));
      continue;
    }

    const txCount = cat === 'Makan Sehari-hari' ? 20 : cat === 'Transportasi' ? 12 : 6;
    const parts = splitAmount(total, txCount);
    const accounts = cat === 'Makan Sehari-hari' ? ['GoPay', 'Cash'] : cat === 'Transportasi' ? ['GoPay', 'BCA'] : ['OVO', 'BCA'];
    for (let i = 0; i < parts.length; i += 1) {
      txs.push(mkTx({
        date: dateKey(month, Math.min(28, 2 + i)),
        amount: parts[i],
        category: cat,
        merchant: `${cat} #${i + 1}`,
        account: accounts[i % accounts.length],
        meta: { expense_treatment: 'consumption' },
      }));
    }
  }

  return txs;
}

/** Preset category totals per month (accuracy persona). */
export const ACCURACY_MONTH_TOTALS = {
  '2026-05': {
    Kost: 1200000, Listrik: 165000, Internet: 150000, 'Cicilan HP': 250000,
    'Makan Sehari-hari': 1865000, Transportasi: 720000, 'Belanja Kebutuhan': 495000,
    Kesehatan: 145000, 'Nongkrong & Kopi': 620000, Hiburan: 485000, Tabungan: 500000,
  },
  '2026-06': {
    Kost: 1200000, Listrik: 155000, Internet: 150000, 'Cicilan HP': 250000,
    'Makan Sehari-hari': 1480000, Transportasi: 615000, 'Belanja Kebutuhan': 485000,
    Kesehatan: 165000, 'Nongkrong & Kopi': 385000, Hiburan: 445000,
    Tabungan: 800000, 'Dana Darurat': 500000,
  },
  '2026-07': {
    Kost: 1200000, Listrik: 160000, Internet: 150000, 'Cicilan HP': 250000,
    'Makan Sehari-hari': 1250000, Transportasi: 545000, 'Belanja Kebutuhan': 510000,
    Kesehatan: 125000, 'Nongkrong & Kopi': 315000, Hiburan: 470000,
    Tabungan: 1200000, 'Dana Darurat': 800000,
  },
  '2026-08': {
    Kost: 1200000, Listrik: 165000, Internet: 150000, 'Cicilan HP': 250000,
    'Makan Sehari-hari': 650000, Transportasi: 305000, 'Belanja Kebutuhan': 235000,
    Kesehatan: 45000, 'Nongkrong & Kopi': 155000, Hiburan: 240000,
  },
};

/**
 * Scale category totals proportionally to income ratio.
 * @param {Record<string, number>} totals
 * @param {number} scale
 */
export function scaleCategoryTotals(totals, scale) {
  const out = {};
  for (const [k, v] of Object.entries(totals)) {
    out[k] = Math.round(v * scale);
  }
  return out;
}

/**
 * @param {ScenarioConfig} config
 */
export function generateCustomScenario(config = {}) {
  resetTxCounter();
  const monthlyIncome = Number(config.monthlyIncome || 8000000);
  const paydayDay = Number(config.paydayDay || 25);
  const months = config.months || ['2026-08'];
  const incomeScale = monthlyIncome / 8000000;
  const savingPct = config.savingTransferPct || months.map(() => 0.1);
  const anomalies = config.anomalies || [];
  const budgetTemplate = config.budgetRows || null;

  /** @type {object[]} */
  const transactions = [];
  const budgetsByMonth = {};

  for (let mi = 0; mi < months.length; mi += 1) {
    const month = months[mi];
    const baseTotals = ACCURACY_MONTH_TOTALS[month] || ACCURACY_MONTH_TOTALS['2026-08'];
    let totals = config.presetKey === 'accuracy-4month' && ACCURACY_MONTH_TOTALS[month]
      ? { ...ACCURACY_MONTH_TOTALS[month] }
      : scaleCategoryTotals(baseTotals, incomeScale);

    if (config.categorySpendOverrides?.[month]) {
      totals = { ...totals, ...config.categorySpendOverrides[month] };
    }

    if (config.presetKey !== 'accuracy-4month') {
      const pct = savingPct[mi] ?? 0.1;
      const savingAmt = Math.round(monthlyIncome * pct);
      if (savingAmt > 0) totals.Tabungan = savingAmt;
    }

    const income = month === '2026-08' && months.length > 1 && config.presetKey === 'accuracy-4month'
      ? 0
      : (month === '2026-08' && months.length > 1 ? 0 : monthlyIncome);

    transactions.push(...buildMonthTransactions(month, totals, { income, incomeDay: paydayDay }));

    const budget = budgetTemplate
      ? { income: monthlyIncome, categories: { rows: budgetTemplate } }
      : {
        income: monthlyIncome,
        categories: {
          rows: [
            { id: 'bdg-kost', name: 'Kost', amount: Math.round(1200000 * incomeScale), priority: 'harus' },
            { id: 'bdg-makan', name: 'Makan Sehari-hari', amount: Math.round(1500000 * incomeScale), priority: 'penting' },
            { id: 'bdg-tabungan', name: 'Tabungan', amount: Math.round(1500000 * incomeScale), priority: 'simpan' },
          ],
        },
      };
    budgetsByMonth[month] = { ...budget, month };
  }

  for (const a of anomalies) {
    transactions.push(mkTx({
      id: a.id || `acc-tx-${a.month}-anomaly`,
      date: dateKey(a.month, a.day || 4),
      amount: a.amount,
      category: a.category || 'Elektronik',
      merchant: a.merchant || 'Beli HP',
      account: a.account || 'BCA',
      status: a.status || 'pending',
      meta: a.status === 'pending'
        ? { needs_classification: true, status: 'pending', source: 'test-scenario' }
        : { expense_treatment: a.treatment || 'consumption', source: 'test-scenario' },
    }));
  }

  if (!anomalies.length && months.includes('2026-08') && config.includeHpAnomaly !== false
    && (config.presetKey === 'accuracy-4month' || !config.presetKey)) {
    transactions.push(mkTx({
      id: 'acc-tx-2026-08-hp-001',
      date: '2026-08-04',
      amount: 7988000,
      category: 'Elektronik',
      merchant: 'Beli HP',
      account: 'BCA',
      status: 'pending',
      meta: { needs_classification: true, status: 'pending', source: 'accuracy-fixture' },
    }));
  }

  const userPreferences = {
    payday_day: paydayDay,
    payday_irregular: false,
    monthly_income: monthlyIncome,
    income_source: 'salary_fixed',
    emergency_fund_balance: config.emergencyFundBalance ?? 4300000,
    emergency_fund_target: config.emergencyFundTarget ?? 24000000,
    fixed_bills: {
      kost: Math.round(1200000 * incomeScale),
      listrik: 150000,
      internet: 150000,
      cicilan_hp: 250000,
    },
    debt_amount: 2000000,
    monthly_debt_payment: 250000,
  };

  return {
    transactions,
    budgetsByMonth,
    userPreferences,
    goals: config.goals || [
      { id: 'acc-goal-darurat', name: 'Dana Darurat', target_amount: 24000000, current_amount: 4300000, priority: 1, status: 'active', is_primary: true },
      { id: 'acc-goal-motor', name: 'DP Motor Baru', target_amount: 5000000, current_amount: 1600000, priority: 2, status: 'active', is_primary: false },
    ],
    neraca: config.neraca || {
      assets: [
        { id: 'acc-asset-motor', category: 'Kendaraan', name: 'Motor', amount: 15000000 },
        { id: 'acc-asset-laptop', category: 'Elektronik', name: 'Laptop', amount: 6000000 },
        { id: 'acc-asset-hp-lama', category: 'Elektronik', name: 'HP Lama', amount: 2000000 },
      ],
      debts: [{ id: 'acc-debt-cicilan-hp', category: 'Utang', name: 'Cicilan HP', amount: 2000000 }],
    },
    monthlyPeriods: config.monthlyPeriods || [],
    defaultMonth: config.defaultMonth || months[months.length - 1],
    presetKey: config.presetKey || 'custom',
  };
}

/**
 * Load preset bundle from filesystem (Node) or injected bundle object.
 * @param {string} presetKey
 * @param {object} [fixtureBundle] pre-loaded JSON bundle
 */
export function loadPreset(presetKey, fixtureBundle = null) {
  if (fixtureBundle) {
    return normalizePresetBundle(presetKey, fixtureBundle);
  }
  if (presetKey === 'accuracy-4month') {
    return generateCustomScenario({
      presetKey: 'accuracy-4month',
      monthlyIncome: 8000000,
      paydayDay: 25,
      months: ['2026-05', '2026-06', '2026-07', '2026-08'],
      savingTransferPct: [0.0625, 0.1625, 0.25, 0],
      includeHpAnomaly: true,
      defaultMonth: '2026-08',
    });
  }
  if (presetKey === 'demo-august') {
    resetTxCounter();
    const month = '2026-08';
    const totals = {
      Kost: 1200000, Listrik: 150000, Internet: 150000, 'Cicilan HP': 250000,
      'Makan Sehari-hari': 539000,
    };
    const txs = buildMonthTransactions(month, totals, { income: 5000000, incomeDay: 25 });
    return {
      transactions: txs,
      budgetsByMonth: {
        [month]: {
          month,
          income: 5000000,
          categories: { rows: [{ id: 'demo-kost', name: 'Kost', amount: 1200000, priority: 'harus' }] },
        },
      },
      userPreferences: { monthly_income: 5000000, payday_day: 25, income_source: 'Gaji' },
      goals: [],
      neraca: { assets: [], debts: [] },
      monthlyPeriods: [],
      defaultMonth: month,
      presetKey: 'demo-august',
    };
  }
  throw new Error(`Unknown preset: ${presetKey}`);
}

/**
 * @param {string} presetKey
 * @param {object} bundle
 */
function normalizePresetBundle(presetKey, bundle) {
  const months = Object.keys(bundle.budgetsByMonth || {});
  return {
    transactions: bundle.transactions || [],
    budgetsByMonth: bundle.budgetsByMonth || {},
    userPreferences: bundle.userPreferences || {},
    goals: bundle.goals || [],
    neraca: bundle.neraca || { assets: [], debts: [] },
    monthlyPeriods: bundle.monthlyPeriods || [],
    expectedValues: bundle.expectedValues || {},
    defaultMonth: bundle.defaultMonth || months[months.length - 1] || '2026-08',
    presetKey,
  };
}

/**
 * Headline preview stats from generated bundle.
 * @param {object} bundle
 */
export function previewScenario(bundle) {
  const txs = bundle.transactions || [];
  const months = [...new Set(txs.map((t) => String(t.date || '').slice(0, 7)))].sort();
  return {
    transactionCount: txs.length,
    months,
    income: bundle.userPreferences?.monthly_income,
    defaultMonth: bundle.defaultMonth,
    presetKey: bundle.presetKey,
  };
}

export default {
  generateCustomScenario,
  loadPreset,
  previewScenario,
  buildMonthTransactions,
  ACCURACY_MONTH_TOTALS,
};
