import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateMonthlyReportContent,
} from '../app/js/services/monthly-report-generator.js';

// Re-import from financial-goals for gating test
import { getMaxGoalsForPlan as goalMax } from '../app/js/services/financial-goals.js';
import { getISOWeekInfo } from '../app/js/services/weekly-digest-store.js';

describe('monthly-report-generator', () => {
  it('generates content with health score', () => {
    const content = generateMonthlyReportContent('2026-08', {
      transactions: [
        { date: '2026-08-05', type: 'income', amount: 10000000 },
        { date: '2026-08-06', type: 'expense', amount: 3000000, category: 'Makan' },
      ],
      financialCondition: { level: 'safe' },
    });
    assert.equal(content.period, '2026-08');
    assert.ok(content.cover.health_score >= 0 && content.cover.health_score <= 100);
    assert.ok(content.summary.income > 0);
    assert.ok(content.insights.length >= 1);
  });
});

describe('weekly-digest-store', () => {
  it('getISOWeekInfo returns week and year', () => {
    const info = getISOWeekInfo(new Date('2026-08-06T12:00:00'));
    assert.ok(info.week >= 1 && info.week <= 53);
    assert.equal(info.year, 2026);
  });
});

describe('financial-goals plan limits', () => {
  it('trial limited, lifetime unlimited', () => {
    assert.equal(goalMax('trial'), 1);
    assert.equal(goalMax('lifetime'), -1);
  });
});
