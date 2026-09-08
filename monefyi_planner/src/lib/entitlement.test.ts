import { describe, expect, it } from 'vitest';
import {
  buildEntitlementSnapshot,
  buildFullAccessEntitlement,
  buildPreviewEntitlement,
  canAccessPlannerNavModule,
  canGenerateKwitansi,
  computeEstimatorProCheckoutAmount,
  ESTIMATOR_PRO_PRICE_IDR,
  ESTIMATOR_UPGRADE_DELTA_IDR,
  isActiveProjectStatus,
  isEstimatorProUpgrade,
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

describe('entitlement - canGenerateKwitansi', () => {
  it('allows Estimator Pro, Pro, and Enterprise', () => {
    const estimatorPro = buildEntitlementSnapshot({
      subscription: {
        id: 's1',
        org_id: 'o1',
        tier: 'estimator',
        payment_provider: null,
        external_payment_id: null,
        amount_paid: 199000,
        currency: 'IDR',
        purchased_at: null,
        activated_at: null,
        expires_at: null,
        estimator_credit_available: false,
        estimator_credit_used_at: null,
        estimator_credit_amount: 0,
        max_active_projects: 1,
        max_members: 1,
        metadata: null,
        estimator_variant: 'pro',
        created_at: '',
        updated_at: '',
      },
      activeProjectCount: 0,
      memberCount: 1,
    });
    const standard = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'starter',
      activeProjectCount: 0,
      memberCount: 1,
    });
    const pro = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'pro',
      activeProjectCount: 0,
      memberCount: 1,
    });

    expect(canGenerateKwitansi(estimatorPro)).toBe(true);
    expect(canGenerateKwitansi(pro)).toBe(true);
    expect(canGenerateKwitansi(standard)).toBe(false);
  });
});

describe('entitlement - estimator pro upgrade pricing', () => {
  const standardEstimator = buildEntitlementSnapshot({
    subscription: {
      id: 's1',
      org_id: 'o1',
      tier: 'estimator',
      payment_provider: null,
      external_payment_id: null,
      amount_paid: 99000,
      currency: 'IDR',
      purchased_at: null,
      activated_at: null,
      expires_at: null,
      estimator_credit_available: false,
      estimator_credit_used_at: null,
      estimator_credit_amount: 0,
      max_active_projects: 1,
      max_members: 1,
      metadata: null,
      estimator_variant: 'standard',
      created_at: '',
      updated_at: '',
    },
    activeProjectCount: 0,
    memberCount: 1,
  });

  it('charges delta for Basic → Pro upgrade', () => {
    expect(isEstimatorProUpgrade(standardEstimator)).toBe(true);
    expect(computeEstimatorProCheckoutAmount(standardEstimator)).toBe(ESTIMATOR_UPGRADE_DELTA_IDR);
  });

  it('charges full price for new Estimator Pro buyers', () => {
    const freeUser = buildEntitlementSnapshot({
      subscription: null,
      activeProjectCount: 0,
      memberCount: 1,
    });
    expect(isEstimatorProUpgrade(freeUser)).toBe(false);
    expect(computeEstimatorProCheckoutAmount(freeUser)).toBe(ESTIMATOR_PRO_PRICE_IDR);
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

describe('entitlement - buildFullAccessEntitlement', () => {
  it('unlocks estimator, finance, projects, and kwitansi', () => {
    const snap = buildFullAccessEntitlement(12, 3);
    expect(snap.tier).toBe('enterprise');
    expect(snap.canAccessEstimator).toBe(true);
    expect(snap.canAccessFinance).toBe(true);
    expect(snap.canCreateProject).toBe(true);
    expect(snap.canInviteMembers).toBe(true);
    expect(snap.isEstimatorPro).toBe(true);
    expect(isEstimatorProUpgrade(snap)).toBe(false);
    expect(canGenerateKwitansi(snap)).toBe(true);
    expect(snap.currentActiveProjects).toBe(12);
  });
});

describe('entitlement - buildPreviewEntitlement', () => {
  it('free blocks estimator and finance', () => {
    const snap = buildPreviewEntitlement('free', 0, 1);
    expect(snap.isFree).toBe(true);
    expect(snap.canAccessEstimator).toBe(false);
    expect(snap.canAccessFinance).toBe(false);
    expect(snap.canCreateProject).toBe(false);
  });

  it('estimator basic allows estimator without kwitansi pro', () => {
    const snap = buildPreviewEntitlement('estimator_basic', 0, 1);
    expect(snap.canAccessEstimator).toBe(true);
    expect(snap.canAccessFinance).toBe(false);
    expect(snap.isEstimatorPro).toBe(false);
    expect(canGenerateKwitansi(snap)).toBe(false);
  });

  it('estimator pro unlocks kwitansi', () => {
    const snap = buildPreviewEntitlement('estimator_pro', 0, 1);
    expect(snap.canAccessEstimator).toBe(true);
    expect(snap.isEstimatorPro).toBe(true);
    expect(canGenerateKwitansi(snap)).toBe(true);
  });

  it('planner pro unlocks finance', () => {
    const snap = buildPreviewEntitlement('planner_pro', 2, 1);
    expect(snap.canAccessFinance).toBe(true);
    expect(snap.isPro).toBe(true);
    expect(snap.maxActiveProjects).toBe(10);
  });
});

describe('entitlement - canAccessPlannerNavModule', () => {
  it('estimator basic/pro allows projects and estimator nav', () => {
    const basic = buildPreviewEntitlement('estimator_basic', 0, 1);
    expect(canAccessPlannerNavModule(basic, 'projects')).toBe(true);
    expect(canAccessPlannerNavModule(basic, 'estimator')).toBe(true);
    expect(canAccessPlannerNavModule(basic, 'home')).toBe(false);
    expect(canAccessPlannerNavModule(basic, 'database')).toBe(false);
    expect(canAccessPlannerNavModule(basic, 'finance')).toBe(false);
    expect(canAccessPlannerNavModule(basic, 'hr')).toBe(false);
  });

  it('planner pro allows dashboard and database', () => {
    const pro = buildPreviewEntitlement('planner_pro', 0, 1);
    expect(canAccessPlannerNavModule(pro, 'home')).toBe(true);
    expect(canAccessPlannerNavModule(pro, 'database')).toBe(true);
    expect(canAccessPlannerNavModule(pro, 'finance')).toBe(true);
  });

  it('free blocks estimator nav', () => {
    const free = buildPreviewEntitlement('free', 0, 1);
    expect(canAccessPlannerNavModule(free, 'estimator')).toBe(false);
    expect(canAccessPlannerNavModule(free, 'home')).toBe(true);
  });
});
