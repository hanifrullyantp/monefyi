import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpdateProfileSettings = vi.fn<(...args: unknown[]) => Promise<void>>();
const mockUpdateUserAccount = vi.fn<(...args: unknown[]) => Promise<{ ok: boolean }>>();
const mockSupabaseFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

const mockAppStoreState = {
  isDemoMode: false,
  tenant: { id: '11111111-1111-1111-1111-111111111111' },
  user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: () => mockAppStoreState,
  },
}));

vi.mock('./profileService', () => ({
  updateProfileSettings: (...args: unknown[]) => mockUpdateProfileSettings(...args),
}));

vi.mock('./adminService', () => ({
  updateUserAccount: (...args: unknown[]) => mockUpdateUserAccount(...args),
}));

import {
  callUnifiedAI,
  clearAIConfigLocal,
  hasActiveKey,
  isAIProxyEnabled,
  loadAIConfig,
  maskApiKey,
  resolveWorkingProvider,
  saveAIConfig,
  type AIConfig,
} from './aiProviderService';
import {
  deleteAIProviderKeyFromAccount,
  hydrateAIConfigFromAccount,
  persistAIConfigToAccount,
} from './aiConfigSync';

const STORAGE_KEY = 'monefyi_planner_ai_config_v1';
const SESSION_KEYS_STORAGE_KEY = 'monefyi_planner_ai_keys_session_v1';

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

