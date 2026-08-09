/**
 * Growth Q4 Sprint 19-20 — personality personalization + impulse wishlist.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { computePersonalityResult, savePersonalityResult } from '../app/js/services/money-personality.js';
import {
  applyPersonalityDefaults,
  getPersonalityDashboardCard,
  PERSONALITY_ACTIONS,
} from '../app/js/services/personality-personalization.js';
import {
  addToWishlist,
  getWishlistReadyForReview,
  recordImpulseSkip,
  loadImpulseSkipStats,
  removeWishlistItem,
  updateWishlistItem,
} from '../app/js/services/impulse-wishlist.js';
import { computeImpulseImpact, shouldInterceptPurchase } from '../app/js/services/impulse-guard.js';

describe('Sprint 19 — money personality personalization', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = { STATE: { db: { userPreferences: {} } } };
  });

  it('computePersonalityResult picks dominant type', () => {
    const answers = {};
    for (let i = 0; i < 8; i += 1) answers[`q${i + 1}`] = '0';
    const result = computePersonalityResult(answers);
    assert.ok(result.type_id);
    assert.ok(result.name);
  });

  it('applyPersonalityDefaults enables impulse for spender', () => {
    const result = savePersonalityResult({
      type_id: 'spender',
      name: 'The Spender',
      icon: '🛍️',
      tagline: 'test',
      strategy: 'test',
      features: [],
    });
    const applied = applyPersonalityDefaults(result);
    assert.ok(applied.applied.includes('impulse_guard'));
    const settings = JSON.parse(localStorage.getItem('monefyi_impulse_guard') || '{}');
    assert.equal(settings.enabled, true);
  });

  it('getPersonalityDashboardCard returns CTA for each type', () => {
    for (const typeId of Object.keys(PERSONALITY_ACTIONS)) {
      const card = getPersonalityDashboardCard({ type_id: typeId, name: 'Test', tagline: 'T', strategy: 'S', icon: '🎯' });
      assert.ok(card?.primaryAction?.action);
    }
  });
});

describe('Sprint 20 — impulse wishlist & guard', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
    };
    globalThis.window = {
      STATE: {
        _dailySituation: { safeToSpend: 500000, daysToPayday: 10 },
        db: {
          financialTargets: [{
            name: 'Dana Darurat',
            target_amount: 10000000,
            current_amount: 2000000,
            monthly_contribution: 500000,
            is_primary: true,
          }],
        },
      },
    };
  });

  it('addToWishlist and ready review after period', () => {
    const past = new Date();
    past.setDate(past.getDate() - 31);
    const item = addToWishlist({ name: 'Headphones', amount: 800000 });
    updateWishlistItem(item.id, { review_at: past.toISOString() });
    const ready = getWishlistReadyForReview();
    assert.ok(ready.length >= 1);
    removeWishlistItem(item.id);
  });

  it('recordImpulseSkip tracks monthly savings', () => {
    recordImpulseSkip({ amount: 250000, name: 'Sepatu' });
    recordImpulseSkip({ amount: 150000 });
    const stats = loadImpulseSkipStats();
    assert.equal(stats.month_skips, 2);
    assert.equal(stats.month_saved, 400000);
  });

  it('shouldInterceptPurchase flags discretionary expense', () => {
    assert.equal(shouldInterceptPurchase({
      type: 'expense',
      amount: 200000,
      category: 'Shopping',
    }), true);
  });

  it('computeImpulseImpact includes goal delay note', () => {
    const impact = computeImpulseImpact({ type: 'expense', amount: 600000, category: 'Belanja' }, window.STATE);
    assert.ok(impact.goal_note?.includes('Dana Darurat'));
  });
});
