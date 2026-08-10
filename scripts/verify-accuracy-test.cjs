#!/usr/bin/env node
/**
 * CLI — compare fixture expected-values vs in-memory production metrics.
 * Usage: npm run verify:accuracy
 */
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'accuracy-test-4month');
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08'];

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

function fmtIdr(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

function pad(str, len) {
  return String(str).padEnd(len);
}

async function main() {
  const expected = loadJson('expected-values.json');
  const allTx = loadJson('transactions-all.json');
  const prefs = loadJson('user-preferences.json');

  const {
    computePeriodFinancials,
  } = await import('../app/js/services/financial-metrics.js');
  const { computeFinancialHealthScore } = await import('../app/js/services/financial-health-score.js');
  const { sumByTransactionType, isReportableTransaction } = await import('../app/js/utils/transaction-utils.js');
  const { getPendingTransactions, findUnhandledAnomalies } = await import('../app/js/services/transaction-classification.js');

  const budgetsByMonth = {};
  for (const m of MONTHS) {
    budgetsByMonth[m] = loadJson(`budgets-${m}.json`);
  }

  const state = {
    selectedMonth: '2026-08',
    transactions: allTx,
    budgetsByMonth,
    db: { userPreferences: prefs },
  };

  console.log('\n=== Monefyi Accuracy Verification (fixture / in-memory) ===\n');
  console.log(`${pad('Metric', 36)} ${pad('Expected', 18)} ${pad('Actual', 18)} PASS`);
  console.log('-'.repeat(82));

  let pass = 0;
  let fail = 0;

  function row(label, expVal, actVal, ok) {
    const mark = ok ? '✓' : '✗';
    if (ok) pass += 1; else fail += 1;
    const e = typeof expVal === 'number' ? fmtIdr(expVal) : String(expVal);
    const a = typeof actVal === 'number' ? fmtIdr(actVal) : String(actVal);
    console.log(`${pad(label, 36)} ${pad(e, 18)} ${pad(a, 18)} ${mark}`);
  }

  for (const month of MONTHS) {
    const exp = expected.months[month];
    const metrics = computePeriodFinancials(state, month);
    row(`${month} income`, exp.income ?? '—', metrics.income, exp.income == null || metrics.income === exp.income);
    row(`${month} consumption`, exp.consumptionExpense, metrics.consumptionExpense, metrics.consumptionExpense === exp.consumptionExpense);
    if (exp.netCashFlow != null) {
      row(`${month} total net`, exp.netCashFlow, metrics.netCashFlow, metrics.netCashFlow === exp.netCashFlow);
    }
  }

  const trendActual = expected.trend.labels.map((m) => {
    const txs = allTx.filter((t) => String(t.date).startsWith(m) && isReportableTransaction(t));
    return sumByTransactionType(txs).consumptionExpense;
  });
  row('Trend May–Jul (consumption)', expected.trend.nonSavingExpense.join(', '), trendActual.join(', '), JSON.stringify(trendActual) === JSON.stringify(expected.trend.nonSavingExpense));

  const augMetrics = computePeriodFinancials(state, '2026-08');
  row('Aug pending count', 1, augMetrics.pendingCount, augMetrics.pendingCount === 1);

  const hp = allTx.find((t) => t.id === expected.anomaly.hpTransactionId);
  row('HP in pending list', true, getPendingTransactions(allTx).some((t) => t.id === hp.id), true);
  row('HP unhandled anomalies (pending)', 0, findUnhandledAnomalies(allTx, { monthKey: '2026-08' }).length, findUnhandledAnomalies(allTx, { monthKey: '2026-08' }).length === 0);

  for (const month of ['2026-05']) {
    const exp = expected.months[month];
    const health = computeFinancialHealthScore({ ...state, selectedMonth: month });
    const ok = health.overall >= exp.healthScoreMin && health.overall <= exp.healthScoreMax;
    row(`${month} health score band`, `${exp.healthScoreMin}-${exp.healthScoreMax}`, health.overall, ok);
  }

  const julMetrics = computePeriodFinancials(state, '2026-07');
  row('2026-07 saving rate real (>=25%)', '>=0.25', julMetrics.savingRateReal.toFixed(4), julMetrics.savingRateReal >= 0.25);
  const julHealth = computeFinancialHealthScore({ ...state, selectedMonth: '2026-07' });
  row('2026-07 saving component max', 20, julHealth.components.savingRate?.score, julHealth.components.savingRate?.score === 20);

  console.log('-'.repeat(82));
  console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[verify:accuracy] FAILED:', err.message || err);
  process.exit(1);
});