describe('aiProviderService & aiConfigSync (F-24)', () => {
  let localStore: ReturnType<typeof createMemoryStorage>;
  let sessionStore: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    localStore = createMemoryStorage();
    sessionStore = createMemoryStorage();
    vi.stubGlobal('localStorage', localStore);
    vi.stubGlobal('sessionStorage', sessionStore);
    vi.unstubAllEnvs();
    clearAIConfigLocal();
    mockUpdateProfileSettings.mockReset();
    mockUpdateUserAccount.mockReset();
    mockSupabaseFrom.mockReset();
    mockFunctionsInvoke.mockReset();
    mockAppStoreState.isDemoMode = false;
    mockAppStoreState.tenant = { id: '11111111-1111-1111-1111-111111111111' };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('menggunakan executionMode default "review" (opt-in Auto-Pilot)', () => {
    const cfg = loadAIConfig();
    expect(cfg.executionMode).toBe('review');
    expect(cfg.activeProvider).toBe('openrouter');
    expect(cfg.keys).toEqual({});
    expect(hasActiveKey(cfg)).toBe(false);
  });

  it('saveAIConfig mengisolasi API key ke sessionStorage + memory dan tidak pernah menulis raw key ke localStorage', () => {
    const secretOpenRouter = 'sk-or-v1-supersecret9999wxyz';
    const secretGemini = 'AIzaSyTestSecretKey1234abcd';

    saveAIConfig({
      activeProvider: 'openrouter',
      keys: {
        openrouter: secretOpenRouter,
        gemini: secretGemini,
      },
      models: { openrouter: 'deepseek/deepseek-chat' },
      executionMode: 'review',
      autoLimit: 2_500_000,
    });

    const rawLocal = localStore.getItem(STORAGE_KEY) || '';
    expect(rawLocal).not.toBe('');
    expect(rawLocal).not.toContain(secretOpenRouter);
    expect(rawLocal).not.toContain(secretGemini);

    const parsedLocal = JSON.parse(rawLocal);
    expect(parsedLocal.keys).toBeUndefined();
    expect(parsedLocal.activeProvider).toBe('openrouter');
    expect(parsedLocal.executionMode).toBe('review');
    expect(parsedLocal.configuredProviders).toEqual(['openrouter', 'gemini']);
    expect(parsedLocal.keyHints).toEqual({
      openrouter: maskApiKey(secretOpenRouter),
      gemini: maskApiKey(secretGemini),
    });

    const rawSession = sessionStore.getItem(SESSION_KEYS_STORAGE_KEY) || '';
    expect(rawSession).toContain(secretOpenRouter);
    expect(rawSession).toContain(secretGemini);

    const loaded = loadAIConfig();
    expect(loaded.keys.openrouter).toBe(secretOpenRouter);
    expect(loaded.keys.gemini).toBe(secretGemini);
    expect(hasActiveKey(loaded)).toBe(true);
    expect(resolveWorkingProvider(loaded)).toBe('openrouter');
  });

  it('roundtrip saveAIConfig -> loadAIConfig tetap bekerja di runtime Node tanpa sessionStorage, dan hilangnya sessionStorage mengosongkan key', () => {
    // 1. Ketika sessionStorage terhapus (simulasi tab/browser ditutup), key tidak terbaca lagi dari localStorage
    saveAIConfig({
      ...loadAIConfig(),
      keys: { openai: 'sk-proj-secretkey0000wxyz' },
    });
    expect(hasActiveKey()).toBe(true);

    sessionStore.clear();
    const afterBrowserReopen = loadAIConfig();
    expect(afterBrowserReopen.keys).toEqual({});
    expect(hasActiveKey(afterBrowserReopen)).toBe(false);

    // 2. Fallback sinkron di Node/Vitest tanpa global sessionStorage & localStorage
    vi.stubGlobal('sessionStorage', undefined);
    vi.stubGlobal('localStorage', undefined);
    clearAIConfigLocal();
    saveAIConfig({
      ...loadAIConfig(),
      activeProvider: 'groq',
      keys: { groq: 'gsk_node_fallback_1234wxyz' },
      executionMode: 'auto',
      autoLimit: 1_000_000,
    });
    const nodeLoaded = loadAIConfig();
    expect(nodeLoaded.keys.groq).toBe('gsk_node_fallback_1234wxyz');
    expect(nodeLoaded.executionMode).toBe('auto');
    expect(hasActiveKey(nodeLoaded)).toBe(true);
  });

  it('memigrasi dan men-scrub legacy plaintext keys dari localStorage saat loadAIConfig pertama kali', () => {
    const legacySecret = 'sk-ant-api03-legacyplaintextkey9876';
    localStore.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeProvider: 'anthropic',
        executionMode: 'auto',
        autoLimit: 5_000_000,
        models: { anthropic: 'claude-3-5-haiku-latest' },
        keys: { anthropic: legacySecret },
      }),
    );

    const loaded = loadAIConfig();
    expect(loaded.keys.anthropic).toBe(legacySecret);
    expect(loaded.activeProvider).toBe('anthropic');
    expect(hasActiveKey(loaded)).toBe(true);

    // Pastikan plaintext keys sudah di-scrub dari localStorage dan dipindah ke sessionStorage
    const scrubbedLocalRaw = localStore.getItem(STORAGE_KEY) || '';
    expect(scrubbedLocalRaw).not.toContain(legacySecret);
    const scrubbedLocal = JSON.parse(scrubbedLocalRaw);
    expect(scrubbedLocal.keys).toBeUndefined();
    expect(scrubbedLocal.keyHints?.anthropic).toBe(maskApiKey(legacySecret));
    expect(scrubbedLocal.configuredProviders).toEqual(['anthropic']);

    const sessionRaw = sessionStore.getItem(SESSION_KEYS_STORAGE_KEY) || '';
    expect(sessionRaw).toContain(legacySecret);
  });

  it('clearAIConfigLocal menghapus memory fallback, sessionStorage, serta keys/keyHints/configuredProviders di localStorage', () => {
    saveAIConfig({
      activeProvider: 'openai',
      keys: { openai: 'sk-live-secret-abcdef1234' },
      models: { openai: 'gpt-4o-mini' },
      executionMode: 'auto',
      autoLimit: 4_000_000,
    });

    clearAIConfigLocal();

    expect(localStore.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStore.getItem(SESSION_KEYS_STORAGE_KEY)).toBeNull();

    const reloaded = loadAIConfig();
    expect(reloaded.keys).toEqual({});
    expect(reloaded.keyHints).toBeUndefined();
    expect(reloaded.configuredProviders).toBeUndefined();
    expect(reloaded.executionMode).toBe('review');
    expect(hasActiveKey(reloaded)).toBe(false);
  });

  it('maskApiKey menutupi bagian tengah secret dengan format aman', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('   ')).toBe('');
    expect(maskApiKey('short')).toBe('****');
    expect(maskApiKey('1234567890')).toBe('123...90');
    expect(maskApiKey('sk-or-v1-secret123456wxyz')).toBe('sk-or-...wxyz');
    expect(maskApiKey('AIzaSyDemoKey00001111abcd')).toBe('AIzaSy...abcd');
  });

  it('hydrateAIConfigFromAccount mengisolasi session keys antar user pada browser bersama', async () => {
    const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    mockSupabaseFrom.mockImplementation(() => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => {
            if (id === userA) {
              return {
                data: {
                  settings: {
                    planner_ai_config: {
                      activeProvider: 'openai',
                      executionMode: 'auto',
                      autoLimit: 9_000_000,
                      keys: { openai: 'sk-user-a-secret-9999' },
                    },
                  },
                  gemini_key: null,
                },
              };
            }
            return {
              data: {
                settings: {},
                gemini_key: null,
              },
            };
          },
        }),
      }),
    }));

    const cfgA = await hydrateAIConfigFromAccount(userA);
    expect(cfgA.keys.openai).toBe('sk-user-a-secret-9999');

    // User B login di browser yang sama (tanpa logout eksplisit terlebih dahulu)
    const cfgB = await hydrateAIConfigFromAccount(userB);
    expect(cfgB.keys).toEqual({});
    expect(hasActiveKey(cfgB)).toBe(false);
    expect(loadAIConfig().keys).toEqual({});
  });

  it('isAIProxyEnabled hanya memanggil planner-ai-proxy bila VITE_AI_PROXY_ENABLED=true', async () => {
    expect(isAIProxyEnabled()).toBe(false);

    vi.stubEnv('VITE_AI_PROXY_ENABLED', 'true');
    expect(isAIProxyEnabled()).toBe(true);

    const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        ok: true,
        text: 'OK dari proxy',
        providers: ['openrouter'],
        hints: { openrouter: 'sk-or-...wxyz' },
      },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              settings: {
                planner_ai_config: {
                  activeProvider: 'openrouter',
                  executionMode: 'review',
                  autoLimit: 5_000_000,
                },
              },
              gemini_key: 'should-not-leak-in-proxy-mode',
            },
          }),
        }),
      }),
    });

    const hydrated = await hydrateAIConfigFromAccount(userA);
    expect(hydrated.keys).toEqual({});
    expect(hydrated.configuredProviders).toEqual(['openrouter']);
    expect(hydrated.keyHints).toEqual({ openrouter: 'sk-or-...wxyz' });
    expect(hasActiveKey(hydrated)).toBe(true);

    const reply = await callUnifiedAI([{ role: 'user', content: 'Halo' }], {}, hydrated);
    expect(reply).toBe('OK dari proxy');
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'planner-ai-proxy',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'chat', provider: 'openrouter' }),
      }),
    );

    await persistAIConfigToAccount(userA, {
      activeProvider: 'openrouter',
      keys: { openrouter: 'sk-or-v1-newsecretwxyz' },
      models: {},
      executionMode: 'review',
      autoLimit: 5_000_000,
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('planner-ai-proxy', {
      body: { action: 'set_key', provider: 'openrouter', apiKey: 'sk-or-v1-newsecretwxyz' },
    });
    // Tidak boleh menyimpan raw keys di profiles.settings maupun gemini_key saat proxy aktif
    expect(mockUpdateUserAccount).not.toHaveBeenCalled();
    expect(mockUpdateProfileSettings).toHaveBeenCalledWith(
      userA,
      expect.objectContaining({
        planner_ai_config: expect.not.objectContaining({
          keys: expect.anything(),
        }),
      }),
    );
  });

  it('deleteAIProviderKeyFromAccount mengosongkan profiles.gemini_key saat hapus Gemini non-proxy (F-24)', async () => {
    const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mockUpdateProfileSettings.mockResolvedValue(undefined);
    mockUpdateUserAccount.mockResolvedValue({ ok: true });

    await deleteAIProviderKeyFromAccount(userA, 'gemini', {
      activeProvider: 'openrouter',
      keys: {},
      models: {},
      executionMode: 'review',
      autoLimit: 5_000_000,
      configuredProviders: [],
      keyHints: {},
    });

    expect(mockUpdateUserAccount).toHaveBeenCalledWith({ gemini_key: null });
    expect(mockUpdateProfileSettings).toHaveBeenCalledWith(
      userA,
      expect.objectContaining({
        planner_ai_config: expect.objectContaining({
          configuredProviders: [],
        }),
      }),
    );
  });
});
