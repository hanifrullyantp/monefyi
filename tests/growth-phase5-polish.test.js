/**
 * Growth polish — achievements, forum moderation, buddy matching.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { computeAchievementProgress } from '../app/js/services/achievement-catalog.js';
import { getNextAchievementHint } from '../app/js/services/achievement-store.js';
import { moderateForumText, moderateForumQuestion } from '../app/js/services/community-forum-moderation.js';
import { matchBuddy } from '../app/js/services/referral-buddy.js';

describe('Achievement polish', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { transactions: [], selectedMonth: '2026-08' } };
  });

  it('getNextAchievementHint returns locked badge', () => {
    const hint = getNextAchievementHint(window.STATE);
    assert.ok(hint?.badge);
    assert.ok(hint.total >= 1);
  });

  it('computeAchievementProgress tracks streak badges', () => {
    const txs = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-08-0${i + 1}`,
      type: 'expense',
      amount: 10000,
    }));
    const progress = computeAchievementProgress({ transactions: txs, selectedMonth: '2026-08' }, []);
    assert.ok(progress.badges.find((b) => b.id === 'streak_3'));
  });
});

describe('Forum moderation', () => {
  it('blocks URLs and gambling spam', () => {
    assert.equal(moderateForumText('Visit http://spam.com now').ok, false);
    assert.equal(moderateForumText('Main slot gacor menang').ok, false);
  });

  it('allows helpful finance tips', () => {
    assert.equal(moderateForumQuestion({
      title: 'Mulai reksadana pendapatan tetap?',
      body: 'Emergency fund sudah 3 bulan.',
    }).ok, true);
  });

  it('rejects OTP phishing patterns', () => {
    assert.equal(moderateForumText('Kirim kode verifikasi otp kamu').ok, false);
  });
});

describe('Buddy matching helpers', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { user: { id: 'user-abc-123' } } } };
  });

  it('matchBuddy persists local pool buddy', () => {
    const buddy = matchBuddy();
    assert.ok(buddy.label);
    assert.equal(matchBuddy().id, buddy.id);
  });
});
