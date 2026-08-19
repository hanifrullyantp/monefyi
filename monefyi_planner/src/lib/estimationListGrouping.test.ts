import { describe, expect, it } from 'vitest';
import {
  deriveEstimationProductGroup,
  groupEstimationsForList,
} from './estimationListGrouping';
import type { Estimation } from '../types/estimator';

function mockEstimation(overrides: Partial<Estimation>): Estimation {
  return {
    id: '1',
    org_id: 'org',
    code: 'EST-1',
    title: 'Test',
    customer_name: null,
    customer_phone: null,
    customer_address: null,
    project_id: null,
    subtotal_hpp: 0,
    overhead_pct: 0,
    margin_pct: 0,
    discount_pct: 0,
    discount_amount: 0,
    adjustments: null,
    tax_pct: 0,
    total_selling_price: 0,
    total_profit: 0,
    image_1_url: null,
    image_1_caption: null,
    image_2_url: null,
    image_2_caption: null,
    image_3_url: null,
    image_3_caption: null,
    pdf_primary_color: null,
    pdf_secondary_color: null,
    pdf_template: null,
    notes: null,
    terms_conditions: null,
    validity_days: 14,
    status: 'wa',
    created_at: '',
    updated_at: '',
    created_by: null,
    converted_project_id: null,
    ...overrides,
  };
}

describe('estimationListGrouping', () => {
  it('derives kitchen set from title', () => {
    expect(deriveEstimationProductGroup('Kitchen Set Pak Budi')).toBe('Kitchen Set');
  });

  it('groups estimations by status', () => {
    const rows = [
      mockEstimation({ id: 'a', status: 'survei', title: 'A' }),
      mockEstimation({ id: 'b', status: 'wa', title: 'B' }),
    ];
    const groups = groupEstimationsForList(rows, 'status');
    expect(groups).toHaveLength(2);
    expect(groups[0].rows[0].status).toBe('wa');
  });
});
