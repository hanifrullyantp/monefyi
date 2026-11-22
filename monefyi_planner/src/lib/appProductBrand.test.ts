import { describe, expect, it } from 'vitest';
import { buildEntitlementSnapshot, buildPreviewEntitlement } from './entitlement';
import { hasEstimatorLicenseAccess, shouldShowEstimatorProductBrand } from './appProductBrand';

describe('appProductBrand - shouldShowEstimatorProductBrand', () => {
  it('hides Estimator brand for free plan without Estimator license', () => {
    const free = buildPreviewEntitlement('free', 0, 1);
    expect(shouldShowEstimatorProductBrand(free)).toBe(false);
    expect(
      shouldShowEstimatorProductBrand({
        isFree: true,
        isEstimator: false,
        isPro: false,
        isEnterprise: false,
      }),
    ).toBe(false);
  });

  it('shows Estimator brand only for Estimator tier (non-Pro/Enterprise)', () => {
    const est = buildPreviewEntitlement('estimator_basic', 0, 1);
    expect(shouldShowEstimatorProductBrand(est)).toBe(true);

    const estPro = buildPreviewEntitlement('estimator_pro', 0, 1);
    expect(shouldShowEstimatorProductBrand(estPro)).toBe(true);

    expect(
      shouldShowEstimatorProductBrand({
        isFree: false,
        isEstimator: true,
        isPro: false,
        isEnterprise: false,
      }),
    ).toBe(true);
  });

  it('shows Froyek chrome when Pro or Enterprise is active (even if isEstimator is true)', () => {
    const pro = buildPreviewEntitlement('planner_pro', 0, 1);
    expect(shouldShowEstimatorProductBrand(pro)).toBe(false);

    expect(
      shouldShowEstimatorProductBrand({
        isFree: false,
        isEstimator: true,
        isPro: true,
        isEnterprise: false,
      }),
    ).toBe(false);

    const ent = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'enterprise',
      activeProjectCount: 0,
      memberCount: 1,
    });
    expect(shouldShowEstimatorProductBrand(ent)).toBe(false);
  });
});

describe('appProductBrand - hasEstimatorLicenseAccess', () => {
  it('denies Free Plan without Estimator license unless adminFullAccess is true', () => {
    const free = buildPreviewEntitlement('free', 0, 1);
    expect(hasEstimatorLicenseAccess(free)).toBe(false);
    expect(hasEstimatorLicenseAccess(free, true)).toBe(true);
  });

  it('allows Estimator, Pro, and Enterprise plans', () => {
    expect(hasEstimatorLicenseAccess(buildPreviewEntitlement('estimator_basic', 0, 1))).toBe(true);
    expect(hasEstimatorLicenseAccess(buildPreviewEntitlement('estimator_pro', 0, 1))).toBe(true);
    expect(hasEstimatorLicenseAccess(buildPreviewEntitlement('planner_pro', 0, 1))).toBe(true);
    expect(hasEstimatorLicenseAccess(buildPreviewEntitlement('enterprise', 0, 1))).toBe(true);
  });
});
