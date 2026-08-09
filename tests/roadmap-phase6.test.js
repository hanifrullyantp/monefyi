/**
 * Roadmap Fase 6 smoke tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertInvestment,
  loadInvestments,
  computePortfolioSummary,
  deleteInvestment,
} from '../app/js/services/investment-tracker.js';
import {
  upsertDebt,
  loadDebts,
  simulatePayoff,
  compareStrategies,
  saveDebts,
} from '../app/js/services/debt-payoff-planner.js';
import {
  generateCoachActions,
  generateOfflineCoachReply,
} from '../app/js/services/monevisor-coach-actions.js';

describe('Fase 6.1 — investment tracker', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('tracks portfolio value and return', () => {
    upsertInvestment({ name: 'RDPU', units: 100, avg_cost: 1000, current_price: 1100, asset_type: 'Reksadana' });
    const summary = computePortfolioSummary();
    assert.equal(summary.holdings, 1);
    assert.equal(summary.total_cost, 100000);
    assert.equal(summary.total_value, 110000);
    assert.equal(summary.return_pct, 10);
    deleteInvestment(loadInvestments()[0].id);
    assert.equal(loadInvestments().length, 0);
  });
});

describe('Fase 6.2 — debt payoff planner', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    saveDebts([]);
  });

  it('simulates payoff months', () => {
    const debts = [{
      id: 'd1', name: 'Kartu', balance: 5000000, min_payment: 500000, interest_rate: 24,
    }];
    const plan = simulatePayoff(debts, 200000, 'avalanche');
    assert.ok(plan.months > 0);
    assert.ok(plan.total_interest >= 0);
  });

  it('compares snowball vs avalanche', () => {
    upsertDebt({ name: 'A', balance: 3000000, min_payment: 300000, interest_rate: 18 });
    upsertDebt({ name: 'B', balance: 8000000, min_payment: 500000, interest_rate: 12 });
    const cmp = compareStrategies(loadDebts(), 0);
    assert.ok(cmp.snowball.months > 0);
    assert.ok(cmp.avalanche.months > 0);
  });
});

describe('Fase 6.3 — coach actions', () => {
  it('generates contextual actions', () => {
    const actions = generateCoachActions({
      db: { userPreferences: { debt_amount: 5000000 } },
      transactions: [],
    });
    assert.ok(actions.some((a) => a.id === 'coach_debt'));
  });

  it('offline reply for debt questions', () => {
    globalThis.localStorage = {
      _data: { monefyi_debts: JSON.stringify([{ id: 'd1', name: 'X', balance: 1000000, min_payment: 100000, interest_rate: 12 }]) },
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: {} };
    const reply = generateOfflineCoachReply('snowball vs avalanche?', window.STATE);
    assert.ok(reply);
    assert.match(reply, /Avalanche|Snowball/);
  });
});
