import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  simulateSavingsExtra,
  simulatePurchaseImpact,
  simulateDebtScenarios,
} from '../app/js/services/what-if-engine.js';
import {
  suggestCategory,
  recordMerchantCategory,
  loadMerchantCategoryMap,
} from '../app/js/services/auto-categorizer.js';

describe('what-if-engine', () => {
  it('simulateSavingsExtra computes months saved', () => {
    const r = simulateSavingsExtra({
      remaining: 10_000_000,
      baseMonthly: 500_000,
      extraMonthly: 500_000,
    });
    assert.equal(r.monthsBase, 20);
    assert.equal(r.monthsNew, 10);
    assert.equal(r.monthsSaved, 10);
    assert.ok(r.extraYear5 > r.extraYear1);
  });

  it('simulatePurchaseImpact warns when over flexible', () => {
    const r = simulatePurchaseImpact(
      { name: 'Laptop', amount: 5_000_000, installments: 1 },
      {
        selectedMonth: '2026-08',
        budgetsByMonth: {
          '2026-08': {
            rows: [{ category_type: 'flexible', amount: 2_000_000, spent: 1_500_000 }],
          },
        },
      },
    );
    assert.equal(r.verdict, 'danger');
  });

  it('simulateDebtScenarios returns baseline and extra scenarios', () => {
    const debts = [{ name: 'HP', balance: 5_000_000, min_payment: 500_000, interest_rate: 12 }];
    const scenarios = simulateDebtScenarios(debts, [0, 200_000]);
    assert.equal(scenarios.length, 2);
    assert.ok(scenarios[1].months <= scenarios[0].months);
  });
});

describe('auto-categorizer merchant map', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('recordMerchantCategory boosts future suggestions', async () => {
    recordMerchantCategory('Warung Bu Siti', 'Makan');
    const map = loadMerchantCategoryMap();
    assert.ok(map['warung bu siti']);
    const s = await suggestCategory({ merchant: 'Warung Bu Siti' });
    assert.equal(s.category, 'Makan');
    assert.equal(s.source, 'merchant_map');
  });

  it('suggests Transport for gojek', async () => {
    const s = await suggestCategory({ merchant: 'Gojek ke kantor' });
    assert.equal(s.category, 'Transport');
  });
});
