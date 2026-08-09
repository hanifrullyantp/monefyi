/**
 * Roadmap Fase 8 smoke tests — unique innovation features.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONALITY_QUESTIONS,
  computePersonalityResult,
  savePersonalityResult,
  loadPersonalityResult,
} from '../app/js/services/money-personality.js';
import {
  loadImpulseSettings,
  saveImpulseSettings,
  shouldInterceptPurchase,
  computeImpulseImpact,
} from '../app/js/services/impulse-guard.js';
import {
  isEmergencyModeActive,
  setEmergencyMode,
  isCategoryLockedInEmergency,
  getEmergencyRunway,
} from '../app/js/services/emergency-mode.js';
import {
  saveWellnessCheckin,
  getThisWeekCheckin,
  computeWellnessScore,
} from '../app/js/services/financial-wellness.js';

describe('Fase 8.1 — money personality', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('has 8 quiz questions and computes dominant type', () => {
    assert.equal(PERSONALITY_QUESTIONS.length, 8);
    const answers = Object.fromEntries(PERSONALITY_QUESTIONS.map((q) => [q.id, '0']));
    const result = computePersonalityResult(answers);
    assert.ok(result.type_id);
    assert.ok(result.strategy);
    assert.ok(result.icon);
  });

  it('persists personality result', () => {
    const result = computePersonalityResult({ q1: '0', q2: '0', q3: '0', q4: '0', q5: '0', q6: '0', q7: '0', q8: '0' });
    savePersonalityResult(result);
    assert.equal(loadPersonalityResult()?.type_id, result.type_id);
  });
});

describe('Fase 8.2 — impulse guard', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('intercepts large discretionary expenses', () => {
    assert.ok(shouldInterceptPurchase({
      type: 'expense',
      amount: 150000,
      category: 'Makan',
      merchant: 'Starbucks',
    }));
  });

  it('skips small or non-discretionary purchases', () => {
    assert.equal(shouldInterceptPurchase({ type: 'expense', amount: 50000, category: 'Makan' }), false);
    assert.equal(shouldInterceptPurchase({ type: 'expense', amount: 200000, category: 'Kost' }), false);
    saveImpulseSettings({ enabled: false });
    assert.equal(shouldInterceptPurchase({ type: 'expense', amount: 200000, category: 'Belanja' }), false);
  });

  it('computes impact preview from daily situation', () => {
    const impact = computeImpulseImpact(
      { amount: 100000 },
      { _dailySituation: { safeToSpend: 500000, daysToPayday: 10 } },
    );
    assert.equal(impact.safe_after, 400000);
    assert.ok(impact.daily_after > 0);
    assert.ok(impact.alternatives.length >= 2);
  });
});

describe('Fase 8.3 — emergency mode', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('locks discretionary categories when active', () => {
    setEmergencyMode(true, 'test');
    assert.ok(isEmergencyModeActive());
    assert.ok(isCategoryLockedInEmergency('Entertainment'));
    assert.equal(isCategoryLockedInEmergency('Kost'), false);
    setEmergencyMode(false, 'test');
    assert.equal(isCategoryLockedInEmergency('Shopping'), false);
  });

  it('returns runway summary', () => {
    const runway = getEmergencyRunway({
      transactions: [],
      settings: { payday_day: 25 },
      _dailySituation: { safeToSpend: 300000, daysToPayday: 5 },
    });
    assert.ok(Array.isArray(runway.actions));
    assert.ok(runway.actions.length >= 2);
    assert.ok(typeof runway.safe_per_day === 'number');
  });
});

describe('Fase 8.4 — financial wellness', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
  });

  it('saves weekly check-in and computes score', () => {
    saveWellnessCheckin({ stress: 3, sleep: 7, confidence: 8, note: 'ok' });
    assert.ok(getThisWeekCheckin());
    const score = computeWellnessScore();
    assert.ok(score.overall >= 50);
    assert.equal(score.label, 'Sehat');
  });
});
