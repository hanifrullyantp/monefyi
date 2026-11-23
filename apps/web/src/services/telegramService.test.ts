import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabaseFrom = vi.fn();

const mockStoreState: {
  user: { id: string; role: 'owner' | 'admin' | 'manager' | 'staff' | 'worker'; email?: string } | null;
  platformRole: 'user' | 'admin';
  uiViewMode: 'auto' | 'owner' | 'worker';
} = {
  user: { id: 'owner-1', role: 'owner', email: 'owner@froyek.com' },
  platformRole: 'user',
  uiViewMode: 'auto',
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: () => mockStoreState,
  },
}));

vi.mock('./runtimeTracer', () => ({
  logTrace: vi.fn(),
}));

import {
  canAccessTelegramSensitiveCache,
  clearTelegramLocalCache,
  dispatchProactiveAIOutreach,
  escalateQuestionToOwnerTelegram,
  fetchFieldMemberContactsFromSupabase,
  fetchProactiveTriggersFromSupabase,
  fetchTelegramConfigFromSupabase,
  loadFieldMemberContacts,
  loadProactiveTriggers,
  loadTelegramConfig,
  saveFieldMemberContacts,
  saveTelegramConfig,
} from './telegramService';

const STORAGE_TELEGRAM_CFG = 'monefyi_telegram_config_v1';
const STORAGE_FIELD_CONTACTS = 'monefyi_field_member_contacts_v1';
const STORAGE_PROACTIVE_LOGS = 'monefyi_proactive_triggers_v1';

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
    clear: () => {
      store.clear();
    },
  };
}

