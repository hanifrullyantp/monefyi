import { describe, it, expect } from 'vitest';
import { groupRapItemsByKeyword } from './rapItemGrouping';
import type { MappedRapItem } from './migration/planner-mapper';

function item(name: string): MappedRapItem {
  return {
    name,
    plannerId: name,
    unit: 'unit',
    unitPrice: 1000,
    qtyPlan: 1,
    qtyActual: 0,
    total: 1000,
    rapTotal: 1000,
    vendor: '',
    status: 'pending',
    checked: false,
  };
}

describe('groupRapItemsByKeyword', () => {
  it('groups ACP items under ACP label', () => {
    const groups = groupRapItemsByKeyword([
      item('ACP asphalt'),
      item('ACP putih'),
      item('Engsel sendok'),
    ]);
    const acp = groups.find(g => g.label === 'ACP');
    expect(acp?.items).toHaveLength(2);
    expect(groups.some(g => g.label === '' && g.items[0].name === 'Engsel sendok')).toBe(true);
  });

  it('groups hollow galvanis by two-word prefix', () => {
    const groups = groupRapItemsByKeyword([
      item('Hollow galvanis 1530'),
      item('Hollow galvanis 2020'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Hollow Galvanis');
    expect(groups[0].items).toHaveLength(2);
  });
});
