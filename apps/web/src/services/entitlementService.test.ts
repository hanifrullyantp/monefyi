import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsPlatformAdmin = vi.fn(async () => false);
const mockFrom = vi.fn();

vi.mock('./adminService', () => ({
  currentSessionIsPlatformAdmin: () => mockIsPlatformAdmin(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import { assertCanCreateProjectByEntitlement } from './entitlementService';

function setupSupabaseMock(opts: {
  subscription: Record<string, unknown> | null;
  projectStatuses?: string[];
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'planner_org_subscriptions') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.subscription, error: null }),
          }),
        }),
      };
    }
    if (table === 'planner_projects') {
      return {
        select: () => ({
          eq: () => ({
            is: async () => ({
              data: (opts.projectStatuses ?? []).map(status => ({ status })),
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'planner_org_members') {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ count: 1, error: null }),
          }),
        }),
      };
    }
    if (table === 'planner_estimations') {
      return {
        select: () => ({
          eq: async () => ({ count: 0, error: null }),
        }),
      };
    }
    if (table === 'planner_organizations') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe('entitlementService - assertCanCreateProjectByEntitlement (Decision #4 F-04)', () => {
  beforeEach(() => {
    mockIsPlatformAdmin.mockReset();
    mockIsPlatformAdmin.mockResolvedValue(false);
    mockFrom.mockReset();
  });

  it('keeps Free Plan blocked and uses Froyek Pro copy without mentioning Beli Estimator', async () => {
    setupSupabaseMock({ subscription: null, projectStatuses: [] });

    await expect(assertCanCreateProjectByEntitlement('org-1', 'free')).rejects.toThrow(
      'Paket Froyek Anda saat ini belum mencakup pembuatan proyek baru. Upgrade ke Froyek Pro untuk membuat proyek.',
    );
    await expect(assertCanCreateProjectByEntitlement('org-1', 'free')).rejects.not.toThrow(/Beli Estimator|Planner Pro/);
  });

  it('uses Froyek Pro copy when paid tier active project quota is full', async () => {
    setupSupabaseMock({
      subscription: {
        id: 'sub-1',
        org_id: 'org-1',
        tier: 'estimator',
        max_active_projects: 1,
        max_members: 1,
      },
      projectStatuses: ['active'],
    });

    await expect(assertCanCreateProjectByEntitlement('org-1')).rejects.toThrow(
      'Kuota proyek aktif tercapai (1/1). Upgrade ke Froyek Pro untuk lebih banyak proyek.',
    );
    await expect(assertCanCreateProjectByEntitlement('org-1')).rejects.not.toThrow(/Planner Pro/);
  });

  it('allows project creation when Pro quota still has slots', async () => {
    setupSupabaseMock({
      subscription: null,
      projectStatuses: ['active'],
    });

    const snap = await assertCanCreateProjectByEntitlement('org-1', 'pro');
    expect(snap.canCreateProject).toBe(true);
    expect(snap.maxActiveProjects).toBe(10);
  });
});
