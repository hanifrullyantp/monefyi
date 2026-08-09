/**
 * Growth Phase 2 — micro-learning, nudges, community, templates.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyTip,
  markLessonComplete,
  getLearningPathSummary,
  LESSONS,
} from '../app/js/services/micro-learning.js';
import {
  getActiveNudges,
  dismissNudge,
  queueSaveCelebration,
  consumeSaveCelebration,
} from '../app/js/services/behavioral-nudges.js';
import {
  joinChallenge,
  getActiveChallenges,
  MONTHLY_CHALLENGES,
} from '../app/js/services/community-features.js';
import {
  getQuickInputTemplates,
  getTimeBasedSuggestion,
} from '../app/js/services/input-templates.js';
import { detectHabitsFromTransactions } from '../app/js/services/user-habits.js';

describe('Growth Sprint 11 — micro-learning', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('rotates daily tip from catalog', () => {
    assert.ok(getDailyTip().title);
    assert.ok(LESSONS.length >= 8);
  });

  it('tracks learning path progress', () => {
    markLessonComplete(LESSONS[0].id);
    const summary = getLearningPathSummary();
    assert.equal(summary.completed, 1);
    assert.ok(summary.percent > 0);
  });
});

describe('Growth Sprint 12 — behavioral nudges', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.sessionStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = {
      STATE: {
        settings: { payday_day: new Date().getDate() },
        db: { profile: { monthly_income: 8000000, payday_day: new Date().getDate() } },
      },
    };
  });

  it('shows payday save-first nudge near payday', () => {
    const nudges = getActiveNudges(window.STATE);
    assert.ok(nudges.some((n) => n.id === 'payday-save-first'));
    dismissNudge('payday-save-first', 1);
  });

  it('consumes save celebration from session', () => {
    queueSaveCelebration({ amount: 500000, goalName: 'Dana Darurat', progressDelta: 4 });
    const c = consumeSaveCelebration();
    assert.ok(c?.title);
    assert.equal(consumeSaveCelebration(), null);
  });
});

describe('Growth Sprint 17 — community', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('joins monthly challenge', () => {
    const entry = joinChallenge(MONTHLY_CHALLENGES[0].id);
    assert.ok(entry.joined_at);
    assert.ok(getActiveChallenges().length >= 1);
  });
});

describe('Growth Fase 2.5 — input templates', () => {
  it('builds templates from transaction history', () => {
    const templates = getQuickInputTemplates({
      transactions: [
        { type: 'expense', amount: 30000, merchant: 'Kopi Kenangan', category: 'Kopi', account: 'GoPay', date: '2026-08-01' },
        { type: 'expense', amount: 30000, merchant: 'Kopi Kenangan', category: 'Kopi', account: 'GoPay', date: '2026-08-03' },
        { type: 'expense', amount: 25000, merchant: 'Grab', category: 'Transport', account: 'GoPay', date: '2026-08-02' },
      ],
    }, 3);
    assert.ok(templates.length >= 1);
  });

  it('returns time-based suggestion or null outside meal hours', () => {
    const s = getTimeBasedSuggestion();
    if (s) assert.ok(s.text);
    else assert.equal(s, null);
  });
});

describe('Growth Fase 1.1 — user habits', () => {
  it('detects frequent merchant habits', () => {
    const txs = [];
    for (let i = 0; i < 5; i += 1) {
      txs.push({
        type: 'expense',
        amount: 35000,
        merchant: 'Starbucks',
        category: 'Kopi',
        date: `2026-08-0${i + 1}`,
      });
    }
    const habits = detectHabitsFromTransactions(txs);
    assert.ok(habits.some((h) => /starbucks/i.test(h.merchant || '')));
  });
});
