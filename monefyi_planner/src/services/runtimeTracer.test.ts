import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn<() => Promise<unknown>>();
const mockInsert = vi.fn<(rows: unknown) => Promise<unknown>>();
const mockFrom = vi.fn((_table: string) => ({ insert: mockInsert }));

const mockStoreState = {
  isDemoMode: false,
  isAuthenticated: true,
  tenant: { id: '11111111-1111-1111-1111-111111111111' },
  user: { id: '22222222-2222-2222-2222-222222222222' },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: () => mockStoreState,
  },
}));

import {
  clearRuntimeTraceQueue,
  flushQueue,
  isPermanentTraceError,
  isValidUuid,
  logTrace,
  pruneTraceQueueForUser,
} from './runtimeTracer';

const QUEUE_KEY = 'monefyi_runtime_trace_queue';

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

describe('runtimeTracer Phase 1 hardening', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    mockStoreState.isDemoMode = false;
    mockStoreState.isAuthenticated = true;
    mockStoreState.tenant = { id: '11111111-1111-1111-1111-111111111111' };
    mockStoreState.user = { id: '22222222-2222-2222-2222-222222222222' };
    mockGetSession.mockReset();
    mockInsert.mockReset();
    mockFrom.mockClear();
  });

  it('validates UUIDs and detects permanent RLS/4xx errors', () => {
    expect(isValidUuid('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(isValidUuid('demo')).toBe(false);
    expect(isPermanentTraceError({ code: '42501', message: 'permission denied' })).toBe(true);
    expect(isPermanentTraceError({ message: 'Forbidden' }, 403)).toBe(true);
    expect(isPermanentTraceError({ message: 'timeout' }, 503)).toBe(false);
    expect(isPermanentTraceError({ message: 'rate limit' }, 429)).toBe(false);
  });

  it('prunes owner queued traces before worker session flushes', async () => {
    const ownerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const workerId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        { user_id: ownerId, tenant_id: mockStoreState.tenant.id, event_type: 'auth_fail' },
        { user_id: workerId, tenant_id: mockStoreState.tenant.id, event_type: 'ui_error' },
      ]),
    );

    pruneTraceQueueForUser(workerId);
    const remaining = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].user_id).toBe(workerId);

    clearRuntimeTraceQueue(workerId);
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
  });

  it('drops permanent 403/42501 errors instead of infinitely re-queueing them', async () => {
    const workerId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: workerId } } },
      error: null,
    });
    mockInsert.mockResolvedValue({
      error: { code: '42501', message: 'new row violates row-level security policy' },
      status: 403,
    });

    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([{ user_id: workerId, tenant_id: mockStoreState.tenant.id, event_type: 'ui_error' }]),
    );

    await flushQueue();
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
  });

  it('ignores traces during demo mode or invalid non-UUID IDs', () => {
    mockStoreState.isDemoMode = true;
    logTrace('ui_error', { component: 'Demo', message: 'should ignore' });
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();

    mockStoreState.isDemoMode = false;
    mockStoreState.user = { id: 'demo-u-1' };
    logTrace('ui_error', { component: 'Demo', message: 'non uuid user', tenant_id: 'demo' });
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
  });
});

