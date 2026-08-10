/**
 * Accuracy test — 4-month 8jt persona with HP anomaly (Aug 2026).
 * Uses fixture JSON + production services (no browser/DB).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { computePeriodFinancials, predictFuture } from '../app/js/services/financial-metrics.js';
import { computeFinancialHealthScore } from '../app/js/services/financial-health-score.js';
import { generateRecommendations } from '../app/js/services/budget-recommender.js';
import {
  detectAnomaly,
  needsClassification,
  applyClassification,
  getPendingTransactions,
  findUnhandledAnomalies,
} from '../app/js/services/transaction-classification.js';
import { isLoanPaymentTransaction } from '../app/js/services/journal-engine.js';
import { sumByTransactionType, isReportableTransaction } from '../app/js/utils/transaction-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, '..', 'scripts', 'fixtures', 'accuracy-test-4month');
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08'];

function loadJson(name) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

const expected = loadJson('expected-values.json');
const allTransactions = loadJson('transactions-all.json');
const userPrefs = loadJson('user-preferences.json');
const goals = loadJson('financial-goals.json');

function buildBudgetsByMonth() {
  const out = {};
  for (const m of MONTHS) {
    out[m] = loadJson(`budgets-${m}.json`);
  }
  return out;
}

function buildState(overrides = {}) {
  return {
    selectedMonth: '2026-08',
    transactions: allTransactions,
    budgetsByMonth: buildBudgetsByMonth(),
    db: { userPreferences: userPrefs },
    ...overrides,
  };
}

function monthTxs(month) {
  return allTransactions.filter((t) => String(t.date || '').startsWith(month));
}

describe('Accuracy — Suite 1: Cash flow (computePeriodFinancials)', () => {
  for (const month of MONTHS) {
    it(`${month} consumption expense matches expected-values.json`, () => {
      const exp = expected.months[month];
      const metrics = computePeriodFinancials(buildState({ selectedMonth: month }), month);
      assert.equal(metrics.consumptionExpense, exp.consumptionExpense, `${month} consumption`);
      if (exp.income != null) assert.equal(metrics.income, exp.income, `${month} income`);
      if (exp.netCashFlow != null) {
        assert.equal(metrics.netCashFlow, exp.netCashFlow, `${month} total net cash flow`);
      }
    });
  }

  it('August excludes pending HP from reportable totals', () => {
    const metrics = computePeriodFinancials(buildState(), '2026-08');
    assert.equal(metrics.consumptionExpense, expected.months['2026-08'].consumptionExpense);
    assert.equal(metrics.pendingCount, 1);
    assert.ok(metrics.hasUnhandledAnomalies === false, 'pending HP not in unhandled (not reportable)');
  });

  it('August with HP as expense would inflate consumption to 11.383jt', () => {
    const state = buildState({
      transactions: allTransactions.map((t) => (
        t.id === expected.anomaly.hpTransactionId
          ? { ...t, status: 'confirmed', meta: { expense_treatment: 'consumption' } }
          : t
      )),
    });
    const metrics = computePeriodFinancials(state, '2026-08');
    assert.equal(
      metrics.consumptionExpense,
      expected.months['2026-08'].consumptionExpenseWithHpAsExpense,
    );
  });
});

describe('Accuracy — Suite 2: Health score (closed months)', () => {
  it('2026-05 score within expected band', () => {
    const exp = expected.months['2026-05'];
    const result = computeFinancialHealthScore(buildState({ selectedMonth: '2026-05' }));
    assert.ok(result.overall != null, 'score computed for closed month');
    assert.ok(
      result.overall >= exp.healthScoreMin && result.overall <= exp.healthScoreMax,
      `2026-05 score ${result.overall} outside ${exp.healthScoreMin}-${exp.healthScoreMax}`,
    );
  });

  it('2026-07 saving rate component supports excellent band target', () => {
    const metrics = computePeriodFinancials(buildState({ selectedMonth: '2026-07' }), '2026-07');
    assert.ok(metrics.savingRateReal >= 0.25, `July saving rate real ${metrics.savingRateReal}`);
    const result = computeFinancialHealthScore(buildState({ selectedMonth: '2026-07' }));
    assert.equal(result.components.savingRate.score, 20, 'max saving rate points at 25%+');
  });
});

describe('Accuracy — Suite 3: Recommendations (August)', () => {
  it('pending HP triggers review recommendation first', async () => {
    const recs = await generateRecommendations({
      month: '2026-08',
      transactions: monthTxs('2026-08'),
      budgets: buildBudgetsByMonth()['2026-08'].categories.rows,
      income: 8000000,
    });
    const pendingRec = recs.find((r) => r.type === 'pending_transactions');
    assert.ok(pendingRec, 'pending_transactions recommendation expected');
    assert.equal(pendingRec.priority, 1);
  });

  it('confirmed unclassified HP triggers anomaly categorization', async () => {
    const txs = allTransactions.map((t) => (
      t.id === expected.anomaly.hpTransactionId
        ? { ...t, status: 'confirmed', meta: { needs_classification: true } }
        : t
    ));
    const recs = await generateRecommendations({
      month: '2026-08',
      transactions: txs.filter((t) => String(t.date).startsWith('2026-08')),
      budgets: buildBudgetsByMonth()['2026-08'].categories.rows,
      income: 8000000,
    });
    const anomalyRec = recs.find((r) => r.type === 'anomaly_categorization');
    assert.ok(anomalyRec, 'anomaly_categorization expected for confirmed HP');
    assert.ok(!recs.some((r) => r.title?.includes('Makan Sehari-hari') && r.type === 'category_over_budget'));
  });
});

describe('Accuracy — Suite 5: HP anomaly detection', () => {
  const hp = allTransactions.find((t) => t.id === expected.anomaly.hpTransactionId);

  it('HP pending is in pending list, not reportable', () => {
    assert.equal(getPendingTransactions(allTransactions).some((t) => t.id === hp.id), true);
    assert.equal(isReportableTransaction(hp), false);
    assert.equal(needsClassification(hp, { transactions: allTransactions, monthKey: '2026-08' }), false);
  });

  it('confirmed HP detected as anomaly needing classification', () => {
    const confirmedHp = { ...hp, status: 'confirmed', meta: { needs_classification: true } };
    const ctx = { transactions: [...monthTxs('2026-08'), confirmedHp], monthKey: '2026-08' };
    assert.equal(detectAnomaly(confirmedHp, ctx), true);
    assert.equal(needsClassification(confirmedHp, ctx), true);
  });

  it('Beli HP is not a loan payment (Cicilan HP fix)', () => {
    assert.equal(isLoanPaymentTransaction({ ...hp, status: 'confirmed' }), false);
  });

  it('classified as asset removes classification need', () => {
    const confirmedHp = { ...hp, status: 'confirmed', meta: {} };
    const classified = applyClassification(confirmedHp, 'asset', { category: 'Elektronik' });
    assert.equal(needsClassification(classified, { transactions: [classified], monthKey: '2026-08' }), false);
  });
});

describe('Accuracy — Suite 6: 3-month trend (May–Jul non-saving expense)', () => {
  it('non-saving expense array matches expected trend', () => {
    const actual = expected.trend.labels.map((m) => {
      const txs = monthTxs(m).filter(isReportableTransaction);
      return sumByTransactionType(txs).consumptionExpense;
    });
    assert.deepEqual(actual, expected.trend.nonSavingExpense);
  });
});

describe('Accuracy — Suite 7: Financial goals progress', () => {
  it('Dana Darurat progress end July', () => {
    const goal = goals.find((g) => g.name === 'Dana Darurat');
    assert.ok(goal);
    assert.equal(goal.current_amount, expected.goals.danaDarurat.currentEndJuly);
    const pct = (goal.current_amount / goal.target_amount) * 100;
    assert.ok(Math.abs(pct - expected.goals.danaDarurat.progressPctEndJuly) < 0.5);
  });

  it('DP Motor progress end July', () => {
    const goal = goals.find((g) => g.name === 'DP Motor Baru');
    assert.ok(goal);
    assert.equal(goal.current_amount, expected.goals.dpMotor.currentEndJuly);
  });
});

describe('Accuracy — Critical HP asset vs consumption', () => {
  it('HP classified asset keeps consumption net positive when income present', () => {
    const txs = monthTxs('2026-08').filter((t) => t.id !== expected.anomaly.hpTransactionId);
    const hpConfirmed = applyClassification(
      { ...allTransactions.find((t) => t.id === expected.anomaly.hpTransactionId), status: 'confirmed', meta: {} },
      'asset',
      { category: 'Elektronik' },
    );
    const withIncome = [
      { type: 'income', amount: 8_000_000, date: '2026-08-25', category: 'Gaji', status: 'confirmed' },
      ...txs,
      hpConfirmed,
    ];
    const totals = sumByTransactionType(withIncome.filter(isReportableTransaction));
    assert.ok(totals.consumptionNet > 0, 'consumption net positive with gaji + asset HP');
    assert.equal(totals.consumptionExpense, expected.months['2026-08'].consumptionExpense);
    assert.equal(totals.assetExpense, expected.months['2026-08'].hpAssetAmount);
  });

  it('unclassified confirmed HP does not create fantasy deficit in predictFuture disclaimer path', () => {
    const state = buildState({
      transactions: allTransactions.map((t) => (
        t.id === expected.anomaly.hpTransactionId
          ? { ...t, status: 'confirmed', meta: { needs_classification: true } }
          : t
      )),
    });
    const future = predictFuture(state, 6);
    assert.ok(Array.isArray(future.excluded));
  });
});
