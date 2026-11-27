import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessions: Record<string, { email: string | null; email_confirmed_at: string | null; app_metadata: Record<string, unknown> } | null> = {
  anon: null,
  biasa: {
    email: 'pelanggan@froyek.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
  },
  superadmin: {
    email: 'hanif.rullyant@gmail.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
  },
};
let current = 'anon';

const fetchMock = vi.fn<(...args: unknown[]) => Promise<Response>>();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: sessions[current] ? { access_token: 'token-' + current, user: sessions[current]! } : null },
        error: null,
      }),
    },
  },
}));

vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

async function setUser(kind: 'anon' | 'biasa' | 'superadmin') {
  current = kind;
}

describe('services/rabService — 3 kasus akses RAB', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    current = 'anon';
  });
  afterEach(() => {
    fetchMock.mockReset();
  });

  it('kasus 1: anonim (tanpa login) → 401/403, tidak ada data', async () => {
    await setUser('anon');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    );

    const { rabService } = await import('./rabService');
    const res = await rabService.list('rab_projects');

    expect(res.error).toBeTruthy();
    expect((res.error as string).toLowerCase()).toMatch(/401|forbidden|missing/);
    expect(res.data).toBeTruthy();
  });

  it('kasus 2: pengguna biasa (bukan super admin) → 403, 0 baris', async () => {
    await setUser('biasa');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Forbidden: RAB hanya untuk super admin terverifikasi' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    );

    const { rabService } = await import('./rabService');
    const res = await rabService.list('rab_projects');

    expect(res.error).toBeTruthy();
    expect((res.error as string).toLowerCase()).toMatch(/forbidden|403/);
    expect(res.data).toBeTruthy();
  });

  it('kasus 3: super admin hanif.rullyant@gmail.com → akses diizinkan (200)', async () => {
    await setUser('superadmin');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 'rab-1', name: 'RAB Contoh' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    const { rabService } = await import('./rabService');
    const res = await rabService.list('rab_projects');

    expect(res.error).toBeNull();
    expect(res.data).toBeTruthy();
    expect(Array.isArray((res.data as { data: unknown[] }).data)).toBe(true);
    expect(((res.data as { data: unknown[] }).data).length).toBeGreaterThan(0);

    // verifikasi token dikirim ke edge function
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0] as string;
    const init = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1] as RequestInit | undefined;
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer token-superadmin' });
  });
});
