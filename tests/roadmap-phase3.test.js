/**
 * Roadmap Fase 3 smoke tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { suggestCategory, formatConfidenceBadge } from '../app/js/services/auto-categorizer.js';
import {
  syncSchedulesFromBudget,
  generateDueRecurring,
  loadRecurringPending,
  dismissRecurringPending,
} from '../app/js/services/recurring-transactions.js';

describe('Fase 3.2 — auto-categorizer', () => {
  it('suggests Transport for gojek merchant', async () => {
    const result = await suggestCategory({ merchant: 'Gojek ke kantor' });
    assert.equal(result.category, 'Transport');
    assert.ok(result.confidence >= 0.65);
  });

  it('formatConfidenceBadge maps levels', () => {
    assert.equal(formatConfidenceBadge(0.9), 'Tinggi');
    assert.equal(formatConfidenceBadge(0.7), 'Sedang');
    assert.equal(formatConfidenceBadge(0.5), 'Rendah');
  });
});

describe('Fase 3.1 — recurring transactions', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = {
      STATE: {
        selectedMonth: '2026-08',
        budgetsByMonth: {
          '2026-08': {
            rows: [{
              id: 'b1',
              name: 'Listrik',
              amount: 500000,
              category_type: 'fixed_bill',
              due_day: 5,
              default_account: 'BCA',
            }],
          },
        },
        transactions: [],
      },
    };
  });

  it('syncs schedules from fixed bills', () => {
    syncSchedulesFromBudget(window.STATE);
    const raw = localStorage.getItem('monefyi_recurring_schedules');
    assert.ok(raw);
    const rows = JSON.parse(raw);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Listrik');
  });

  it('generates pending when due day passed', () => {
    syncSchedulesFromBudget(window.STATE);
    const now = new Date('2026-08-09T10:00:00');
    const pending = generateDueRecurring(now);
    assert.ok(pending.length >= 1);
    assert.equal(pending[0].status, 'pending');
  });

  it('dismiss removes item from active pending', () => {
    syncSchedulesFromBudget(window.STATE);
    generateDueRecurring(new Date('2026-08-09T10:00:00'));
    const item = loadRecurringPending().find((p) => p.status === 'pending');
    assert.ok(item);
    dismissRecurringPending(item.id);
    const after = loadRecurringPending().filter((p) => p.status === 'pending');
    assert.equal(after.length, 0);
  });
});
