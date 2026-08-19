import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRICELIST_TEMPLATES, getPricelistTemplate, templateItemsToCsvRows } from '../services/pricelistTemplateService';
import {
  isEstimatorOnboardingCompleted,
  resetEstimatorOnboarding,
  setEstimatorOnboardingCompleted,
} from './estimatorOnboarding';

describe('pricelist templates - catalog', () => {
  it('exposes four starter templates with expected counts', () => {
    expect(PRICELIST_TEMPLATES).toHaveLength(4);
    expect(getPricelistTemplate('kitchen-set')?.itemCount).toBe(22);
    expect(getPricelistTemplate('renovasi-rumah')?.itemCount).toBe(30);
    expect(getPricelistTemplate('interior-furniture')?.itemCount).toBe(25);
    expect(getPricelistTemplate('konstruksi-ringan')?.itemCount).toBe(35);
  });

  it('maps template rows to importable CSV rows', () => {
    const template = getPricelistTemplate('kitchen-set');
    expect(template).toBeTruthy();
    const rows = templateItemsToCsvRows(template!);
    expect(rows).toHaveLength(22);
    expect(rows[0].selling_price).toBeGreaterThan(rows[0].base_cost);
  });
});

describe('estimator onboarding - local flag', () => {
  const userId = 'test-user-phase4';
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    });
  });

  it('tracks completion per user in localStorage', () => {
    resetEstimatorOnboarding(userId);
    expect(isEstimatorOnboardingCompleted(userId)).toBe(false);
    setEstimatorOnboardingCompleted(userId, true);
    expect(isEstimatorOnboardingCompleted(userId)).toBe(true);
    resetEstimatorOnboarding(userId);
    expect(isEstimatorOnboardingCompleted(userId)).toBe(false);
  });
});
