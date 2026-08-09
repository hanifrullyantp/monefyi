/**
 * Roadmap Fase 4 smoke tests.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeeklyDigest, formatWeeklyDigestNotification } from '../app/js/services/weekly-digest.js';
import { computeFinancialHealthScore, getHealthGrade } from '../app/js/services/financial-health-score.js';
import { saveJournalEntry, loadJournalEntry } from '../app/js/services/monthly-review-journal.js';

describe('Fase 4.1 — weekly digest', () => {
  it('builds digest with week totals', () => {
    const digest = generateWeeklyDigest({
      selectedMonth: '2026-08',
      transactions: [
        { date: '2026-08-03', type: 'expense', amount: 100000, category: 'Makan' },
        { date: '2026-08-05', type: 'expense', amount: 50000, category: 'Transport' },
        { date: '2026-07-28', type: 'expense', amount: 80000, category: 'Makan' },
      ],
      budgetsByMonth: { '2026-08': { rows: [] } },
    });
    assert.ok(typeof digest.week_total === 'number');
    assert.ok(digest.has_data);
  });

  it('formats notification copy', () => {
    const { title, body } = formatWeeklyDigestNotification({
      week_total: 500000,
      change_label: '↓10%',
      highlights: ['Catat transaksi 5 dari 7 hari'],
      recommendations: ['Kurangi delivery'],
    });
    assert.equal(title, 'Rekap Minggu Ini');
    assert.match(body, /500\.000/);
  });
});

describe('Fase 4.3 — financial health score', () => {
  it('grades high scores correctly', () => {
    assert.equal(getHealthGrade(85), 'Sangat Baik');
    assert.equal(getHealthGrade(40), 'Perlu Perbaikan');
  });

  it('computes overall score from components', () => {
    const result = computeFinancialHealthScore({
      selectedMonth: '2026-08',
      transactions: [
        { date: '2026-08-01', type: 'income', amount: 10000000 },
        { date: '2026-08-02', type: 'expense', amount: 6000000, category: 'Makan', account: 'BCA' },
        { date: '2026-08-03', type: 'expense', amount: 500000, category: 'Transport', account: 'GoPay' },
      ],
      budgetsByMonth: {
        '2026-08': {
          rows: [{ name: 'Makan', amount: 3000000, category_type: 'flexible' }],
        },
      },
      db: { userPreferences: { debt_amount: 0 } },
    });
    assert.ok(result.overall >= 0 && result.overall <= 100);
    assert.ok(result.components.budgetDiscipline);
    assert.ok(result.components.savingRate);
  });
});

describe('Fase 4.2 — monthly journal', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('saves and loads journal entry', () => {
    saveJournalEntry('2026-08', { reflection: 'Hemat lebih baik', intention: 'Kurangi kopi' });
    const entry = loadJournalEntry('2026-08');
    assert.equal(entry.reflection, 'Hemat lebih baik');
    assert.equal(entry.intention, 'Kurangi kopi');
  });
});
