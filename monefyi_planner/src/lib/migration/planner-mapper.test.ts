import { describe, expect, it } from 'vitest';
import { mapPlannerProject } from './planner-mapper';

describe('planner-mapper', () => {
  it('maps qtyActual from cost realizations per RAP line', () => {
    const projectId = 'test-project-id';
    const rapId = 'rap-holo-id';

    const mapped = mapPlannerProject({
      project: {
        id: projectId,
        org_id: 'org-1',
        name: 'Kitchen Set Kota Baru',
        client_name: 'Klien',
        planned_start: '2026-01-01',
        planned_end: '2026-06-01',
        status: 'active',
        progress_pct: 10,
        total_budget: 29_691_500,
        total_spent: 810_000,
        total_received: 9_700_000,
        settings: { type: 'Interior' },
      },
      rapItems: [
        {
          id: rapId,
          project_id: projectId,
          type: 'material',
          name: 'Holo galvanis 1530 0,8 Sinar Raya',
          unit: 'btg',
          quantity: 15,
          unit_price: 54_000,
          supplier: 'Sinar Raya',
        },
      ],
      costs: [
        {
          id: 'cost-1',
          project_id: projectId,
          rap_item_id: rapId,
          date: '2026-03-01',
          description: 'Realisasi: Holo galvanis',
          quantity: 15,
          unit_price: 54_000,
          total_amount: 810_000,
        },
      ],
      incomes: [],
      workItems: [],
    });

    const holo = mapped.rap.materials[0];
    expect(holo.qtyActual).toBe(15);
    expect(holo.total).toBe(810_000);
    expect(holo.qtyPlan).toBe(15);
  });

  it('hutang list uses vendor names not cost descriptions', () => {
    const mapped = mapPlannerProject({
      project: {
        id: 'p2',
        org_id: 'org-1',
        name: 'Kitchen set Cece',
        client_name: 'INTERO',
        planned_start: '2026-01-01',
        planned_end: '2026-06-01',
        total_budget: 29_700_000,
        total_spent: 27_200_000,
        total_received: 20_000_000,
      },
      rapItems: [],
      costs: [
        { id: 'c1', project_id: 'p2', date: '2026-02-01', description: 'Import', total_amount: 5_000_000, supplier: null },
        { id: 'c2', project_id: 'p2', date: '2026-02-02', description: 'fischer 10 mm', total_amount: 1_000_000, supplier: null },
        { id: 'c3', project_id: 'p2', date: '2026-02-03', description: 'Holo galvanis', total_amount: 2_000_000, supplier: 'Sinar Raya' },
      ],
      incomes: [{ id: 'i1', project_id: 'p2', date: '2026-02-01', amount: 20_000_000, category: 'DP', description: 'DP pertama', status: 'received' }],
      workItems: [],
    });

    expect(mapped.saldo).toBe(-7_200_000);
    const hutang = mapped.hutangPiutang.filter(h => h.type === 'hutang');
    expect(hutang.some(h => h.name.includes('Import'))).toBe(false);
    expect(hutang.some(h => h.name.includes('fischer'))).toBe(false);
    expect(hutang.some(h => h.partyName === 'Sinar Raya')).toBe(true);
    const piutang = mapped.hutangPiutang.find(h => h.type === 'piutang');
    expect(piutang?.partyName).toBe('INTERO');
  });
});
