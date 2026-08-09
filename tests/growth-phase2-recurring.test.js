import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  detectRecurringCandidates,
  addScheduleFromCandidate,
  getRecurringReminderEvents,
  buildRecurringReminderCopy,
  loadRecurringSchedules,
} from '../app/js/services/recurring-transactions.js';

describe('growth-phase2 recurring', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = { STATE: { transactions: [], budgetsByMonth: {} } };
  });

  it('detectRecurringCandidates finds monthly kost pattern', () => {
    const now = new Date('2026-08-09T10:00:00');
    const txs = [
      { type: 'expense', date: '2026-06-05', amount: 1200000, merchant: 'Kost Melati' },
      { type: 'expense', date: '2026-07-05', amount: 1200000, merchant: 'Kost Melati' },
      { type: 'expense', date: '2026-08-05', amount: 1200000, merchant: 'Kost Melati' },
    ];
    const cands = detectRecurringCandidates(txs, { now });
    assert.ok(cands.length >= 1);
    assert.equal(cands[0].due_day, 5);
    assert.equal(cands[0].amount, 1200000);
  });

  it('addScheduleFromCandidate persists schedule', () => {
    const row = addScheduleFromCandidate({
      key: 'kost melati',
      name: 'Kost Melati',
      amount: 1200000,
      category: 'Kost',
      due_day: 5,
    }, { auto_create: true });
    assert.ok(row.id);
    const schedules = loadRecurringSchedules();
    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].auto_create, true);
  });

  it('getRecurringReminderEvents fires on H-3', () => {
    addScheduleFromCandidate({
      key: 'listrik',
      name: 'Listrik',
      amount: 500000,
      category: 'Listrik',
      due_day: 12,
    });
    const now = new Date('2026-08-09T10:00:00');
    const events = getRecurringReminderEvents(now);
    assert.ok(events.some((e) => e.daysUntil === 3));
    const copy = buildRecurringReminderCopy(events[0]);
    assert.ok(copy.title.includes('3 hari'));
  });
});
