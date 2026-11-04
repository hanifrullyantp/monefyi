import { describe, expect, it } from 'vitest';
import {
  estimationItemDisplayName,
  stripDuplicateNameSuffix,
  uniquifyItemName,
} from './estimatorItemDisplayName';
import type { EstimationItemDraft } from '../types/estimator';

describe('estimationItemDisplayName - strip product group suffix', () => {
  it('returns name before em dash product', () => {
    expect(estimationItemDisplayName({ name: 'Kanopi 1,2 — Kanopi' })).toBe('Kanopi 1,2');
  });
});

describe('uniquifyItemName - duplicate names', () => {
  const base = (name: string): EstimationItemDraft => ({
    name,
    category: 'material',
    unit: 'm2',
    qty: 1,
    hpp_per_unit: 0,
    margin_pct: 20,
    selling_price_per_unit: 100,
    item_discount_pct: 0,
    item_discount_amount: 0,
    is_bonus: false,
    included: true,
    total_hpp: 0,
    total_selling: 100,
    total_profit: 0,
    sort_order: 0,
    notes: '',
  });

  it('keeps first name unchanged', () => {
    expect(uniquifyItemName([], 'backsplash')).toBe('backsplash');
  });

  it('adds (2) for second same name', () => {
    expect(uniquifyItemName([base('backsplash')], 'backsplash')).toBe('backsplash (2)');
  });

  it('adds (3) when two already exist', () => {
    expect(
      uniquifyItemName([base('backsplash'), base('backsplash (2)')], 'backsplash'),
    ).toBe('backsplash (3)');
  });
});

describe('stripDuplicateNameSuffix', () => {
  it('removes numeric suffix', () => {
    expect(stripDuplicateNameSuffix('backsplash (2)')).toBe('backsplash');
  });
});
