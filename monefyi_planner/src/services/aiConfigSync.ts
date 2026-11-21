import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { isDemoOrInvalidUuid } from '../lib/demo/demoMode';
import { updateProfileSettings } from './profileService';
import { updateUserAccount } from './adminService';
import {
  clearAIConfigLocal,
  isAIProxyEnabled,
  loadAIConfig,
  maskApiKey,
  saveAIConfig,
  type AIConfig,
  type AIProviderId,
} from './aiProviderService';

const SETTINGS_KEY = 'planner_ai_config';
const OWNER_STORAGE_KEY = 'monefyi_planner_ai_owner_v1';
const PROVIDERS: AIProviderId[] = ['openrouter', 'gemini', 'groq', 'anthropic', 'openai'];

let lastHydratedUserId: string | null = null;

function getLocalOwnerUserId(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const fromSession = sessionStorage.getItem(OWNER_STORAGE_KEY);
      if (fromSession) return fromSession;
    }
  } catch { /* ignore */ }
  try {
    if (typeof localStorage !== 'undefined') {
      const fromLocal = localStorage.getItem(OWNER_STORAGE_KEY);
      if (fromLocal) return fromLocal;
    }
  } catch { /* ignore */ }
  return null;
}

function setLocalOwnerUserId(userId: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(OWNER_STORAGE_KEY, userId);
    }
  } catch { /* ignore */ }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(OWNER_STORAGE_KEY, userId);
    }
  } catch { /* ignore */ }
}

function isDemoOrNonUuidUser(userId?: string | null): boolean {
  const state = useAppStore.getState();
  return isDemoOrInvalidUuid(userId, Boolean(state.isDemoMode || state.tenant?.id === 'demo'));
}

function sanitizeKeyMap(raw: unknown): Partial<Record<AIProviderId, string>> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Partial<Record<AIProviderId, string>> = {};
  for (const id of PROVIDERS) {
    const val = (raw as Record<string, unknown>)[id];
    if (typeof val === 'string' && val.trim()) {
      result[id] = val.trim();
    }
  }
  return result;
}

function sanitizeHintMap(raw: unknown): Partial<Record<AIProviderId, string>> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Partial<Record<AIProviderId, string>> = {};
  for (const id of PROVIDERS) {
    const val = (raw as Record<string, unknown>)[id];
    if (typeof val === 'string' && val.trim()) {
      result[id] = val.trim();
    }
  }
  return result;
}

function sanitizeConfiguredList(raw: unknown): AIProviderId[] {
  if (!Array.isArray(raw)) return [];
  return PROVIDERS.filter(id => raw.includes(id));
}

function cloudSlice(raw: unknown): Partial<AIConfig> | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<AIConfig>;
  return {
    activeProvider: body.activeProvider,
    models: body.models,
    executionMode: body.executionMode,
    autoLimit: body.autoLimit,
    keys: sanitizeKeyMap(body.keys),
    configuredProviders: sanitizeConfiguredList(body.configuredProviders),
    keyHints: sanitizeHintMap(body.keyHints),
  };
}

/** Gabungkan preferensi cloud ke cache lokal; key cloud mengisi perangkat yang belum punya key. */
export function mergeCloudAIConfig(
  local: AIConfig,
  cloud: Partial<AIConfig> | null,
  geminiColumn: string | null,
): AIConfig {
  const keys: Partial<Record<AIProviderId, string>> = { ...local.keys };
  const cloudKeys = cloud?.keys ?? {};
  for (const id of PROVIDERS) {
    const fromCloud = cloudKeys[id]?.trim();
    const fromLocal = keys[id]?.trim();
    if (fromCloud) keys[id] = fromCloud;
    else if (!fromLocal && id === 'gemini' && geminiColumn?.trim()) keys[id] = geminiColumn.trim();
  }
  let activeProvider = cloud?.activeProvider ?? local.activeProvider;
  if (!keys[activeProvider]?.trim()) {
    const withKey = PROVIDERS.find(id => Boolean(keys[id]?.trim()));
    if (withKey) activeProvider = withKey;
  }
  return {
    ...local,
    activeProvider,
    executionMode: cloud?.executionMode ?? local.executionMode,
    autoLimit: cloud?.autoLimit ?? local.autoLimit,
    models: { ...(cloud?.models ?? {}), ...local.models },
    keys,
  };
}

