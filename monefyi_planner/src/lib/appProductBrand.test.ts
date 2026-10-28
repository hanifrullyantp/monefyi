import { describe, expect, it } from 'vitest';
import { buildEntitlementSnapshot, buildPreviewEntitlement } from './entitlement';
import { shouldShowEstimatorProductBrand } from './appProductBrand';

describe('appProductBrand - shouldShowEstimatorProductBrand', () => {
  it('shows Estimator for free trial and Estimator tier', () => {
    const free = buildPreviewEntitlement('free', 0, 1);
    expect(shouldShowEstimatorProductBrand(free)).toBe(true);

    const est = buildPreviewEntitlement('estimator_basic', 0, 1);
    expect(shouldShowEstimatorProductBrand(est)).toBe(true);
  });

  it('shows Planner chrome for Pro and Enterprise', () => {
    const pro = buildPreviewEntitlement('planner_pro', 0, 1);
    expect(shouldShowEstimatorProductBrand(pro)).toBe(false);

    const ent = buildEntitlementSnapshot({
      subscription: null,
      orgPlan: 'enterprise',
      activeProjectCount: 0,
      memberCount: 1,
    });
    expect(shouldShowEstimatorProductBrand(ent)).toBe(false);
  });
});
