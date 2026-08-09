/**
 * Roadmap Fase 5 smoke tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIncomeBracket,
  computeAnonymousBenchmark,
  setBenchmarkOptInLocal,
} from '../app/js/services/anonymous-benchmark.js';
import { computeAchievementProgress, ACHIEVEMENT_BADGES } from '../app/js/services/achievement-catalog.js';
import {
  createHousehold,
  loadHousehold,
  addHouseholdMember,
  leaveHousehold,
  getHouseholdSummary,
} from '../app/js/services/household-mode.js';

describe('Fase 5.1 — anonymous benchmark', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    setBenchmarkOptInLocal(true);
  });

  it('maps income to bracket', () => {
    assert.equal(getIncomeBracket(4000000), 'under_5jt');
    assert.equal(getIncomeBracket(10000000), '5_15jt');
    assert.equal(getIncomeBracket(40000000), 'above_30jt');
  });

  it('computes benchmark when opted in', () => {
    const result = computeAnonymousBenchmark({
      selectedMonth: '2026-08',
      transactions: [
        { date: '2026-08-01', type: 'income', amount: 12000000 },
        { date: '2026-08-02', type: 'expense', amount: 3000000, category: 'Makan' },
        { date: '2026-08-03', type: 'expense', amount: 500000, category: 'Transport' },
      ],
      db: { userPreferences: {} },
    });
    assert.ok(result);
    assert.equal(result.metrics.length, 3);
  });
});

describe('Fase 5.2 — achievement catalog', () => {
  it('has badge definitions', () => {
    assert.ok(ACHIEVEMENT_BADGES.length >= 6);
  });

  it('computes level from unlocked badges', () => {
    const progress = computeAchievementProgress({
      selectedMonth: '2026-08',
      transactions: [
        { date: '2026-08-09', type: 'expense', amount: 10000 },
        { date: '2026-08-08', type: 'expense', amount: 10000 },
        { date: '2026-08-07', type: 'expense', amount: 10000 },
      ],
    }, []);
    assert.ok(progress.level >= 1);
    assert.ok(progress.badges.some((b) => b.id === 'streak_3'));
  });
});

describe('Fase 5.3 — household mode', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = { STATE: { db: { profile: { name: 'Budi' } } } };
  });

  it('creates household with invite code', () => {
    const hh = createHousehold('Keluarga Test');
    assert.equal(hh.name, 'Keluarga Test');
    assert.ok(hh.invite_code);
    assert.equal(loadHousehold()?.id, hh.id);
  });

  it('adds members and summarizes', () => {
    createHousehold('Test');
    addHouseholdMember('Ani');
    const summary = getHouseholdSummary({
      selectedMonth: '2026-08',
      transactions: [{ date: '2026-08-01', type: 'expense', amount: 50000 }],
    });
    assert.equal(summary.member_count, 2);
    assert.equal(summary.month_expense, 50000);
    leaveHousehold();
    assert.equal(loadHousehold(), null);
  });
});
