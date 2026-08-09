/**
 * Combined household dashboard metrics.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { buildCombinedHouseholdDashboard } from '../app/js/services/household-combined-dashboard.js';

describe('household-combined-dashboard', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(k) { return this.store[k] ?? null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; },
    };
    globalThis.localStorage.setItem('monefyi_household', JSON.stringify({
      id: 'hh1',
      name: 'Keluarga A',
      members: [{ role: 'owner' }, { role: 'member' }],
    }));
    globalThis.window = { STATE: {}, localStorage: globalThis.localStorage };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
  });

  it('buildCombinedHouseholdDashboard aggregates shared txs', () => {
    window.STATE = {
      selectedMonth: '2026-08',
      transactions: [
        { type: 'income', amount: 10000000, date: '2026-08-01', visibility: 'shared' },
        { type: 'expense', amount: 2000000, date: '2026-08-05', visibility: 'shared', category: 'Makan' },
        { type: 'expense', amount: 500000, date: '2026-08-06', visibility: 'personal', category: 'Hobi' },
      ],
      db: { financialGoals: [{ id: 'g1', name: 'Liburan', status: 'active', shared: true, target_amount: 5000000, current_amount: 1000000 }] },
    };
    const dash = buildCombinedHouseholdDashboard(window.STATE);
    assert.ok(dash);
    assert.equal(dash.shared.income, 10000000);
    assert.equal(dash.shared.expense, 2000000);
    assert.equal(dash.shared.net, 8000000);
    assert.equal(dash.personal.expense, 500000);
    assert.equal(dash.sharedGoals.length, 1);
    assert.equal(dash.shared.topCategories[0].name, 'Makan');
  });

  it('returns null without household', () => {
    localStorage.removeItem('monefyi_household');
    assert.equal(buildCombinedHouseholdDashboard({ transactions: [] }), null);
  });
});
