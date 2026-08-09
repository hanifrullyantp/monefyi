/**
 * Household shared transaction sync merge.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { mergeSharedTransactions } from '../app/js/services/household-shared-sync.js';

describe('household-shared-sync', () => {
  beforeEach(() => {
    globalThis.window = { STATE: { transactions: [] } };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('mergeSharedTransactions adds remote shared rows', () => {
    window.STATE.transactions = [
      { id: 'a', amount: 100, date: '2026-08-01', visibility: 'personal' },
    ];
    const merged = mergeSharedTransactions([
      { id: 'b', amount: 50000, date: '2026-08-02', visibility: 'shared', updated_at: '2026-08-02T10:00:00Z' },
    ]);
    assert.equal(merged.length, 2);
    assert.ok(merged.find((t) => t.id === 'b'));
  });

  it('mergeSharedTransactions prefers newer updated_at', () => {
    window.STATE.transactions = [
      { id: 'b', amount: 100, date: '2026-08-02', visibility: 'shared', updated_at: '2026-08-01T10:00:00Z' },
    ];
    const merged = mergeSharedTransactions([
      { id: 'b', amount: 200, date: '2026-08-02', visibility: 'shared', updated_at: '2026-08-03T10:00:00Z' },
    ]);
    assert.equal(merged.find((t) => t.id === 'b').amount, 200);
  });
});
