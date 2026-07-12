import { describe, expect, it } from 'vitest';
import { generateRapDraft, draftToCreatePayload } from './suggestion-engine';
import { DEFAULT_JOB_TEMPLATES } from './default-templates';
import type { RppMaterial } from '../../types/rpp';

const materials: RppMaterial[] = DEFAULT_JOB_TEMPLATES[0].materials.map((m, i) => ({
  id: i + 1,
  org_id: 'org-1',
  name: m.name,
  category: 'Interior',
  unit: m.unit,
  price: m.price,
  last_price: m.price,
  trend: null,
  stock: 0,
  used_in: 0,
  icon: 'package',
  vendor: '',
}));

describe('suggestion-engine', () => {
  it('Kitchen Set 3m generates materials with correct HPL qty', () => {
    const draft = generateRapDraft({
      selections: [{ templateId: 1, volume: 3 }],
      templates: DEFAULT_JOB_TEMPLATES,
      materials,
      projects: [],
    });

    expect(draft.materials.length).toBeGreaterThanOrEqual(5);
    expect(draft.materials[0].qtyPlan).toBeGreaterThan(0);

    const hpl = draft.materials.find(m => m.name.includes('HPL'));
    expect(hpl?.qtyPlan).toBe(15);
  });

  it('draftToCreatePayload includes timeline steps', () => {
    const draft = generateRapDraft({
      selections: [{ templateId: 1, volume: 3 }],
      templates: DEFAULT_JOB_TEMPLATES,
      materials,
    });
    const payload = draftToCreatePayload(draft, {
      name: 'Test Kitchen',
      client: 'Bp Test',
      startDate: '2026-07-01',
      endDate: '2026-09-01',
      contractValue: 13500000,
    });

    expect(payload.materials.length).toBeGreaterThan(0);
    expect(payload.timeline.length).toBeGreaterThanOrEqual(4);
  });
});
