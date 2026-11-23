import { describe, expect, it } from 'vitest';
import { groupPricelistByCategory, groupPricelistByProduct } from '../services/pricelistService';
import type { PricelistItem } from '../types/estimator';

function mockItem(overrides: Partial<PricelistItem>): PricelistItem {
  return {
    id: '1',
    org_id: 'org',
    name: 'Test',
    product: null,
    category: 'material',
    unit: 'pcs',
    base_cost: 0,
    default_margin_pct: 20,
    selling_price: 0,
    notes: null,
    is_active: true,
    created_by: 'u',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('groupPricelistByProduct', () => {
  it('groups items by kelompok kerja (product field)', () => {
    const items = [
      mockItem({ id: 'a', name: 'Kabinet Atas', product: 'Kitchen Set', category: 'borongan' }),
      mockItem({ id: 'b', name: 'Kanopi Baja', product: 'Kanopi', category: 'borongan' }),
      mockItem({ id: 'c', name: 'Kabinet Bawah', product: 'Kitchen Set', category: 'borongan' }),
    ];
    const groups = groupPricelistByProduct(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Kitchen Set');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].label).toBe('Kanopi');
    expect(groups[1].items).toHaveLength(1);
  });
});

describe('groupPricelistByCategory', () => {
  it('groups items by category and omits empty categories', () => {
    const items = [
      mockItem({ id: 'a', name: 'Bahan A', category: 'material' }),
      mockItem({ id: 'b', name: 'Tukang', category: 'upah' }),
      mockItem({ id: 'c', name: 'Bahan B', category: 'material' }),
    ];
    const groups = groupPricelistByCategory(items);
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.category === 'material')?.items).toHaveLength(2);
    expect(groups.find(g => g.category === 'upah')?.items).toHaveLength(1);
  });
});