export async function hydrateAIConfigFromAccount(userId: string): Promise<AIConfig> {
  const prevOwner = getLocalOwnerUserId();
  if ((lastHydratedUserId !== null && lastHydratedUserId !== userId) || (prevOwner !== null && prevOwner !== userId)) {
    // Isolasi lintas-akun pada browser bersama: bersihkan key sesi akun sebelumnya
    clearAIConfigLocal();
  }
  lastHydratedUserId = userId;
  setLocalOwnerUserId(userId);

  if (isDemoOrNonUuidUser(userId)) {
    return loadAIConfig();
  }

  const { data } = await supabase
    .from('profiles')
    .select('settings, gemini_key')
    .eq('id', userId)
    .maybeSingle();
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const cloud = cloudSlice(settings[SETTINGS_KEY]);

  if (isAIProxyEnabled()) {
    let proxyConfigured: AIProviderId[] = cloud?.configuredProviders ?? [];
    let proxyHints: Partial<Record<AIProviderId, string>> = { ...(cloud?.keyHints ?? {}) };

    try {
      const { data: proxyStatus, error } = await supabase.functions.invoke('planner-ai-proxy', {
        body: { action: 'status' },
      });
      if (!error && proxyStatus && typeof proxyStatus === 'object') {
        const statusObj = proxyStatus as Record<string, unknown>;
        const rawProviders = statusObj.configuredProviders ?? statusObj.providers;
        const rawHints = statusObj.keyHints ?? statusObj.hints;
        if (Array.isArray(rawProviders)) {
          proxyConfigured = sanitizeConfiguredList(rawProviders);
        }
        if (rawHints && typeof rawHints === 'object') {
          proxyHints = sanitizeHintMap(rawHints);
        }
      }
    } catch {
      // Fallback ke metadata non-secret dari profiles.settings bila proxy status sementara gagal
    }

    const local = loadAIConfig();
    let activeProvider = cloud?.activeProvider ?? local.activeProvider;
    if (!proxyConfigured.includes(activeProvider) && proxyConfigured.length > 0) {
      activeProvider = proxyConfigured[0];
    }

    const mergedProxyConfig: AIConfig = {
      activeProvider,
      keys: {},
      models: { ...(cloud?.models ?? {}), ...local.models },
      executionMode: cloud?.executionMode ?? local.executionMode,
      autoLimit: cloud?.autoLimit ?? local.autoLimit,
      configuredProviders: proxyConfigured,
      keyHints: proxyHints,
    };
    saveAIConfig(mergedProxyConfig);
    return mergedProxyConfig;
  }

  const merged = mergeCloudAIConfig(loadAIConfig(), cloud, data?.gemini_key ?? null);
  saveAIConfig(merged);
  return merged;
}

export async function persistAIConfigToAccount(userId: string, config: AIConfig): Promise<void> {
  if (isDemoOrNonUuidUser(userId)) return;

  const cleanKeys = sanitizeKeyMap(config.keys);

  if (isAIProxyEnabled()) {
    const configuredSet = new Set<AIProviderId>(sanitizeConfiguredList(config.configuredProviders));
    const keyHints: Partial<Record<AIProviderId, string>> = sanitizeHintMap(config.keyHints);

    for (const id of PROVIDERS) {
      const rawKey = cleanKeys[id];
      if (!rawKey) continue;
      const { data, error } = await supabase.functions.invoke('planner-ai-proxy', {
        body: { action: 'set_key', provider: id, apiKey: rawKey },
      });
      if (error) throw new Error(error.message || `Gagal menyimpan key ${id} ke proxy`);
      if (data?.error) throw new Error(String(data.error));
      configuredSet.add(id);
      keyHints[id] = maskApiKey(rawKey);
    }

    const configuredProviders = Array.from(configuredSet);
    await updateProfileSettings(userId, {
      [SETTINGS_KEY]: {
        activeProvider: config.activeProvider,
        models: config.models,
        executionMode: config.executionMode,
        autoLimit: config.autoLimit,
        configuredProviders,
        keyHints,
      },
    });
    return;
  }

  const configuredProviders = PROVIDERS.filter(id => Boolean(cleanKeys[id]));
  const keyHints: Partial<Record<AIProviderId, string>> = {};
  for (const id of configuredProviders) {
    const key = cleanKeys[id];
    if (key) keyHints[id] = maskApiKey(key);
  }

  await updateProfileSettings(userId, {
    [SETTINGS_KEY]: {
      activeProvider: config.activeProvider,
      models: config.models,
      executionMode: config.executionMode,
      autoLimit: config.autoLimit,
      keys: cleanKeys,
      configuredProviders,
      keyHints,
    },
  });
  const gemini = cleanKeys.gemini;
  if (gemini) await updateUserAccount({ gemini_key: gemini });
}

export async function deleteAIProviderKeyFromAccount(
  userId: string,
  provider: AIProviderId,
  nextConfig: AIConfig,
): Promise<void> {
  if (isDemoOrNonUuidUser(userId)) return;

  if (isAIProxyEnabled()) {
    const { data, error } = await supabase.functions.invoke('planner-ai-proxy', {
      body: { action: 'delete_key', provider },
    });
    if (error) throw new Error(error.message || `Gagal menghapus key ${provider} di proxy`);
    if (data?.error) throw new Error(String(data.error));
  } else if (provider === 'gemini') {
    await updateUserAccount({ gemini_key: null });
  }

  await persistAIConfigToAccount(userId, nextConfig);
}
