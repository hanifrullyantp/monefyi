/**
 * Launch gate — readiness evaluation + flag sync timeout.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateLaunchReadiness,
  LAUNCH_CRITICAL_FLAGS,
} from '../app/js/services/launch-readiness.js';

describe('Launch gate — readiness', () => {
  it('passes when parity and critical flags are active', () => {
    const flags = {};
    for (const key of LAUNCH_CRITICAL_FLAGS) {
      flags[key] = { enabled: true, status: 'active', rollout_pct: 100 };
    }
    flags.ai_coach_pro = { enabled: true, status: 'beta', rollout_pct: 100 };
    const r = evaluateLaunchReadiness(flags);
    assert.equal(r.parity.criticalFails, 0);
    assert.equal(r.ready, true);
    assert.equal(r.blockers.length, 0);
  });

  it('blocks when critical flag is off', () => {
    const flags = {
      household_mode: { enabled: false, status: 'off', rollout_pct: 0 },
      weekly_ai_digest: { enabled: true, status: 'active', rollout_pct: 100 },
      multiple_goals: { enabled: true, status: 'active', rollout_pct: 100 },
      debt_payoff_planner: { enabled: true, status: 'active', rollout_pct: 100 },
      monthly_auto_report: { enabled: true, status: 'active', rollout_pct: 100 },
      in_app_marketing: { enabled: true, status: 'active', rollout_pct: 100 },
    };
    const r = evaluateLaunchReadiness(flags);
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.id === 'flag_household_mode'));
  });

  it('blocks when parity score too low', () => {
    const flags = {};
    for (const key of LAUNCH_CRITICAL_FLAGS) {
      flags[key] = { enabled: true, status: 'active', rollout_pct: 100 };
    }
    flags.household_mode = { enabled: false, status: 'off', rollout_pct: 0 };
    const r = evaluateLaunchReadiness(flags);
    assert.ok(r.score < 100);
    assert.equal(r.ready, false);
  });
});

describe('Launch gate — feature flag sync timeout', () => {
  it('returns cached map when remote exceeds timeout', async () => {
    globalThis.window = {
      STATE: {
        featureFlags: { test_flag: { enabled: true, status: 'active', rollout_pct: 100 } },
      },
    };
    globalThis.localStorage = {
      _data: { monefyi_feature_flags_v2: JSON.stringify({ cached: { enabled: true, status: 'active', rollout_pct: 100 } }) },
      getItem(k) { return this._data[k] ?? null; },
      setItem() {},
    };

    const { syncFeatureFlagsFromRemote } = await import('../app/js/services/feature-flag-store.js');
    const originalSupa = window.STATE.db;
    window.STATE.db = {
      supa: {
        from: () => ({
          select: () => new Promise(() => {}),
        }),
      },
    };

    const start = Date.now();
    const map = await syncFeatureFlagsFromRemote({ timeoutMs: 80 });
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 300);
    assert.ok(map.test_flag || map.cached);

    delete globalThis.window;
    delete globalThis.localStorage;
  });
});
