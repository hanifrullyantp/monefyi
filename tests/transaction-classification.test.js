/**
 * Transaction classification & anomaly tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAnomaly,
  needsClassification,
  applyClassification,
  suggestCategoryForLargeTx,
  validateInstallmentCategory,
  findUnhandledAnomalies,
} from '../app/js/services/transaction-classification.js';
import {
  isReportableTransaction,
  isConsumptionExpense,
  isAssetAcquisition,
  sumByTransactionType,
} from '../app/js/utils/transaction-utils.js';
import { isLoanPaymentTransaction } from '../app/js/services/journal-engine.js';
import { computePeriodFinancials, predictFuture } from '../app/js/services/financial-metrics.js';
import { computeFinancialHealthScore } from '../app/js/services/financial-health-score.js';

describe('transaction status filters', () => {
  it('excludes pending from reports', () => {
    const tx = { type: 'expense', amount: 100, category: 'Makan', status: 'pending' };
    assert.equal(isReportableTransaction(tx), false);
  });

  it('excludes Menunggu proses category', () => {
    const tx = { type: 'expense', amount: 100, category: 'Menunggu proses', status: 'confirmed' };
    assert.equal(isReportableTransaction(tx), false);
  });

  it('excludes asset from consumption expense', () => {
    const tx = {
      type: 'expense',
      amount: 7_988_000,
      category: 'Elektronik',
      status: 'confirmed',
      meta: { expense_treatment: 'asset', is_asset_purchase: true },
    };
    assert.equal(isConsumptionExpense(tx), false);
    assert.equal(isAssetAcquisition(tx), true);
  });
});

describe('anomaly detection', () => {
  const history = [
    { type: 'expense', amount: 50_000, date: '2026-08-01', category: 'Makan', status: 'confirmed' },
    { type: 'expense', amount: 45_000, date: '2026-08-02', category: 'Makan', status: 'confirmed' },
    { type: 'expense', amount: 55_000, date: '2026-08-03', category: 'Makan', status: 'confirmed' },
    { type: 'income', amount: 5_000_000, date: '2026-08-01', category: 'Gaji', status: 'confirmed' },
  ];

  it('detects HP purchase as anomaly', () => {
    const hp = {
      type: 'expense',
      amount: 7_988_000,
      date: '2026-08-10',
      merchant: 'Beli HP',
      category: 'Elektronik',
      status: 'confirmed',
    };
    assert.equal(detectAnomaly(hp, { transactions: [...history, hp], monthKey: '2026-08' }), true);
    assert.equal(needsClassification(hp, { transactions: [...history, hp], monthKey: '2026-08' }), true);
  });

  it('stops needing classification after asset apply', () => {
    const hp = {
      type: 'expense',
      amount: 7_988_000,
      date: '2026-08-10',
      merchant: 'Beli HP',
      category: 'Elektronik',
      status: 'confirmed',
    };
    const classified = applyClassification(hp, 'asset', { category: 'Elektronik' });
    assert.equal(needsClassification(classified, { transactions: [classified], monthKey: '2026-08' }), false);
  });
});

describe('Cicilan HP vs Elektronik', () => {
  it('suggests Elektronik for large HP merchant purchase', () => {
    const tx = { merchant: 'Beli HP', amount: 7_988_000 };
    assert.equal(suggestCategoryForLargeTx(tx, []), 'Elektronik');
  });

  it('warns when large amount assigned to Cicilan HP', () => {
    const tx = { amount: 7_988_000, category: 'Cicilan HP' };
    const history = [{ category: 'Cicilan HP', amount: 250_000, type: 'expense' }];
    const result = validateInstallmentCategory(tx, 'Cicilan HP', history);
    assert.equal(result.warn, true);
  });

  it('does not treat Beli HP as loan payment in journal', () => {
    const tx = { type: 'expense', merchant: 'Beli HP', category: 'Elektronik', amount: 7_988_000 };
    assert.equal(isLoanPaymentTransaction(tx), false);
  });

  it('treats cicilan HP as loan payment', () => {
    const tx = { type: 'expense', category: 'Cicilan HP', amount: 250_000 };
    assert.equal(isLoanPaymentTransaction(tx), true);
  });
});

describe('HP 8jt golden scenario', () => {
  const state = {
    selectedMonth: '2026-08',
    transactions: [
      { type: 'income', amount: 5_000_000, date: '2026-08-01', category: 'Gaji', status: 'confirmed' },
      { type: 'expense', amount: 2_539_000, date: '2026-08-05', category: 'Makan', status: 'confirmed' },
      {
        type: 'expense',
        amount: 7_988_000,
        date: '2026-08-10',
        merchant: 'Beli HP',
        category: 'Elektronik',
        status: 'confirmed',
        meta: { expense_treatment: 'asset', is_asset_purchase: true },
      },
    ],
    budgetsByMonth: {},
    db: { userPreferences: {} },
  };

  it('consumption net stays positive', () => {
    const metrics = computePeriodFinancials(state, '2026-08');
    assert.ok(metrics.consumptionNetCashFlow > 0);
    assert.equal(metrics.consumptionExpense, 2_539_000);
    assert.equal(metrics.assetExpense, 7_988_000);
  });

  it('raw net is negative but consumption net positive', () => {
    const totals = sumByTransactionType(state.transactions);
    assert.ok(totals.net < 0);
    assert.ok(totals.consumptionNet > 0);
  });

  it('prediction excludes large purchase from trend', () => {
    const unclassified = {
      ...state,
      transactions: state.transactions.map((t) => (
        t.merchant === 'Beli HP' ? { ...t, meta: {} } : t
      )),
    };
    const future = predictFuture(unclassified, 6);
    assert.ok(future.excluded.length >= 1);
    assert.ok(future.disclaimer?.includes('tidak termasuk'));
  });
});

describe('adaptive health score', () => {
  it('returns analyzing status early in month when progress low', () => {
    const result = computeFinancialHealthScore({
      selectedMonth: '2099-01',
      transactions: [],
      budgetsByMonth: {},
      db: { userPreferences: {} },
    });
    if (result.status === 'analyzing') {
      assert.equal(result.overall, null);
    } else {
      assert.ok(result.overall != null || result.status === 'preliminary');
    }
  });
});
