/**
 * Household shared view + weekly digest AI helpers.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  filterTransactionsForView,
  getTransactionVisibility,
  applyTransactionVisibility,
  setDashboardViewMode,
  getDashboardViewMode,
} from '../app/js/services/household-shared.js';
import { generateWeeklyDigestWithAi } from '../app/js/services/weekly-digest-ai.js';

describe('household-shared', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(k) { return this.store[k] ?? null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; },
    };
    globalThis.localStorage.setItem('monefyi_household', JSON.stringify({ id: 'hh1', members: [{ role: 'owner' }] }));
    globalThis.window = { STATE: { transactions: [] }, localStorage: globalThis.localStorage };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('filterTransactionsForView - shared mode only shared txs', () => {
    setDashboardViewMode('shared');
    const txs = [
      { id: '1', visibility: 'personal', amount: 100 },
      { id: '2', visibility: 'shared', amount: 200 },
    ];
    const filtered = filterTransactionsForView(txs, 'shared');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '2');
  });

  it('applyTransactionVisibility sets household_id when shared', () => {
    const tx = applyTransactionVisibility({ id: 'a', amount: 1 }, 'shared');
    assert.equal(tx.visibility, 'shared');
    assert.equal(tx.household_id, 'hh1');
  });

  it('getTransactionVisibility reads meta fallback', () => {
    assert.equal(getTransactionVisibility({ meta: { visibility: 'shared' } }), 'shared');
  });
});

describe('weekly-digest-ai fallback', () => {
  it('generateWeeklyDigestWithAi falls back without network', async () => {
    globalThis.window = {
      STATE: {
        transactions: [{ type: 'expense', amount: 50000, date: new Date().toISOString().slice(0, 10) }],
        settings: { lang: 'id' },
      },
    };
    const digest = await generateWeeklyDigestWithAi(window.STATE);
    assert.ok(digest.has_data !== undefined || digest.week_total >= 0);
    delete globalThis.window;
  });
});
