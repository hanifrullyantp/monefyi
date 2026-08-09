/**
 * Launch prep — household shared view + weekly digest AI wiring.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  filterTransactionsForView,
  getTransactionVisibility,
  applyTransactionVisibility,
  getSharedMonthSummary,
} from '../app/js/services/household-shared.js';
import { generateWeeklyDigestWithAi } from '../app/js/services/weekly-digest-ai.js';
import { LANDING_PROMISES } from '../app/js/services/landing-parity.js';

describe('Launch prep — household shared view', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    localStorage.setItem('monefyi_household', JSON.stringify({
      id: 'hh1', members: [{ role: 'owner' }, { role: 'member' }],
    }));
    globalThis.window = { STATE: { selectedMonth: '2026-08', transactions: [] } };
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.window;
  });

  it('filters shared transactions only', () => {
    const txs = [
      { id: '1', date: '2026-08-01', type: 'expense', amount: 50000, visibility: 'shared' },
      { id: '2', date: '2026-08-02', type: 'expense', amount: 30000, visibility: 'personal' },
    ];
    const shared = filterTransactionsForView(txs, 'shared');
    assert.equal(shared.length, 1);
    assert.equal(shared[0].id, '1');
  });

  it('applyTransactionVisibility sets household_id for shared', () => {
    const tx = applyTransactionVisibility({ amount: 10000 }, 'shared');
    assert.equal(tx.visibility, 'shared');
    assert.equal(tx.household_id, 'hh1');
  });

  it('getSharedMonthSummary sums shared txs', () => {
    window.STATE.transactions = [
      { date: '2026-08-01', type: 'expense', amount: 100000, visibility: 'shared' },
      { date: '2026-08-02', type: 'income', amount: 5000000, visibility: 'shared' },
      { date: '2026-08-03', type: 'expense', amount: 50000, visibility: 'personal' },
    ];
    const sum = getSharedMonthSummary(window.STATE);
    assert.equal(sum.expense, 100000);
    assert.equal(sum.income, 5000000);
    assert.equal(sum.txCount, 2);
  });

  it('getTransactionVisibility defaults to personal', () => {
    assert.equal(getTransactionVisibility({}), 'personal');
    assert.equal(getTransactionVisibility({ meta: { visibility: 'shared' } }), 'shared');
  });
});

describe('Launch prep — weekly digest AI fallback', () => {
  beforeEach(() => {
    globalThis.window = {
      STATE: {
        selectedMonth: '2026-08',
        transactions: [
          { date: '2026-08-01', type: 'expense', amount: 50000, category: 'Makan' },
          { date: '2026-08-03', type: 'expense', amount: 30000, category: 'Transport' },
        ],
        db: { userPreferences: {} },
      },
      MONEFYI_CONFIG: {},
    };
    globalThis.fetch = async () => ({ ok: false });
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.fetch;
  });

  it('falls back to heuristic digest when AI unavailable', async () => {
    const digest = await generateWeeklyDigestWithAi(window.STATE);
    assert.equal(typeof digest.has_data, 'boolean');
    assert.ok(Array.isArray(digest.highlights));
    assert.ok(digest.period_label);
  });
});

describe('Launch prep — landing parity growth entries', () => {
  it('includes Q4 differentiation features', () => {
    const ids = LANDING_PROMISES.map((p) => p.id);
    assert.ok(ids.includes('life_event_planner'));
    assert.ok(ids.includes('voice_assistant'));
    assert.ok(ids.includes('money_personality'));
    assert.ok(ids.includes('emergency_mode'));
    assert.ok(ids.includes('financial_wellness'));
  });
});
