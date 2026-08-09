/**
 * Growth Q4 Sprint 21-22 — emergency mode + wellness metrics.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  buildEmergencyAssessment,
  suggestEmergencyCostCuts,
} from '../app/js/services/emergency-assessment.js';
import {
  isEmergencyModeActive,
  setEmergencyMode,
} from '../app/js/services/emergency-mode.js';
import {
  saveWellnessCheckin,
  computeWellnessScore,
  getWellnessFinancialBlend,
  getWellnessRecommendations,
} from '../app/js/services/financial-wellness.js';

describe('Sprint 21 — emergency mode', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = {
      STATE: {
        selectedMonth: '2026-08',
        transactions: [
          { type: 'expense', amount: 120000, merchant: 'Netflix', date: '2026-06-05' },
          { type: 'expense', amount: 120000, merchant: 'Netflix', date: '2026-07-05' },
          { type: 'expense', amount: 55000, merchant: 'Spotify', date: '2026-06-10' },
          { type: 'expense', amount: 55000, merchant: 'Spotify', date: '2026-07-10' },
          { type: 'expense', amount: 250000, category: 'Hiburan', date: '2026-08-01' },
        ],
        _dailySituation: { safeToSpend: 500000, daysToPayday: 10 },
        db: { userPreferences: {} },
      },
    };
    localStorage.setItem('monefyi_recurring_pending', JSON.stringify([{
      id: 'p1',
      status: 'pending',
      name: 'Kost',
      amount: 1200000,
      due_date: '2026-08-12',
    }]));
  });

  it('buildEmergencyAssessment computes shortage', () => {
    const a = buildEmergencyAssessment(window.STATE);
    assert.ok(a.cash_available >= 0);
    assert.ok(a.bills_due.length >= 1);
    assert.ok(a.shortage >= 0);
    assert.ok(a.immediate_options.length >= 3);
    assert.ok(a.recovery_phases.length >= 2);
  });

  it('suggestEmergencyCostCuts finds subscriptions', () => {
    const cuts = suggestEmergencyCostCuts(window.STATE);
    assert.ok(cuts.length >= 1);
  });

  it('setEmergencyMode toggles active flag', () => {
    assert.equal(isEmergencyModeActive(), false);
    setEmergencyMode(true, 'test');
    assert.equal(isEmergencyModeActive(), true);
    setEmergencyMode(false, 'test');
    assert.equal(isEmergencyModeActive(), false);
  });
});

describe('Sprint 22 — wellness metrics', () => {
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
          { type: 'income', amount: 8000000, date: '2026-08-01' },
          { type: 'expense', amount: 5000000, date: '2026-08-02', category: 'Makan' },
        ],
        db: { userPreferences: {} },
      },
    };
  });

  it('computeWellnessScore from check-ins', () => {
    saveWellnessCheckin({ stress: 4, sleep: 7, confidence: 6 });
    const score = computeWellnessScore();
    assert.ok(score.overall >= 50);
    assert.ok(['Sehat', 'Cukup'].includes(score.label));
  });

  it('getWellnessFinancialBlend combines scores', () => {
    saveWellnessCheckin({ stress: 8, sleep: 5, confidence: 4 });
    const blend = getWellnessFinancialBlend(window.STATE);
    assert.ok(blend.combined != null);
    assert.ok(blend.recommendations.length >= 1);
  });

  it('getWellnessRecommendations suggests emergency when stressed + low health', () => {
    const tips = getWellnessRecommendations(
      { components: { stress: { raw: 8 }, confidence: { raw: 3 } } },
      40,
    );
    assert.ok(tips.some((t) => t.includes('Mode Darurat') || t.includes('Stres')));
  });
});

describe('Sprint 21 — marketing suppressed in emergency', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: { monefyi_emergency_mode: '1' },
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
    globalThis.window = { STATE: { db: { user: { id: 'u1' } } } };
  });

  it('getEligibleOffers returns null when emergency active', async () => {
    const { getEligibleOffers } = await import('../app/js/services/marketing-engine.js');
    const offer = await getEligibleOffers({ skipMarketingPrefs: false, skipGlobalRules: true });
    assert.equal(offer, null);
  });
});
