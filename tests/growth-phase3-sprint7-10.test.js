/**
 * Growth Sprint 7-10 — digest coaching, monthly ritual, health score.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getCoachingLevel, applyCoachingTone } from '../app/js/services/weekly-digest-coaching.js';
import { generateWeeklyDigest } from '../app/js/services/weekly-digest.js';
import { detectMonthlyPatterns } from '../app/js/services/monthly-review-patterns.js';
import { shouldPromptMonthlyReview, dismissMonthlyReviewPrompt, getCurrentPeriod } from '../app/js/services/monthly-review-prompt.js';
import { saveJournalEntry, loadJournalEntry } from '../app/js/services/monthly-review-journal.js';
import { computeFinancialHealthScore, loadScoreHistory } from '../app/js/services/financial-health-score.js';

describe('Sprint 7 — weekly digest coaching', () => {
  it('classifies beginner vs advanced users', () => {
    assert.equal(getCoachingLevel({ transactions: [] }), 'beginner');
    const txs = Array.from({ length: 150 }, (_, i) => ({
      date: `2026-0${1 + (i % 8)}-${String((i % 28) + 1).padStart(2, '0')}`,
      type: 'expense',
      amount: 10000,
    }));
    assert.equal(getCoachingLevel({ transactions: txs, db: { user: { created_at: '2024-01-01' } } }), 'advanced');
  });

  it('adds coaching greeting to digest', () => {
    const digest = applyCoachingTone({ recommendations: ['Test'], focus: 'Catat harian' }, { transactions: [] });
    assert.ok(digest.coaching_greeting);
    assert.equal(digest.coaching_level, 'beginner');
  });

  it('generateWeeklyDigest includes coaching fields', () => {
    const d = generateWeeklyDigest({
      transactions: [{ date: '2026-08-09', type: 'expense', amount: 50000, category: 'Makan' }],
      period: { start: '2026-08-01', end: '2026-08-31' },
      selectedMonth: '2026-08',
    });
    assert.ok(d.coaching_level);
  });
});

describe('Sprint 8 — monthly review ritual', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('detects monthly spending patterns', () => {
    const txs = [];
    for (let i = 1; i <= 10; i += 1) {
      const d = new Date(2026, 7, i);
      txs.push({
        type: 'expense',
        amount: d.getDay() === 6 ? 300000 : 50000,
        date: d.toISOString().slice(0, 10),
        category: 'Hiburan',
      });
    }
    const patterns = detectMonthlyPatterns('2026-08', txs);
    assert.ok(patterns.length >= 1);
  });

  it('prompts review near month end when no journal', () => {
    const lastDay = new Date(2026, 7, 31);
    assert.equal(shouldPromptMonthlyReview(lastDay), true);
    dismissMonthlyReviewPrompt(getCurrentPeriod(lastDay));
    assert.equal(shouldPromptMonthlyReview(lastDay), false);
  });

  it('saves extended journal entry', () => {
    saveJournalEntry('2026-08', {
      proud: 'Nabung konsisten',
      improve: 'Kurangi delivery',
      surprise: 'Servis motor',
      allocation_choice: 'emergency',
      intentions: ['save_1m'],
      patterns: [{ text: 'Sabtu mahal' }],
    });
    const entry = loadJournalEntry('2026-08');
    assert.equal(entry.proud, 'Nabung konsisten');
    assert.ok(entry.intentions.includes('save_1m'));
  });
});

describe('Sprint 9-10 — financial health score 6 components', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('includes financial habit component and history', () => {
    const result = computeFinancialHealthScore({
      selectedMonth: '2026-08',
      transactions: [
        { date: '2026-08-01', type: 'income', amount: 10000000 },
        { date: '2026-08-02', type: 'expense', amount: 5000000, category: 'Makan', account: 'BCA' },
      ],
      db: { userPreferences: { debt_amount: 0 } },
    });
    assert.ok(result.components.financialHabit);
    assert.ok(result.overall <= 100);
    assert.ok(loadScoreHistory().length >= 1);
  });
});
