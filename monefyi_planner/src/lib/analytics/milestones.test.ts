import { describe, expect, it, vi } from 'vitest';
import { isMilestone5Shown, markMilestone5Shown, shouldShowMilestone5Upsell } from './milestones';

describe('milestones - shouldShowMilestone5Upsell', () => {
  it('shows only at exactly 5 estimations for estimator tier', () => {
    expect(shouldShowMilestone5Upsell({
      estimationCountLast30Days: 4,
      isEstimator: true,
      alreadyShown: false,
    })).toBe(false);

    expect(shouldShowMilestone5Upsell({
      estimationCountLast30Days: 5,
      isEstimator: true,
      alreadyShown: false,
    })).toBe(true);

    expect(shouldShowMilestone5Upsell({
      estimationCountLast30Days: 5,
      isEstimator: false,
      alreadyShown: false,
    })).toBe(false);
  });

  it('does not show when already shown', () => {
    expect(shouldShowMilestone5Upsell({
      estimationCountLast30Days: 5,
      isEstimator: true,
      alreadyShown: true,
    })).toBe(false);
  });
});

describe('milestones - localStorage flag', () => {
  it('marks milestone as shown', () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
    });

    expect(isMilestone5Shown()).toBe(false);
    markMilestone5Shown();
    expect(isMilestone5Shown()).toBe(true);
    vi.unstubAllGlobals();
  });
});
