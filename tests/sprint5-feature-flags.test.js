import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  getRolloutBucket,
  isFeatureEnabled,
} from '../app/js/services/feature-flag-store.js';

describe('feature-flag-store', () => {
  beforeEach(() => {
    globalThis.window = {
      STATE: {
        featureFlags: {},
        featureFlagOverrides: {},
        db: { user: { id: 'user-test-abc' } },
      },
    };
    globalThis.localStorage = {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
    };
  });

  it('getRolloutBucket is deterministic', () => {
    const a = getRolloutBucket('user-1', 'weekly_ai_digest');
    const b = getRolloutBucket('user-1', 'weekly_ai_digest');
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 100);
  });

  it('isFeatureEnabled respects rollout_pct', () => {
    window.STATE.featureFlags = {
      debt_payoff_planner: { enabled: true, rollout_pct: 0, status: 'active' },
    };
    assert.equal(isFeatureEnabled('debt_payoff_planner', 'user-x'), false);

    window.STATE.featureFlags.debt_payoff_planner.rollout_pct = 100;
    assert.equal(isFeatureEnabled('debt_payoff_planner', 'user-x'), true);
  });

  it('isFeatureEnabled honors per-user override', () => {
    window.STATE.featureFlags = {
      multiple_goals: { enabled: true, rollout_pct: 100, status: 'active' },
    };
    window.STATE.featureFlagOverrides = {
      'user-override': { multiple_goals: false },
    };
    assert.equal(isFeatureEnabled('multiple_goals', 'user-override'), false);
    assert.equal(isFeatureEnabled('multiple_goals', 'user-other'), true);
  });

  it('isFeatureEnabled returns false when status is off', () => {
    window.STATE.featureFlags = {
      in_app_marketing: { enabled: true, rollout_pct: 100, status: 'off' },
    };
    assert.equal(isFeatureEnabled('in_app_marketing', 'user-1'), false);
  });

  it('isFeatureEnabled falls back to DEFAULT_FLAGS when cache empty', () => {
    window.STATE.featureFlags = {};
    assert.equal(isFeatureEnabled('household_mode', 'user-1'), true);
  });
});
