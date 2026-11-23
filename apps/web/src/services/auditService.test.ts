import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockStoreState: {
  isDemoMode: boolean;
  user: { id: string; name: string } | null;
  tenant: { id: string } | null;
} = {
  isDemoMode: false,
  user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Indra' },
  tenant: { id: '11111111-1111-4111-8111-111111111111' },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: () => mockStoreState,
  },
}));

import {
  clearLocalAuditLogs,
  exportAuditCsv,
  formatAuditActionLabel,
  formatAuditSummary,
  formatAuditTimestampId,
  getLocalAuditStorageKey,
  isAuditInsertSupported,
  listAuditLogs,
  logAudit,
  logProjectAudit,
  readLocalAuditLogs,
  rememberProjectOrg,
  resetAuditInsertSupportCache,
} from './auditService';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TARGET_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('auditService (F-30)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    resetAuditInsertSupportCache(true);
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockStoreState.isDemoMode = false;
    mockStoreState.user = { id: USER_ID, name: 'Indra' };
    mockStoreState.tenant = { id: ORG_ID };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('short-circuits Supabase writes in demo/non-UUID orgs and writes to local ring buffer', async () => {
    await logAudit({
      orgId: 'demo',
      actorId: 'demo-u-1',
      actorName: 'Indra Pratama',
      action: 'project.created',
      targetType: 'project',
      targetId: 'demo-p-1',
      metadata: { name: 'Renovasi Rumah' },
    });

    expect(mockFrom).not.toHaveBeenCalled();

    const local = readLocalAuditLogs('demo');
    expect(local).toHaveLength(1);
    expect(local[0].action).toBe('project.created');
    expect(local[0].metadata).toMatchObject({
      actor_name: 'Indra Pratama',
      target_type: 'project',
      target_id: 'demo-p-1',
      name: 'Renovasi Rumah',
    });

    const listed = await listAuditLogs('demo');
    expect(listed).toHaveLength(1);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('short-circuits Supabase writes when store isDemoMode is true even for UUID orgId', async () => {
    mockStoreState.isDemoMode = true;

    await logAudit({
      orgId: ORG_ID,
      action: 'cost.created',
      targetType: 'cost',
      targetId: 'cost-1',
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(readLocalAuditLogs(ORG_ID)).toHaveLength(1);
  });

  it('caps the local ring buffer per org at 50 entries keeping the newest first', async () => {
    vi.useFakeTimers();

    for (let i = 1; i <= 55; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 10, 21, 10, 0, i)));
      await logAudit({
        orgId: 'demo',
        action: 'project.updated',
        targetType: 'project',
        targetId: `proj-${i}`,
        metadata: { name: `Proyek ${i}` },
      });
    }

    const raw = localStorage.getItem(getLocalAuditStorageKey('demo'));
    expect(raw).toBeTruthy();
    const entries = readLocalAuditLogs('demo');
    expect(entries).toHaveLength(50);
    expect(entries[0].metadata?.target_id).toBe('proj-55');
    expect(entries[49].metadata?.target_id).toBe('proj-6');

    clearLocalAuditLogs('demo');
    expect(readLocalAuditLogs('demo')).toHaveLength(0);
  });

  it('inserts into planner_audit_logs using real DB columns when supported', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null, status: 201 });
    mockFrom.mockReturnValue({ insert });

    await logAudit({
      orgId: ORG_ID,
      actorId: USER_ID,
      actorName: 'Indra',
      action: 'member.role_changed',
      targetType: 'member',
      targetId: 'member-row-1',
      targetUserId: TARGET_USER_ID,
      metadata: { new_role: 'manager' },
    });

    expect(mockFrom).toHaveBeenCalledWith('planner_audit_logs');
    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload).toMatchObject({
      org_id: ORG_ID,
      user_id: USER_ID,
      action: 'member.role_changed',
      target_user_id: TARGET_USER_ID,
      metadata: {
        new_role: 'manager',
        actor_name: 'Indra',
        target_type: 'member',
        target_id: 'member-row-1',
      },
    });
    expect(payload).not.toHaveProperty('actor_id');
    expect(payload).not.toHaveProperty('target_type');
    expect(payload).not.toHaveProperty('target_id');
    expect(isAuditInsertSupported()).toBe(true);
  });

  it('disables further remote inserts for the session after 42501 / 403 and never throws', async () => {
    const insert42501 = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
      status: 403,
    });
    mockFrom.mockReturnValue({ insert: insert42501 });

    await expect(
      logAudit({
        orgId: ORG_ID,
        action: 'rap.created',
        targetType: 'rap_item',
        targetId: 'rap-1',
        metadata: { name: 'Semen' },
      }),
    ).resolves.toBeUndefined();

    expect(isAuditInsertSupported()).toBe(false);
    expect(readLocalAuditLogs(ORG_ID)).toHaveLength(1);

    mockFrom.mockClear();
    await expect(
      logAudit({
        orgId: ORG_ID,
        action: 'rap.updated',
        targetType: 'rap_item',
        targetId: 'rap-1',
      }),
    ).resolves.toBeUndefined();

    expect(mockFrom).not.toHaveBeenCalled();
    expect(readLocalAuditLogs(ORG_ID)).toHaveLength(2);
  });

  it('never throws when Supabase insert rejects with a network error', async () => {
    const insertReject = vi.fn().mockRejectedValue(new Error('Network down'));
    mockFrom.mockReturnValue({ insert: insertReject });

    await expect(
      logAudit({
        orgId: ORG_ID,
        action: 'cost.deleted',
        targetType: 'cost',
        targetId: 'cost-9',
      }),
    ).resolves.toBeUndefined();

    expect(readLocalAuditLogs(ORG_ID)).toHaveLength(1);
    expect(isAuditInsertSupported()).toBe(true);
  });

  it('merges DB and local logs cleanly, deduping by id and edge-vs-client pairs, sorted newest-first', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null, status: 201 });
    mockFrom.mockReturnValue({ insert });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T12:00:00.000Z'));
    await logAudit({
      orgId: ORG_ID,
      actorId: USER_ID,
      actorName: 'Indra',
      action: 'project.created',
      targetType: 'project',
      targetId: PROJECT_ID,
      metadata: { name: 'Villa Ubud' },
    });
    const insertedId = insert.mock.calls[0][0].id as string;

    vi.setSystemTime(new Date('2026-11-21T12:05:01.000Z'));
    await logAudit({
      orgId: ORG_ID,
      actorId: USER_ID,
      actorName: 'Indra',
      action: 'member.role_changed',
      targetType: 'member',
      targetId: 'member-1',
      targetUserId: TARGET_USER_ID,
      metadata: { new_role: 'manager' },
    });

    const dbRows = [
      {
        id: insertedId,
        org_id: ORG_ID,
        user_id: USER_ID,
        action: 'project.created',
        metadata: { name: 'Villa Ubud' },
        created_at: '2026-11-21T12:00:00.000Z',
      },
      {
        id: 'edge-row-uuid',
        org_id: ORG_ID,
        user_id: USER_ID,
        action: 'member.role_changed',
        target_user_id: TARGET_USER_ID,
        metadata: { new_role: 'manager' },
        created_at: '2026-11-21T12:05:00.000Z',
      },
      {
        id: 'older-db-row',
        org_id: ORG_ID,
        user_id: USER_ID,
        action: 'org.created',
        metadata: { name: 'PT Maju Jaya' },
        created_at: '2026-11-20T08:00:00.000Z',
      },
    ];

    const limit = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const merged = await listAuditLogs(ORG_ID);
    expect(merged).toHaveLength(3);
    expect(merged.map(r => r.id)).toEqual(['edge-row-uuid', insertedId, 'older-db-row']);
    expect(merged[0].metadata).toMatchObject({
      new_role: 'manager',
      actor_name: 'Indra',
      target_type: 'member',
      target_id: 'member-1',
    });
  });

  it('falls back to local logs when listAuditLogs DB select fails', async () => {
    await logAudit({
      orgId: ORG_ID,
      isDemoMode: false,
      action: 'rap.deleted',
      targetType: 'rap_item',
      targetId: 'rap-5',
      metadata: { name: 'Besi Beton' },
    });

    const limit = vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'Forbidden' } });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await listAuditLogs(ORG_ID);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('rap.deleted');
  });

  it('resolves project orgId via cache or DB in logProjectAudit', async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null, status: 201 });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { org_id: ORG_ID }, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'planner_projects') return { select };
      return { insert };
    });

    await logProjectAudit({
      projectId: PROJECT_ID,
      actorId: USER_ID,
      action: 'cost.created',
      targetType: 'cost',
      targetId: 'cost-1',
      metadata: { description: 'Pasir 1 truk', total_amount: 1_500_000 },
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(readLocalAuditLogs(ORG_ID)).toHaveLength(1);

    // Cached projectId should not re-query planner_projects
    mockFrom.mockClear();
    mockFrom.mockReturnValue({ insert });
    rememberProjectOrg(PROJECT_ID, ORG_ID);
    await logProjectAudit({
      projectId: PROJECT_ID,
      actorId: USER_ID,
      action: 'rap.updated',
      targetType: 'rap_item',
      targetId: 'rap-2',
    });
    expect(mockFrom).toHaveBeenCalledWith('planner_audit_logs');
    expect(mockFrom).not.toHaveBeenCalledWith('planner_projects');
  });

  it('formats Indonesian timestamps, action labels, summaries, and CSV cleanly', () => {
    expect(formatAuditTimestampId('2026-11-21T14:30:00.000Z', 'Asia/Jakarta')).toBe('21 Nov 2026, 21.30');
    expect(formatAuditTimestampId(null)).toBe('—');
    expect(formatAuditTimestampId('not-a-date')).toBe('not-a-date');

    expect(formatAuditActionLabel('project.created')).toBe('Proyek dibuat');
    expect(formatAuditActionLabel('cost.created')).toBe('Biaya dicatat');
    expect(formatAuditActionLabel('rap.deleted')).toBe('Item RAP dihapus');
    expect(formatAuditActionLabel('member.role_changed')).toBe('Role anggota diubah');
    expect(formatAuditActionLabel('member.removed')).toBe('Anggota dinonaktifkan / dihapus');
    expect(formatAuditActionLabel('invitation.created')).toBe('Undangan dibuat');
    expect(formatAuditActionLabel('invitation.revoked')).toBe('Undangan dicabut');
    expect(formatAuditActionLabel('custom_task.reordered')).toBe('Custom task reordered');
    expect(formatAuditActionLabel('')).toBe('Aktivitas sistem');

    const summary = formatAuditSummary(
      {
        id: '1',
        org_id: ORG_ID,
        user_id: USER_ID,
        target_user_id: TARGET_USER_ID,
        action: 'member.role_changed',
        metadata: { new_role: 'manager' },
        created_at: '2026-11-21T14:30:00.000Z',
      },
      { [USER_ID]: 'Indra', [TARGET_USER_ID]: 'Budi' },
    );
    expect(summary).toBe('Indra · Budi → Manager');

    const csv = exportAuditCsv([
      {
        id: '1',
        org_id: ORG_ID,
        user_id: USER_ID,
        action: 'project.created',
        metadata: { name: 'Proyek A' },
        created_at: '2026-11-21T14:30:00.000Z',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('created_at,action,user_id,target_user_id,metadata');
    expect(lines[1]).toContain('project.created');
    expect(lines[1]).toContain('Proyek A');
  });
});
