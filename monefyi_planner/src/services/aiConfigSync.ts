import { supabase } from '../lib/supabase';
import { updateProfileSettings } from './profileService';
import { updateUserAccount } from './adminService';
import {
  loadAIConfig,
  saveAIConfig,
  type AIConfig,
  type AIProviderId,
} from './aiProviderService';

const SETTINGS_KEY = 'planner_ai_config';
const PROVIDERS: AIProviderId[] = ['openrouter', 'gemini', 'groq', 'anthropic', 'openai'];

function cloudSlice(raw: unknown): Partial<AIConfig> | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<AIConfig>;
  return {
    activeProvider: body.activeProvider,
    models: body.models,
    executionMode: body.executionMode,
    autoLimit: body.autoLimit,
    keys: body.keys,
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
  return {
    ...local,
    activeProvider: cloud?.activeProvider ?? local.activeProvider,
    executionMode: cloud?.executionMode ?? local.executionMode,
    autoLimit: cloud?.autoLimit ?? local.autoLimit,
    models: { ...(cloud?.models ?? {}), ...local.models },
    keys,
  };
}

export async function hydrateAIConfigFromAccount(userId: string): Promise<AIConfig> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings, gemini_key')
    .eq('id', userId)
    .maybeSingle();
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const cloud = cloudSlice(settings[SETTINGS_KEY]);
  const merged = mergeCloudAIConfig(loadAIConfig(), cloud, data?.gemini_key ?? null);
  // #region agent log
  fetch('http://127.0.0.1:7456/ingest/64ec47ef-1a63-485e-909c-4ab70260afe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'735de3'},body:JSON.stringify({sessionId:'735de3',hypothesisId:'D',location:'aiConfigSync.ts:hydrate',message:'hydrate ai config',data:{dbError:error?.message??null,hasCloud:!!cloud,cloudProviders:cloud?.keys?Object.keys(cloud.keys).filter(k=>Boolean(cloud.keys?.[k as AIProviderId]?.trim())):[],hasGeminiColumn:Boolean(data?.gemini_key?.trim()),activeAfter:merged.activeProvider,keyReady:Boolean(merged.keys[merged.activeProvider]?.trim())},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  saveAIConfig(merged);
  return merged;
}

export async function persistAIConfigToAccount(userId: string, config: AIConfig): Promise<void> {
  await updateProfileSettings(userId, {
    [SETTINGS_KEY]: {
      activeProvider: config.activeProvider,
      models: config.models,
      executionMode: config.executionMode,
      autoLimit: config.autoLimit,
      keys: config.keys,
    },
  });
  const gemini = config.keys.gemini?.trim();
  if (gemini) await updateUserAccount({ gemini_key: gemini });
  // #region agent log
  fetch('http://127.0.0.1:7456/ingest/64ec47ef-1a63-485e-909c-4ab70260afe3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'735de3'},body:JSON.stringify({sessionId:'735de3',hypothesisId:'E',location:'aiConfigSync.ts:persist',message:'persist ai config',data:{activeProvider:config.activeProvider,providersWithKey:PROVIDERS.filter(p=>Boolean(config.keys[p]?.trim()))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}
