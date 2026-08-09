/**
 * Growth advanced — live cohort, buddy thread, what-if.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { applyLiveCohort } from '../app/js/services/benchmark-store.js';
import { computeAnonymousBenchmark } from '../app/js/services/anonymous-benchmark.js';
import {
  simulateSavingsExtra,
  simulatePurchaseImpact,
} from '../app/js/services/what-if-engine.js';
import { sendBuddyMessage, loadBuddyMessages } from '../app/js/services/referral-buddy.js';

describe('Live benchmark cohort', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = {
      STATE: {
        selectedMonth: '2026-08',
        transactions: [
          { date: '2026-08-01', type: 'income', amount: 10000000 },
          { date: '2026-08-02', type: 'expense', amount: 7000000, category: 'Makan' },
        ],
        db: { userPreferences: { benchmark_opt_in: true } },
      },
    };
  });

  it('applyLiveCohort updates peer medians', () => {
    const base = computeAnonymousBenchmark(window.STATE);
    const live = applyLiveCohort(base, {
      live: true,
      sample_size: 12,
      saving_rate: 25,
      food_pct: 20,
      transport_pct: 10,
    });
    assert.equal(live.cohort_live, true);
    assert.equal(live.metrics.find((m) => m.id === 'saving_rate').peers, 25);
  });
});

describe('Buddy remote thread (local)', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { user: { id: 'u1' } } } };
    localStorage.setItem('monefyi_buddy_match', JSON.stringify({
      id: 'buddy_x', label: 'User#ABCD', remote: true, on_track: 80,
    }));
    localStorage.setItem('monefyi_buddy_pair_id', 'pair-1');
  });

  it('sendBuddyMessage stores only user message when remote flag set', async () => {
    const { sendBuddyMessageAsync } = await import('../app/js/services/referral-buddy.js');
    await sendBuddyMessageAsync('Halo buddy!');
    const msgs = loadBuddyMessages();
    assert.equal(msgs.filter((m) => m.from === 'me').length, 1);
    assert.equal(msgs.filter((m) => m.from === 'buddy').length, 0);
  });
});

describe('What-if engine', () => {
  it('simulateSavingsExtra halves timeline when doubling contribution', () => {
    const r = simulateSavingsExtra({
      remaining: 6_000_000,
      baseMonthly: 300_000,
      extraMonthly: 300_000,
    });
    assert.equal(r.monthsBase, 20);
    assert.equal(r.monthsNew, 10);
  });

  it('simulatePurchaseImpact flags danger when over flexible', () => {
    const r = simulatePurchaseImpact(
      { amount: 3_000_000, installments: 1 },
      {
        selectedMonth: '2026-08',
        budgetsByMonth: {
          '2026-08': { rows: [{ category_type: 'flexible', amount: 1_000_000, spent: 900_000 }] },
        },
      },
    );
    assert.equal(r.verdict, 'danger');
  });
});
