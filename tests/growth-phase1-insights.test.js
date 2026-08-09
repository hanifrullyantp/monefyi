import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateSmartSuggestions,
  detectSubscriptions,
  detectWeekendPattern,
  detectSavingOpportunity,
  fmtCompact,
} from '../app/js/services/smart-suggestions.js';

describe('growth-phase1 smart suggestions', () => {
  it('detectSubscriptions finds multiple subs', () => {
    const txs = [
      { type: 'expense', amount: 120000, merchant: 'Netflix', date: '2026-06-05' },
      { type: 'expense', amount: 120000, merchant: 'Netflix', date: '2026-07-05' },
      { type: 'expense', amount: 55000, merchant: 'Spotify', date: '2026-06-10' },
      { type: 'expense', amount: 55000, merchant: 'Spotify', date: '2026-07-10' },
    ];
    const insight = detectSubscriptions(txs);
    assert.ok(insight);
    assert.equal(insight.id, 'subscription-stack');
  });

  it('detectWeekendPattern flags high weekend spend', () => {
    const txs = [];
    for (let i = 0; i < 20; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      txs.push({
        type: 'expense',
        amount: dow === 0 || dow === 6 ? 250000 : 50000,
        date: iso,
      });
    }
    const insight = detectWeekendPattern(txs);
    assert.ok(insight);
    assert.equal(insight.id, 'weekend-spending');
  });

  it('detectSavingOpportunity when income spikes', () => {
    const txs = [
      ...['2026-05-01', '2026-06-01', '2026-07-01'].map((d) => ({ type: 'income', amount: 5000000, date: d })),
      { type: 'income', amount: 7000000, date: '2026-08-05' },
    ];
    const insight = detectSavingOpportunity(txs, '2026-08');
    assert.ok(insight);
    assert.equal(insight.id, 'saving-opportunity');
  });

  it('generateSmartSuggestions returns sorted max 5', () => {
    const month = '2026-08';
    const list = generateSmartSuggestions({
      selectedMonth: month,
      period: { start: `${month}-01`, end: `${month}-31` },
      transactions: [
        { date: '2026-08-01', type: 'expense', amount: 45000, merchant: 'Starbucks' },
        { date: '2026-08-03', type: 'expense', amount: 35000, merchant: 'Kopi Kenangan' },
        { date: '2026-08-05', type: 'expense', amount: 40000, merchant: 'Fore Coffee' },
        { date: '2026-08-07', type: 'expense', amount: 38000, merchant: 'Janji Jiwa' },
        { date: '2026-06-05', type: 'expense', amount: 120000, merchant: 'Netflix' },
        { date: '2026-07-05', type: 'expense', amount: 120000, merchant: 'Netflix' },
        { date: '2026-06-10', type: 'expense', amount: 55000, merchant: 'Spotify' },
        { date: '2026-07-10', type: 'expense', amount: 55000, merchant: 'Spotify' },
      ],
    });
    assert.ok(list.length >= 1);
    assert.ok(list.length <= 5);
  });

  it('fmtCompact formats amounts', () => {
    assert.equal(fmtCompact(1500000), '1.5jt');
    assert.equal(fmtCompact(45000), '45rb');
  });
});
