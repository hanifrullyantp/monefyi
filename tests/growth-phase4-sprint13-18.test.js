/**
 * Growth Sprint 13-18 — benchmark sync, community forum, buddy chat.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setBenchmarkOptInLocal, computeAnonymousBenchmark } from '../app/js/services/anonymous-benchmark.js';
import { buildBenchmarkSnapshot } from '../app/js/services/benchmark-store.js';
import {
  loadForumQuestions,
  postForumQuestion,
  postForumAnswer,
  loadForumAnswers,
  SEED_QUESTIONS,
} from '../app/js/services/community-forum.js';
import {
  matchBuddy,
  sendBuddyMessage,
  loadBuddyMessages,
  getBuddyWeeklyStatus,
} from '../app/js/services/referral-buddy.js';
import { joinChallenge, recordChallengeDay } from '../app/js/services/community-features.js';

describe('Sprint 13 — benchmark snapshot', () => {
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
        db: { userPreferences: { monthly_income: 10000000, benchmark_opt_in: true } },
      },
    };
  });

  it('builds snapshot when opted in', () => {
    setBenchmarkOptInLocal(true);
    const snap = buildBenchmarkSnapshot(window.STATE);
    assert.ok(snap);
    assert.equal(snap.month, '2026-08');
    assert.ok(typeof snap.saving_rate === 'number');
  });

  it('returns null benchmark when not opted in', () => {
    setBenchmarkOptInLocal(false);
    window.STATE.db.userPreferences.benchmark_opt_in = false;
    assert.equal(computeAnonymousBenchmark(window.STATE), null);
  });
});

describe('Sprint 15-16 — buddy chat', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { user: { id: 'u1' } } } };
  });

  it('matches buddy and sends messages', () => {
    const buddy = matchBuddy();
    assert.ok(buddy.label);
    sendBuddyMessage('Semangat!');
    assert.ok(loadBuddyMessages().length >= 2);
  });

  it('reports weekly status', () => {
    matchBuddy();
    const status = getBuddyWeeklyStatus();
    assert.ok(status.my_on_track >= 0);
    assert.ok(status.buddy_on_track >= 0);
  });
});

describe('Sprint 17-18 — community forum & challenges', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('includes seed Q&A questions', async () => {
    const qs = await loadForumQuestions();
    assert.ok(qs.length >= SEED_QUESTIONS.length);
  });

  it('posts local question and answer', async () => {
    const q = await postForumQuestion({ title: 'Test investasi?', anonymous: true });
    assert.ok(q.title);
    const a = await postForumAnswer(q.id, 'Mulai dari reksadana pendapatan tetap.');
    assert.ok(a.body);
    const answers = await loadForumAnswers(q.id);
    assert.ok(answers.length >= 1);
  });

  it('syncs challenge join locally', () => {
    const entry = joinChallenge('track_daily');
    assert.equal(entry.id, 'track_daily');
    const updated = recordChallengeDay('track_daily');
    assert.equal(updated.streak_days, 1);
  });
});
