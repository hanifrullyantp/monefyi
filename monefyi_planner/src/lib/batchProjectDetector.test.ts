import { describe, it, expect } from 'vitest';
import { parseCostText } from './costParser';
import { detectAndSeparateProjects } from './batchProjectDetector';
import type { Project } from '../store/appStore';

const SAMPLE = `Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum utk mesin las workshop kerjaan aloevera (indra)
- 202.750 listrik workshop (Rully)

Sabtu, 6/6/2026
Duit keluar :
- 850.000 gaji Gustam : 510K kerjaan rangka cc, 340K kerjaan aloevera (Indra)`;

const projects: Project[] = [
  {
    id: 'p-paris',
    tenant_id: 'org-1',
    name: 'Paris 2 Cece',
    code: 'PRJ-001',
    client_name: 'Cece',
    location: '',
    description: '',
    type: 'construction',
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    total_budget: 0,
    total_spent: 0,
    total_received: 0,
    progress_pct: 0,
    health_status: 'on_track',
    finance_status: 'normal',
    created_at: '',
    updated_at: '',
  },
];

describe('detectAndSeparateProjects', () => {
  it('groups workshop lines as unknown requiring user input', () => {
    const lines = parseCostText(SAMPLE);
    const result = detectAndSeparateProjects(
      lines,
      { orgId: 'org-1', currentProjectId: 'p-paris' },
      projects,
      [],
    );

    expect(result.unknownProjects.some(u => u.mentionedName.includes('workshop'))).toBe(true);
    expect(result.requiresUserInput).toBe(true);
    expect(result.pendingItems.length).toBeGreaterThan(0);
  });

  it('never returns empty detection for parsed batch', () => {
    const lines = parseCostText(SAMPLE);
    const result = detectAndSeparateProjects(lines, {}, projects, []);
    expect(result.totalItems).toBe(lines.length);
    expect(result.totalAmount).toBeGreaterThan(0);
  });
});
