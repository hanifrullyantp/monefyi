/**
 * Launch gate — aggregates parity, flags, and checklist for go-live decision.
 * @module services/launch-readiness
 */

import { auditLandingParity, evaluateFeatureFlag } from './landing-parity.js';

/** Critical feature flags that must be active at launch. */
export const LAUNCH_CRITICAL_FLAGS = [
  'household_mode',
  'weekly_ai_digest',
  'multiple_goals',
  'debt_payoff_planner',
  'monthly_auto_report',
  'in_app_marketing',
];

/**
 * @param {Record<string, object>} [flagsMap]
 * @returns {{ ready: boolean, score: number, parity: object, checks: object[], blockers: object[] }}
 */
export function evaluateLaunchReadiness(flagsMap = {}) {
  const parity = auditLandingParity(flagsMap);

  /** @type {object[]} */
  const checks = [
    {
      id: 'parity_score',
      label: 'Parity score ≥ 90%',
      ok: parity.score >= 90,
      message: `${parity.score}%`,
      critical: true,
    },
    {
      id: 'parity_critical',
      label: 'Zero critical parity fails',
      ok: parity.criticalFails === 0,
      message: parity.criticalFails === 0 ? 'OK' : `${parity.criticalFails} fail`,
      critical: true,
    },
  ];

  for (const key of LAUNCH_CRITICAL_FLAGS) {
    const flag = flagsMap[key];
    const status = evaluateFeatureFlag(flag);
    checks.push({
      id: `flag_${key}`,
      label: `Flag ${key} active`,
      ok: status !== 'fail',
      message: flag ? `${flag.status || '—'} · rollout ${flag.rollout_pct ?? 0}%` : 'default/off',
      critical: true,
    });
  }

  const blockers = checks.filter((c) => c.critical && !c.ok);
  const ready = blockers.length === 0 && parity.ready;

  return {
    ready,
    score: parity.score,
    parity,
    checks,
    blockers,
  };
}

/**
 * User-facing summary for settings (non-admin).
 * @param {Record<string, object>} [flagsMap]
 * @returns {{ ready: boolean, score: number, blockers: object[] }}
 */
export function getLaunchReadinessSummary(flagsMap) {
  const r = evaluateLaunchReadiness(flagsMap || {});
  return {
    ready: r.ready,
    score: r.score,
    blockers: r.blockers.slice(0, 5),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiLaunchReadiness = {
    LAUNCH_CRITICAL_FLAGS,
    evaluateLaunchReadiness,
    getLaunchReadinessSummary,
  };
}
