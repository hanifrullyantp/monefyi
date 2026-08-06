import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LABELS, t, priorityLabel } from '../app/js/constants/language.js';
import { buildMorningBriefing, buildBudgetMilestoneMessage } from '../app/js/services/contextual-notifications.js';
import { computeFinancialCondition } from '../app/js/services/financial-condition.js';

describe('language.js', () => {
  it('exposes human-friendly priority labels', () => {
    assert.equal(priorityLabel('harus'), 'Tagihan & Kewajiban');
    assert.equal(LABELS.GENERAL.SAVING_RATE, '% yang berhasil disisihkan');
  });

  it('interpolates templates', () => {
    assert.equal(t('Halo {{name}}', { name: 'Budi' }), 'Halo Budi');
    assert.ok(t(LABELS.BUDGET.USED_STATS, {
      used: LABELS.BUDGET.USED,
      spent: '50.000',
      planned: '100.000',
      remaining: '50.000',
    }).includes('Yang sudah dipakai'));
  });
});

describe('contextual-notifications', () => {
  it('builds aman morning briefing', () => {
    const state = {
      db: {
        profile: { created_at: '2020-01-01' },
        userPreferences: { monthly_income: 5000000, payday_day: 25 },
      },
      selectedMonth: '2026-08',
      period: { start: '2026-08-01', end: '2026-08-31' },
      budgetsByMonth: {
        '2026-08': {
          income: 5000000,
          categories: { rows: [{ name: 'Makan', amount: 1500000, priority: 'penting' }] },
        },
      },
      transactions: [
        { date: '2026-08-06', type: 'expense', amount: 50000, category: 'Makan' },
      ],
    };
    globalThis.window = { STATE: state };
    const msg = buildMorningBriefing(state, new Date('2026-08-06T07:30:00'));
    assert.ok(msg?.title.includes('Pagi') || msg?.title.includes('☀️'));
  });

  it('builds budget milestone at 90%', () => {
    const msg = buildBudgetMilestoneMessage({ name: 'Makan' }, 92, 920000, 1000000);
    assert.match(msg.title, /hampir habis/i);
  });
});

describe('financial-condition', () => {
  it('returns incomplete without income', () => {
    assert.equal(computeFinancialCondition({ transactions: [], db: {} }), 'incomplete');
  });
});
