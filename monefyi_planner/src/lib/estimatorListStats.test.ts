import { describe, expect, it } from 'vitest';
import { getEstimationListStats } from './estimatorListStats';
import type { Estimation } from '../types/estimator';

function row(status: Estimation['status'], id = '1'): Estimation {
  return {
    id,
    tenant_id: 't1',
    code: `EST-2026-${id}`,
    title: 'Test',
    status,
    customer_name: 'Klien',
    total_selling_price: 0,
    total_profit: 0,
    updated_at: new Date().toISOString(),
  } as Estimation;
}

describe('getEstimationListStats - pipeline counts - returns totals', () => {
  it('counts active offers from survei bucket', () => {
    const stats = getEstimationListStats([
      row('wa', '1'),
      row('survei', '2'),
      row('penawaran', '3'),
      row('closing', '4'),
      row('rejected', '5'),
      row('converted', '6'),
    ]);

    expect(stats.total).toBe(6);
    expect(stats.activeOffers).toBe(2);
    expect(stats.archiveCount).toBe(2);
  });
});
