import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LANDING_PROMISES,
  auditLandingParity,
  evaluateFeatureFlag,
} from '../app/js/services/landing-parity.js';

describe('landing-parity', () => {
  it('LANDING_PROMISES covers critical Pro+ features', () => {
    const ids = LANDING_PROMISES.map((p) => p.id);
    assert.ok(ids.includes('household_mode'));
    assert.ok(ids.includes('weekly_digest'));
    assert.ok(ids.includes('multiple_goals'));
    assert.ok(ids.includes('debt_planner'));
  });

  it('evaluateFeatureFlag - off returns fail', () => {
    assert.equal(evaluateFeatureFlag({ enabled: false, status: 'active', rollout_pct: 100 }), 'fail');
    assert.equal(evaluateFeatureFlag({ enabled: true, status: 'off', rollout_pct: 100 }), 'fail');
  });

  it('evaluateFeatureFlag - beta returns warn', () => {
    assert.equal(evaluateFeatureFlag({ enabled: true, status: 'beta', rollout_pct: 100 }), 'warn');
  });

  it('auditLandingParity - all flags active yields ready', () => {
    const flags = {};
    for (const p of LANDING_PROMISES) {
      if (p.featureFlag) {
        flags[p.featureFlag] = { enabled: true, status: 'active', rollout_pct: 100 };
      }
    }
    const result = auditLandingParity(flags);
    assert.equal(result.criticalFails, 0);
    assert.equal(result.ready, true);
    assert.ok(result.score >= 90);
  });

  it('auditLandingParity - disabled critical flag blocks launch', () => {
    const flags = {
      household_mode: { enabled: false, status: 'off', rollout_pct: 0 },
      weekly_ai_digest: { enabled: true, status: 'active', rollout_pct: 100 },
      multiple_goals: { enabled: true, status: 'active', rollout_pct: 100 },
      debt_payoff_planner: { enabled: true, status: 'active', rollout_pct: 100 },
    };
    const result = auditLandingParity(flags);
    assert.ok(result.criticalFails >= 1);
    assert.equal(result.ready, false);
    const hh = result.items.find((i) => i.id === 'household_mode');
    assert.equal(hh?.status, 'fail');
  });
});