describe('telegramService role guard & cache isolation (F-35)', () => {
  let localStore: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    localStore = createMemoryStorage();
    vi.stubGlobal('localStorage', localStore);
    mockStoreState.user = { id: 'owner-1', role: 'owner', email: 'owner@froyek.com' };
    mockStoreState.platformRole = 'user';
    mockStoreState.uiViewMode = 'auto';
    mockSupabaseFrom.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('canAccessTelegramSensitiveCache hanya mengizinkan owner/manager dan memblokir worker/staff serta preview worker', () => {
    expect(canAccessTelegramSensitiveCache('owner', 'user', 'owner@froyek.com')).toBe(true);
    expect(canAccessTelegramSensitiveCache('manager', 'user', 'mgr@froyek.com')).toBe(true);
    expect(canAccessTelegramSensitiveCache('worker', 'user', 'tukang@froyek.com')).toBe(false);
    expect(canAccessTelegramSensitiveCache('staff', 'user', 'staf@froyek.com')).toBe(false);

    mockStoreState.user = { id: 'w-1', role: 'worker', email: 'tukang@froyek.com' };
    expect(canAccessTelegramSensitiveCache()).toBe(false);

    mockStoreState.user = { id: 'adm-1', role: 'owner', email: 'admin@froyek.com' };
    mockStoreState.platformRole = 'admin';
    mockStoreState.uiViewMode = 'worker';
    expect(canAccessTelegramSensitiveCache()).toBe(false);

    mockStoreState.uiViewMode = 'auto';
    expect(canAccessTelegramSensitiveCache()).toBe(true);

    mockStoreState.user = null;
    mockStoreState.platformRole = 'user';
    expect(canAccessTelegramSensitiveCache()).toBe(false);
  });

  it('memblokir worker/staff membaca, menulis, maupun menarik data Supabase untuk botToken & kontak lapangan', async () => {
    mockStoreState.user = { id: 'worker-1', role: 'worker', email: 'worker@froyek.com' };

    await saveTelegramConfig({
      botToken: '123456:BOT_SECRET_TOKEN',
      enabled: true,
      ownerChatId: '999999',
    }, 'org-1');
    await saveFieldMemberContacts({
      m1: {
        memberId: 'm1',
        userId: 'u1',
        name: 'Mandor Budi',
        role: 'worker',
        position: 'Mandor',
        phone: '+628111111111',
        telegramChatId: '777777',
        proactiveReminders: { dailyLog: true, attendance: true, cashbonNotice: true, urgentTasks: true },
      },
    }, 'org-1');

    expect(localStore.getItem(STORAGE_TELEGRAM_CFG)).toBeNull();
    expect(localStore.getItem(STORAGE_FIELD_CONTACTS)).toBeNull();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();

    expect(await fetchTelegramConfigFromSupabase('org-1')).toBeNull();
    expect(await fetchFieldMemberContactsFromSupabase('org-1')).toBeNull();
    expect(await fetchProactiveTriggersFromSupabase('org-1')).toBeNull();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();

    const safeCfg = loadTelegramConfig();
    expect(safeCfg.botToken).toBe('');
    expect(safeCfg.enabled).toBe(false);
    expect(loadFieldMemberContacts()).toEqual({});
    expect(loadProactiveTriggers()).toEqual([]);

    const escRes = await escalateQuestionToOwnerTelegram('Butuh tanya harga');
    expect(escRes.ok).toBe(false);
    expect(escRes.error).toContain('worker');

    const outreachRes = await dispatchProactiveAIOutreach({
      member: {
        memberId: 'm1',
        userId: 'u1',
        name: 'Budi',
        role: 'worker',
        position: 'Tukang',
        proactiveReminders: { dailyLog: true, attendance: true, cashbonNotice: true, urgentTasks: true },
      },
      category: 'attendance',
    });
    expect(outreachRes.ok).toBe(false);
  });

  it('otomatis membersihkan cache Owner yang tertinggal di localStorage saat Worker mengakses fungsi Telegram', async () => {
    localStore.setItem(
      STORAGE_TELEGRAM_CFG,
      JSON.stringify({ botToken: '999999:LEAKED_OWNER_TOKEN', enabled: true, ownerChatId: '111222' }),
    );
    localStore.setItem(
      STORAGE_FIELD_CONTACTS,
      JSON.stringify({ m1: { name: 'Mandor Rahasia', phone: '081234567890', telegramChatId: '333444' } }),
    );
    localStore.setItem(STORAGE_PROACTIVE_LOGS, JSON.stringify([{ id: 'pt-1', message: 'rahasia' }]));

    mockStoreState.user = { id: 'staff-1', role: 'staff', email: 'staff@froyek.com' };

    const cfg = loadTelegramConfig();
    expect(cfg.botToken).toBe('');
    expect(localStore.getItem(STORAGE_TELEGRAM_CFG)).toBeNull();
    expect(localStore.getItem(STORAGE_FIELD_CONTACTS)).toBeNull();
    expect(localStore.getItem(STORAGE_PROACTIVE_LOGS)).toBeNull();

    // Re-seed lalu cek fetch path juga ikut membersihkan
    localStore.setItem(STORAGE_TELEGRAM_CFG, JSON.stringify({ botToken: '999999:STALE' }));
    localStore.setItem(STORAGE_FIELD_CONTACTS, JSON.stringify({ m1: { phone: '0812' } }));
    await fetchFieldMemberContactsFromSupabase('org-1');
    expect(localStore.getItem(STORAGE_TELEGRAM_CFG)).toBeNull();
    expect(localStore.getItem(STORAGE_FIELD_CONTACTS)).toBeNull();
  });

  it('mengizinkan Owner & Manager memuat, menyimpan, dan menyinkronkan konfigurasi Telegram + kontak lapangan', async () => {
    mockStoreState.user = { id: 'mgr-1', role: 'manager', email: 'manager@froyek.com' };

    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              settings: {
                telegram_config: {
                  botToken: '111222:MGR_TOKEN',
                  botUsername: 'froyek_mgr_bot',
                  enabled: true,
                  ownerChatId: '555666',
                },
                field_member_contacts: {
                  m1: {
                    memberId: 'm1',
                    userId: 'u1',
                    name: 'Pak Raka',
                    role: 'manager',
                    position: 'Site Manager',
                    phone: '+62812345678',
                    telegramChatId: '888999',
                    proactiveReminders: { dailyLog: true, attendance: true, cashbonNotice: true, urgentTasks: true },
                  },
                },
              },
            },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    });

    const remoteCfg = await fetchTelegramConfigFromSupabase('org-1');
    expect(remoteCfg?.botToken).toBe('111222:MGR_TOKEN');
    expect(loadTelegramConfig().botToken).toBe('111222:MGR_TOKEN');

    const remoteContacts = await fetchFieldMemberContactsFromSupabase('org-1');
    expect(remoteContacts?.m1.phone).toBe('+62812345678');
    expect(loadFieldMemberContacts().m1.telegramChatId).toBe('888999');

    clearTelegramLocalCache();
    expect(localStore.getItem(STORAGE_TELEGRAM_CFG)).toBeNull();
    expect(localStore.getItem(STORAGE_FIELD_CONTACTS)).toBeNull();
    expect(localStore.getItem(STORAGE_PROACTIVE_LOGS)).toBeNull();
  });
});
