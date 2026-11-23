import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  createWorkItem,
  deleteWorkItem,
  duplicateWorkItem,
  isExtendedColumnsSupported,
  isWorkItemConflictError,
  loadDemoWorkItems,
  loadWorkItems,
  loadWorkItemsForOrg,
  resetWorkItemColumnSupportCache,
  saveDemoWorkItems,
  updateProjectProgressFromWorkItems,
  updateWorkItem,
  updateWorkItemExtendedMeta,
  WorkItemConflictError,
  type WorkItem,
} from './workItemService';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const WORK_ITEM_ID = '33333333-3333-4333-8333-333333333333';
const MEMBER_ID = '44444444-4444-4444-8444-444444444444';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
}

describe('workItemService Phase 3 (fallback, concurrency, duplicate, demo guard)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    resetWorkItemColumnSupportCache(true);
    mockFrom.mockReset();
  });

  it('skips remote Supabase calls when IDs fail isDemoOrInvalidUuid', async () => {
    expect(await loadWorkItems('demo-proj-1')).toEqual([]);
    expect(await loadWorkItems('not-a-uuid')).toEqual([]);
    expect(await loadWorkItemsForOrg('demo-org-embed')).toEqual([]);
    expect(await updateProjectProgressFromWorkItems('demo-proj-1')).toBe(0);
    await deleteWorkItem('demo-wi-1');

    const createdDemo = await createWorkItem({
      project_id: 'demo-proj-1',
      name: 'Demo Task',
      planned_start: '2026-11-01',
      planned_end: '2026-11-05',
      priority: 'critical',
      assigned_member_id: MEMBER_ID,
    });
    expect(createdDemo.id).toMatch(/^demo-wi-/);
    expect(createdDemo.priority).toBe('critical');

    const updatedDemo = await updateWorkItem('demo-wi-1', {
      project_id: 'demo-proj-1',
      name: 'Updated Demo',
      priority: 'high',
    });
    expect(updatedDemo.id).toBe('demo-wi-1');
    expect(updatedDemo.updated_at).toBeTruthy();

    const meta = await updateWorkItemExtendedMeta('demo-proj-1', 'demo-wi-99', {
      priority: 'low',
      notes: [{ id: 'n1', text: 'Catatan lokal', createdAt: '2026-11-16T00:00:00Z' }],
    });
    expect(meta.priority).toBe('low');
    expect(JSON.parse(localStorage.getItem('monefyi_work_item_meta_v1:demo-proj-1') || '{}')['demo-wi-99'].notes).toHaveLength(1);

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back cleanly on PGRST204/42703 missing column errors and hydrates DB > settings > localStorage', async () => {
    const insertPayloads: Record<string, unknown>[] = [];
    let projectSettings: Record<string, unknown> = {};

    mockFrom.mockImplementation((table: string) => {
      if (table === 'planner_work_items') {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            return {
              select: () => ({
                single: async () => {
                  if ('priority' in payload || 'assigned_member_id' in payload) {
                    return {
                      data: null,
                      error: {
                        code: 'PGRST204',
                        message: "Could not find the 'priority' column of 'planner_work_items' in the schema cache",
                      },
                    };
                  }
                  return {
                    data: {
                      id: WORK_ITEM_ID,
                      project_id: PROJECT_ID,
                      name: payload.name,
                      planned_start: payload.planned_start,
                      planned_end: payload.planned_end,
                      created_at: '2026-11-16T00:00:00Z',
                      updated_at: '2026-11-16T00:00:00Z',
                    },
                    error: null,
                  };
                },
              }),
            };
          },
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    id: WORK_ITEM_ID,
                    project_id: PROJECT_ID,
                    name: 'Pondasi',
                    planned_start: '2026-11-01',
                    planned_end: '2026-11-04',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'planner_projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { settings: projectSettings },
                error: null,
              }),
            }),
          }),
          update: (payload: { settings: Record<string, unknown> }) => ({
            eq: async () => {
              projectSettings = payload.settings;
              return { error: null };
            },
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const created = await createWorkItem({
      project_id: PROJECT_ID,
      name: 'Pondasi',
      planned_start: '2026-11-01',
      planned_end: '2026-11-04',
      priority: 'critical',
      assigned_member_id: MEMBER_ID,
      notes: [{ id: 'n1', text: 'Cek besi', createdAt: '2026-11-16T00:00:00Z' }],
      attachments: [{ id: 'a1', name: 'RAB.pdf', url: 'https://froyek.com/rab.pdf', addedAt: '2026-11-16T00:00:00Z' }],
    });

    expect(isExtendedColumnsSupported()).toBe(false);
    expect(insertPayloads).toHaveLength(2);
    expect(insertPayloads[0]).toHaveProperty('priority', 'critical');
    expect(insertPayloads[1]).not.toHaveProperty('priority');
    expect(insertPayloads[1]).not.toHaveProperty('assigned_member_id');
    expect(insertPayloads[1]).not.toHaveProperty('notes');
    expect(insertPayloads[1]).not.toHaveProperty('attachments');

    expect(created.priority).toBe('critical');
    expect(created.assigned_member_id).toBe(MEMBER_ID);

    // Verify localStorage + project settings meta persisted
    const localStored = JSON.parse(localStorage.getItem(`monefyi_work_item_meta_v1:${PROJECT_ID}`) || '{}');
    expect(localStored[WORK_ITEM_ID].priority).toBe('critical');
    expect((projectSettings.work_item_meta as Record<string, Record<string, unknown>>)[WORK_ITEM_ID].priority).toBe('critical');

    // Test precedence: settings overrides localStorage for priority, localStorage supplies missing note
    localStorage.setItem(
      `monefyi_work_item_meta_v1:${PROJECT_ID}`,
      JSON.stringify({
        [WORK_ITEM_ID]: {
          priority: 'low',
          notes: [{ id: 'n2', text: 'Local only note', createdAt: '2026-11-16T01:00:00Z' }],
        },
      }),
    );
    projectSettings = {
      work_item_meta: {
        [WORK_ITEM_ID]: {
          priority: 'high',
          assigned_member_id: MEMBER_ID,
        },
      },
    };

    const loaded = await loadWorkItems(PROJECT_ID);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].priority).toBe('high'); // settings > localStorage
    expect(loaded[0].assigned_member_id).toBe(MEMBER_ID);
    expect(loaded[0].notes?.[0].text).toBe('Local only note'); // fallback from localStorage
  });

  it('catches Worker RLS failure on planner_projects while still persisting localStorage and returning fallback server updated_at in updateWorkItemExtendedMeta', async () => {
    let updateCallCount = 0;
    const selectCols: string[] = [];
    const serverTouchedAt = '2026-11-16T02:05:11.654321+00:00';
    mockFrom.mockImplementation((table: string) => {
      if (table === 'planner_work_items') {
        return {
          update: () => ({
            eq: () => ({
              select: (cols: string) => {
                selectCols.push(cols);
                return {
                  maybeSingle: async () => {
                    updateCallCount += 1;
                    if (updateCallCount === 1) {
                      return {
                        data: null,
                        error: { code: '42703', message: 'column "notes" does not exist' },
                      };
                    }
                    return {
                      data: { updated_at: serverTouchedAt },
                      error: null,
                    };
                  },
                };
              },
            }),
          }),
        };
      }
      if (table === 'planner_projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { settings: {} }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: { code: '42501', message: 'row-level security policy violation' } }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await updateWorkItemExtendedMeta(PROJECT_ID, WORK_ITEM_ID, {
      notes: [{ id: 'n1', text: 'Progres lapangan', createdAt: '2026-11-16T02:00:00Z' }],
    });

    expect(isExtendedColumnsSupported()).toBe(false);
    expect(selectCols).toEqual(['updated_at', 'updated_at']);
    expect(result.notes?.[0].text).toBe('Progres lapangan');
    expect(result.updated_at).toBe(serverTouchedAt);
    const localStored = JSON.parse(localStorage.getItem(`monefyi_work_item_meta_v1:${PROJECT_ID}`) || '{}');
    expect(localStored[WORK_ITEM_ID].notes[0].text).toBe('Progres lapangan');
  });

  it('returns Postgres server updated_at from primary updateWorkItemExtendedMeta path (no false conflict)', async () => {
    const serverUpdatedAt = '2026-11-16T09:15:30.123456+00:00';
    let requestedSelect = '';

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'planner_work_items') throw new Error(`Unexpected table: ${table}`);
      return {
        update: () => ({
          eq: () => ({
            select: (cols: string) => {
              requestedSelect = cols;
              return {
                maybeSingle: async () => ({
                  data: { updated_at: serverUpdatedAt },
                  error: null,
                }),
              };
            },
          }),
        }),
      };
    });

    const result = await updateWorkItemExtendedMeta(PROJECT_ID, WORK_ITEM_ID, {
      priority: 'high',
      assigned_member_id: MEMBER_ID,
    });

    expect(requestedSelect).toBe('updated_at');
    expect(result.priority).toBe('high');
    expect(result.assigned_member_id).toBe(MEMBER_ID);
    expect(result.updated_at).toBe(serverUpdatedAt);
  });

  it('always updates updated_at and throws WorkItemConflictError when expectedUpdatedAt is stale', async () => {
    const capturedUpdatePayloads: Record<string, unknown>[] = [];
    const capturedFilters: Array<[string, unknown]> = [];
    let dbUpdatedAt = '2026-11-16T05:00:00.000Z';
    let rowExists = true;

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'planner_work_items') throw new Error(`Unexpected table: ${table}`);
      return {
        update: (payload: Record<string, unknown>) => {
          capturedUpdatePayloads.push(payload);
          const filters: Array<[string, unknown]> = [];
          const builder = {
            eq: (col: string, val: unknown) => {
              filters.push([col, val]);
              capturedFilters.push([col, val]);
              return builder;
            },
            select: () => ({
              maybeSingle: async () => {
                const expectedFilter = filters.find(([c]) => c === 'updated_at');
                if (expectedFilter && expectedFilter[1] !== dbUpdatedAt) {
                  return { data: null, error: null };
                }
                return {
                  data: {
                    id: WORK_ITEM_ID,
                    project_id: PROJECT_ID,
                    name: payload.name || 'Task',
                    planned_start: '2026-11-01',
                    planned_end: '2026-11-05',
                    updated_at: payload.updated_at,
                  },
                  error: null,
                };
              },
              single: async () => ({
                data: {
                  id: WORK_ITEM_ID,
                  project_id: PROJECT_ID,
                  name: payload.name || 'Task',
                  planned_start: '2026-11-01',
                  planned_end: '2026-11-05',
                  updated_at: payload.updated_at,
                },
                error: null,
              }),
            }),
          };
          return builder;
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: rowExists
                ? {
                    id: WORK_ITEM_ID,
                    project_id: PROJECT_ID,
                    name: 'Server Newer Version',
                    planned_start: '2026-11-01',
                    planned_end: '2026-11-06',
                    updated_at: dbUpdatedAt,
                  }
                : null,
              error: null,
            }),
          }),
        }),
      };
    });

    // Matching expectedUpdatedAt succeeds and sends updated_at
    const ok = await updateWorkItem(
      WORK_ITEM_ID,
      { name: 'Edited V1' },
      { expectedUpdatedAt: '2026-11-16T05:00:00.000Z' },
    );
    expect(ok.name).toBe('Edited V1');
    expect(typeof capturedUpdatePayloads[0].updated_at).toBe('string');
    expect(capturedFilters).toContainEqual(['updated_at', '2026-11-16T05:00:00.000Z']);

    // Stale expectedUpdatedAt throws WorkItemConflictError
    dbUpdatedAt = '2026-11-16T06:00:00.000Z';
    let caught: unknown;
    try {
      await updateWorkItem(
        WORK_ITEM_ID,
        { name: 'Stale Edit' },
        { expectedUpdatedAt: '2026-11-16T05:00:00.000Z' },
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(WorkItemConflictError);
    expect(isWorkItemConflictError(caught)).toBe(true);
    if (isWorkItemConflictError(caught)) {
      expect(caught.workItemId).toBe(WORK_ITEM_ID);
      expect(caught.expectedUpdatedAt).toBe('2026-11-16T05:00:00.000Z');
      expect(caught.serverUpdatedAt).toBe('2026-11-16T06:00:00.000Z');
      expect(caught.serverWorkItem?.name).toBe('Server Newer Version');
    }

    // Deleted row throws standard Error, not WorkItemConflictError
    rowExists = false;
    await expect(
      updateWorkItem(
        WORK_ITEM_ID,
        { name: 'Deleted Edit' },
        { expectedUpdatedAt: '2026-11-16T05:00:00.000Z' },
      ),
    ).rejects.toThrow('tidak ditemukan');
  });

  it('duplicates work item from object or UUID string and supports overrides (F-13)', async () => {
    const inserted: Record<string, unknown>[] = [];
    const sourceRow: WorkItem = {
      id: WORK_ITEM_ID,
      project_id: PROJECT_ID,
      parent_id: null,
      name: 'Pemasangan Atap',
      description: 'Baja ringan',
      planned_start: '2026-11-10',
      planned_end: '2026-11-15',
      progress_pct: 80,
      status: 'in_progress',
      sort_order: 2,
      dependencies: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      dependency_type: 'FS',
      assigned_member_id: MEMBER_ID,
      priority: 'high',
    };

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'planner_work_items') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: sourceRow, error: null }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          inserted.push(payload);
          return {
            select: () => ({
              single: async () => ({
                data: {
                  ...payload,
                  id: '55555555-5555-4555-8555-555555555555',
                  created_at: '2026-11-16T00:00:00Z',
                  updated_at: '2026-11-16T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        },
      };
    });

    const dupById = await duplicateWorkItem(WORK_ITEM_ID);
    expect(dupById.name).toBe('Pemasangan Atap (Salinan)');
    expect(dupById.progress_pct).toBe(0);
    expect(dupById.status).toBe('pending');
    expect(dupById.sort_order).toBe(3);
    expect(dupById.priority).toBe('high');
    expect(dupById.assigned_member_id).toBe(MEMBER_ID);
    expect(dupById.dependencies).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);

    const dupByObj = await duplicateWorkItem(sourceRow, {
      name: 'Atap Tahap 2',
      priority: 'critical',
    });
    expect(dupByObj.name).toBe('Atap Tahap 2');
    expect(dupByObj.priority).toBe('critical');
    expect(inserted).toHaveLength(2);
  });

  it('hydrates loadWorkItemsForOrg using project settings and localStorage without extra project queries', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'planner_projects') {
        return {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: PROJECT_ID,
                  settings: {
                    work_item_meta: {
                      [WORK_ITEM_ID]: {
                        priority: 'critical',
                      },
                    },
                  },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'planner_work_items') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: [
                  {
                    id: WORK_ITEM_ID,
                    project_id: PROJECT_ID,
                    name: 'Kerja Lapangan',
                    planned_start: '2026-11-01',
                    planned_end: '2026-11-05',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    localStorage.setItem(
      `monefyi_work_item_meta_v1:${PROJECT_ID}`,
      JSON.stringify({
        [WORK_ITEM_ID]: {
          priority: 'low',
          assigned_member_id: MEMBER_ID,
        },
      }),
    );

    const orgItems = await loadWorkItemsForOrg(ORG_ID);
    expect(orgItems).toHaveLength(1);
    expect(orgItems[0].priority).toBe('critical'); // settings > localStorage
    expect(orgItems[0].assigned_member_id).toBe(MEMBER_ID); // from localStorage
  });

  it('persists and syncs demo work items via loadDemoWorkItems/saveDemoWorkItems and CRUD without Supabase', async () => {
    const demoProjectId = 'demo-proj-persist';
    expect(loadDemoWorkItems(demoProjectId)).toEqual([]);

    const created = await createWorkItem({
      project_id: demoProjectId,
      name: 'Cor Kolom Lantai 1',
      planned_start: '2026-11-01',
      planned_end: '2026-11-10',
      progress_pct: 20,
      priority: 'high',
      assigned_member_id: 'demo-m-1',
    });

    expect(loadDemoWorkItems(demoProjectId)).toHaveLength(1);
    expect(await loadWorkItems(demoProjectId)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(`monefyi_demo_work_items_v1:${demoProjectId}`) || '[]')).toHaveLength(1);

    const updated = await updateWorkItem(created.id, {
      progress_pct: 65,
      status: 'in_progress',
    });
    expect(updated.progress_pct).toBe(65);
    expect(loadDemoWorkItems(demoProjectId)[0].progress_pct).toBe(65);

    const metaRes = await updateWorkItemExtendedMeta(demoProjectId, created.id, {
      priority: 'critical',
      assigned_member_id: 'demo-m-2',
    });
    expect(metaRes.priority).toBe('critical');
    expect(metaRes.updated_at).toBeTruthy();
    expect(loadDemoWorkItems(demoProjectId)[0].priority).toBe('critical');
    expect(loadDemoWorkItems(demoProjectId)[0].assigned_member_id).toBe('demo-m-2');

    const duplicated = await duplicateWorkItem(loadDemoWorkItems(demoProjectId)[0]);
    expect(duplicated.name).toBe('Cor Kolom Lantai 1 (Salinan)');
    expect(loadDemoWorkItems(demoProjectId)).toHaveLength(2);

    await deleteWorkItem(created.id);
    const remaining = loadDemoWorkItems(demoProjectId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(duplicated.id);

    saveDemoWorkItems(demoProjectId, []);
    expect(loadDemoWorkItems(demoProjectId)).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();

    vi.stubGlobal('localStorage', undefined);
    expect(loadDemoWorkItems(demoProjectId)).toEqual([]);
    expect(() => saveDemoWorkItems(demoProjectId, [duplicated])).not.toThrow();
  });
});
