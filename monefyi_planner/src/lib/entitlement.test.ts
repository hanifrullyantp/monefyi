import { describe, expect, it } from 'vitest';
import {
  buildEntitlementSnapshot,
  isActiveProjectStatus,
  mapLegacyOrgPlan,
} from './entitlement';

describe('entitlement - mapLegacyOrgPlan', () => {
  it('maps pro plans to pro tier', () => {
    expect(mapLegacyOrgPlan('pro')).toBe('pro');
    expect(mapLegacyOrgPlan('pro_plus')).toBe('pro');
  });

  it('maps starter to estimator', () => {
    expect(mapLegacyOrgPlan('starter')).toBe('estimator');
  });
});

describe('entitlement - buildEntitlementSnapshot', () => {
  it('free tier blocks estimator and projects', () => {
    const snap = buildEntitlementSnapshot({
      subscription: null,
      activeProjectCount: 0,
      memberCount: 1,
      hasEstimations: false,
    });
    expect(snap.tier).toBe('free');
    expect(snap.canAccessEstimator).toBe(false);
    expect(snap.canCreateProject).toBe(false);
    expect(snap.canAccessFinance).toBe(false);
  });

  it('grandfather org with estimations to estimator tier', () => {
    const snap = buildEntitlementSnapshot({
      subscription: null,
      activeProjectCount: 0,
      memberCount: 1,
      hasEstimations: true,
    });
    expect(snap.tier).toBe('estimator');
    expect(snap.canAccessEstimator).toBe(true);
    expect(snap.maxActiveProjects).toBe(1);
    expect(snap.canCreateProject).toBe(true);
  });

  it('estimator tier blocks project when slot full', () => {
    const snap = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'starter',
      activeProjectCount: 1,
      memberCount: 1,
    });
    expect(snap.canCreateProject).toBe(false);
    expect(snap.remainingProjectSlots).toBe(0);
  });

  it('pro tier unlocks finance', () => {
    const snap = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'pro',
      activeProjectCount: 2,
      memberCount: 3,
    });
    expect(snap.canAccessFinance).toBe(true);
    expect(snap.maxActiveProjects).toBe(10);
    expect(snap.canCreateProject).toBe(true);
  });
});

describe('entitlement - isActiveProjectStatus', () => {
  it('counts planning, active, on_hold as active slots', () => {
    expect(isActiveProjectStatus('planning')).toBe(true);
    expect(isActiveProjectStatus('active')).toBe(true);
    expect(isActiveProjectStatus('completed')).toBe(false);
    expect(isActiveProjectStatus('archived')).toBe(false);
  });
});
