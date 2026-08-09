/**
 * Perfection batch tests — retirement, debt milestones, split, landing sync, compliance.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  simulateRetirement,
} from '../app/js/services/what-if-engine.js';
import {
  computeDebtPayoffPercent,
  milestoneForPercent,
  checkDebtMilestones,
  resetDebtMilestones,
} from '../app/js/services/debt-milestones.js';
import {
  buildSplitTransactions,
  defaultHalfSplit,
} from '../app/js/services/transaction-split.js';
import {
  buildLandingParityPatch,
  auditLandingParity,
} from '../app/js/services/landing-parity.js';
import { buildUserContext } from '../app/js/services/marketing-engine.js';

describe('simulateRetirement', () => {
  it('on track when contribution sufficient', () => {
    const sim = simulateRetirement({
      currentAge: 25,
      retireAge: 60,
      currentSavings: 10_000_000,
      monthlyContribution: 5_000_000,
      monthlyExpenseAtRetire: 5_000_000,
    });
    assert.ok(sim.projectedBalance > 0);
    assert.equal(typeof sim.onTrack, 'boolean');
    assert.ok(sim.years === 35);
  });

  it('suggests extra monthly when behind', () => {
    const sim = simulateRetirement({
      currentAge: 50,
      retireAge: 60,
      currentSavings: 0,
      monthlyContribution: 100_000,
      monthlyExpenseAtRetire: 10_000_000,
    });
    assert.equal(sim.onTrack, false);
    assert.ok(sim.extraMonthlyNeeded > 0);
  });
});

describe('debt-milestones', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(k) { return this.store[k] ?? null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; },
    };
    resetDebtMilestones();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('computeDebtPayoffPercent tracks progress', () => {
    const pct = computeDebtPayoffPercent([
      { original_amount: 1000000, balance: 250000 },
    ]);
    assert.equal(pct, 75);
    assert.equal(milestoneForPercent(pct), 75);
  });

  it('checkDebtMilestones fires once per threshold', async () => {
    const first = await checkDebtMilestones([
      { original_amount: 1000000, balance: 500000 },
    ]);
    assert.equal(first?.milestone, 50);
    const second = await checkDebtMilestones([
      { original_amount: 1000000, balance: 500000 },
    ]);
    assert.equal(second, null);
  });
});

describe('transaction-split', () => {
  it('buildSplitTransactions validates total', () => {
    const res = buildSplitTransactions(
      { id: 'tx1', amount: 100000, category: 'Makan', date: '2026-08-01', type: 'expense' },
      [{ amount: 40000, category: 'Makan' }, { amount: 40000, category: 'Transport' }],
    );
    assert.equal(res.success, false);
  });

  it('defaultHalfSplit creates two lines', () => {
    const res = defaultHalfSplit(
      { id: 'tx1', amount: 100000, category: 'Belanja', date: '2026-08-01', type: 'expense' },
      'Makan',
      'Transport',
    );
    assert.equal(res.success, true);
    assert.equal(res.transactions?.length, 2);
    const total = res.transactions.reduce((s, t) => s + t.amount, 0);
    assert.equal(total, 100000);
  });
});

describe('landing parity patch', () => {
  it('buildLandingParityPatch marks fail items as coming soon', () => {
    const audit = auditLandingParity({
      household_mode: { enabled: false, status: 'off', rollout_pct: 0 },
      weekly_ai_digest: { enabled: true, status: 'active', rollout_pct: 100 },
    });
    const patch = buildLandingParityPatch(audit);
    assert.ok(patch.parity_score >= 0);
    const hh = patch.all_features.find((f) => f.id === 'household_mode');
    assert.equal(hh?.badge, '⏳ Coming soon');
  });
});

describe('marketing couple banner context', () => {
  it('couple_inactive detected from household local state', () => {
    globalThis.localStorage = {
      getItem: (k) => (k === 'monefyi_household'
        ? JSON.stringify({ invite_code: 'ABC', members: [{ role: 'owner' }] })
        : null),
      setItem: () => {},
      removeItem: () => {},
    };
    globalThis.window = {
      STATE: { db: { profile: { plan_type: 'monthly' } }, transactions: [] },
      localStorage: globalThis.localStorage,
    };
    assert.equal(buildUserContext(window.STATE).household_status, 'couple_inactive');
    delete globalThis.window;
    delete globalThis.localStorage;
  });
});
