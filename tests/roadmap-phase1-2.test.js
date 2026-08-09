/**
 * Roadmap Fase 1-2 smoke tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRIORITY_LEVELS, formatBudgetRowLabels } from '../app/js/services/budget-model.js';
import { generateSmartSuggestions } from '../app/js/services/smart-suggestions.js';
import { getGreeting } from '../app/js/services/monevisor-messages.js';
import { LABELS } from '../app/js/constants/language.js';

describe('Fase 1.1 — daily budget labels', () => {
  it('uses clearer daily budget copy', () => {
    assert.equal(LABELS.DAILY.AMAN_PER_DAY, 'Aman per Hari');
    assert.equal(LABELS.DAILY.REALISASI_HARIAN, 'Realisasi harian');
    assert.equal(LABELS.DAILY.DAYS_TO_PAYDAY, 'hari ke gajian');
    assert.equal(LABELS.DAILY.CATEGORY_REMAINING, 'Sisa kategori bulan ini');
  });
});

describe('Fase 1.2 — priority colors', () => {
  it('harus uses blue not red', () => {
    assert.ok(PRIORITY_LEVELS.HARUS.color.includes('1e40af') || PRIORITY_LEVELS.HARUS.color.includes('blue'));
    assert.notEqual(PRIORITY_LEVELS.HARUS.color, '#ef4444');
  });

  it('penting uses light blue', () => {
    assert.equal(PRIORITY_LEVELS.PENTING.color, '#3b82f6');
  });
});

describe('Fase 1.3 — redundant paid labels', () => {
  it('strips Lunas from title when bill is paid', () => {
    const row = formatBudgetRowLabels('Kost Lunas', 'paid');
    assert.equal(row.title, 'Kost');
    assert.equal(row.subtitle, '✅ Lunas');
    assert.equal(row.hideStatusBadge, true);
  });

  it('strips inline Lunas from title', () => {
    const row = formatBudgetRowLabels('Tagihan - Lunas', 'paid');
    assert.equal(row.title, 'Tagihan');
    assert.equal(row.subtitle, '✅ Lunas');
  });

  it('shows Lunas subtitle for paid items without lunas in name', () => {
    const row = formatBudgetRowLabels('Listrik', 'paid');
    assert.equal(row.title, 'Listrik');
    assert.equal(row.subtitle, '✅ Lunas');
    assert.equal(row.hideStatusBadge, true);
  });
});

describe('Fase 2.1 — smart suggestions', () => {
  it('detects coffee habit from transactions', () => {
    const month = '2026-08';
    const suggestions = generateSmartSuggestions({
      selectedMonth: month,
      period: { start: `${month}-01`, end: `${month}-31` },
      transactions: [
        { date: '2026-08-01', type: 'expense', amount: 45000, merchant: 'Starbucks' },
        { date: '2026-08-03', type: 'expense', amount: 35000, merchant: 'Kopi Kenangan' },
        { date: '2026-08-05', type: 'expense', amount: 40000, merchant: 'Fore Coffee' },
        { date: '2026-08-07', type: 'expense', amount: 38000, merchant: 'Janji Jiwa' },
      ],
    });
    assert.ok(suggestions.some((s) => s.id === 'coffee-habit'));
  });
});

describe('Fase 2.1 — debt suggestion', () => {
  it('suggests debt payoff boost when prefs set', () => {
    const suggestions = generateSmartSuggestions({
      transactions: [],
      db: {
        userPreferences: {
          debt_amount: 12000000,
          monthly_debt_payment: 1000000,
        },
      },
    });
    assert.ok(suggestions.some((s) => s.id === 'debt-boost'));
  });
});
