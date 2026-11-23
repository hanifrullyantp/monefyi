import { describe, expect, it } from 'vitest';
import {
  buildDefaultProjectInputFromEstimation,
  defaultSelectedEstimationItemIds,
  mapEstimationCategoryToRapType,
  needsConvertWarning,
} from './estimationConvert';

describe('estimationConvert - category mapping', () => {
  it('maps estimator categories to RAP types', () => {
    expect(mapEstimationCategoryToRapType('material')).toBe('material');
    expect(mapEstimationCategoryToRapType('upah')).toBe('labor');
    expect(mapEstimationCategoryToRapType('borongan')).toBe('labor');
    expect(mapEstimationCategoryToRapType('alat')).toBe('equipment');
    expect(mapEstimationCategoryToRapType('jasa')).toBe('other');
  });
});

describe('estimationConvert - default selections', () => {
  it('selects included non-bonus items by default', () => {
    const ids = defaultSelectedEstimationItemIds([
      { id: 'a', name: 'A', included: true, is_bonus: false },
      { id: 'b', name: 'B', included: false, is_bonus: false },
      { id: 'c', name: 'Bonus', included: true, is_bonus: true },
    ]);
    expect(ids).toEqual(['a']);
  });
});

describe('estimationConvert - project defaults', () => {
  it('prefills project input from estimation', () => {
    const input = buildDefaultProjectInputFromEstimation({
      title: 'Renovasi Dapur',
      customer_name: 'Rudi',
      customer_phone: '0812',
      customer_address: 'Jakarta',
      notes: 'Catatan',
    });
    expect(input.name).toBe('Renovasi Dapur');
    expect(input.clientName).toBe('Rudi');
    expect(input.description).toBe('Catatan');
  });
});

describe('estimationConvert - convert warning', () => {
  it('warns for non-closing statuses', () => {
    expect(needsConvertWarning('wa')).toBe(true);
    expect(needsConvertWarning('draft')).toBe(true);
    expect(needsConvertWarning('closing')).toBe(false);
    expect(needsConvertWarning('accepted')).toBe(false);
    expect(needsConvertWarning('converted')).toBe(false);
  });
});
