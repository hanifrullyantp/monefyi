import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeRecordingStreak,
  getStreakMilestone,
  getStreakEveningReminder,
} from '../app/js/services/daily-streak.js';
import { canShowAchievement } from '../app/js/services/mini-win-engine.js';
import { resolveHomeViewMode } from '../app/js/services/home-view-mode.js';
import { generateWeeklyCheckinHeuristic } from '../app/js/services/weekly-checkin.js';

describe('daily-streak', () => {
  it('counts consecutive days with transactions', () => {
    const txs = [
      { date: '2026-08-06' },
      { date: '2026-08-05' },
      { date: '2026-08-04' },
    ];
    const info = computeRecordingStreak(txs, new Date('2026-08-06T12:00:00'));
    assert.equal(info.streak, 3);
    assert.equal(info.loggedToday, true);
  });

  it('returns milestone at 7 days', () => {
    const m = getStreakMilestone(7);
    assert.ok(m?.message.includes('Seminggu'));
  });

  it('reminds in evening when not logged', () => {
    const evening = new Date('2026-08-06T20:30:00');
    const msg = getStreakEveningReminder({ loggedToday: false, streak: 5 }, evening);
    assert.ok(msg);
  });
});

describe('mini-win-engine', () => {
  it('respects 7-day cooldown', () => {
    const recent = [{
      achievement_type: 'first_transaction',
      shown_at: new Date().toISOString(),
    }];
    assert.equal(canShowAchievement('first_transaction', recent), false);
  });
});

describe('home-view-mode', () => {
  it('defaults new users to simple within 7 days', () => {
    const mode = resolveHomeViewMode({
      db: {
        userPreferences: { home_view_mode: 'auto' },
        profile: { created_at: new Date().toISOString() },
      },
    });
    assert.equal(mode, 'simple');
  });
});

describe('weekly-checkin', () => {
  it('generates sections from transactions', () => {
    const content = generateWeeklyCheckinHeuristic({
      transactions: [
        { date: '2026-08-06', type: 'expense', amount: 10000, category: 'Makan' },
        { date: '2026-08-05', type: 'expense', amount: 10000, category: 'Makan' },
      ],
      selectedMonth: '2026-08',
      budgetsByMonth: {
        '2026-08': {
          categories: {
            rows: [{ name: 'Makan', amount: 1000000, priority: 'penting' }],
          },
        },
      },
    });
    assert.ok(content.good.length || content.attention.length);
    assert.ok(content.focus);
  });
});
