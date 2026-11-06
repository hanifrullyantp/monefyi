/**
 * Multi-provider AI client (BYOK): OpenRouter, Gemini, Groq, Anthropic (Claude), OpenAI.
 * API key disimpan lokal di browser pengguna dan dipanggil langsung ke provider.
 */

export type AIProviderId = 'openrouter' | 'gemini' | 'groq' | 'anthropic' | 'openai';

export interface AIProviderMeta {
  id: AIProviderId;
  label: string;
  keyHint: string;
  keyUrl: string;
  models: { id: string; label: string; cheap?: boolean }[];
}

export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyHint: 'sk-or-...',
    keyUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (murah)', cheap: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', cheap: true },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', cheap: true },
      { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B', cheap: true },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', cheap: true },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyHint: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (murah)', cheap: true },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', cheap: true },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    keyHint: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (sangat murah)', cheap: true },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', cheap: true },
    ],
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    keyHint: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (murah)', cheap: true },
      { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyHint: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini (murah)', cheap: true },
      { id: 'gpt-4o', label: 'GPT-4o' },
    ],
  },
];

export interface AIConfig {
  activeProvider: AIProviderId;
  keys: Partial<Record<AIProviderId, string>>;
  models: Partial<Record<AIProviderId, string>>;
  /** auto = jalankan aksi risiko rendah otomatis; review = selalu minta persetujuan. */
  executionMode: 'auto' | 'review';
  /** Batas nominal (Rp) aksi keuangan yang boleh auto-eksekusi pada mode auto. */
  autoLimit: number;
}

const STORAGE_KEY = 'monefyi_planner_ai_config_v1';

/** Model yang sudah dihapus Google / OpenRouter — dipetakan saat baca konfigurasi. */
const DEPRECATED_MODEL_ALIASES: Record<string, string> = {
  'gemini-2.0-flash-lite': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'google/gemini-2.0-flash-lite-001': 'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-lite': 'google/gemini-2.5-flash',
};

function migrateModelId(modelId: string): string {
  return DEPRECATED_MODEL_ALIASES[modelId] ?? modelId;
}

const DEFAULT_CONFIG: AIConfig = {
  activeProvider: 'openrouter',
  keys: {},
  models: {},
  executionMode: 'auto',
  autoLimit: 5_000_000,
};

export function getProviderMeta(id: AIProviderId): AIProviderMeta {
  return AI_PROVIDERS.find(p => p.id === id) ?? AI_PROVIDERS[0];
}

let memoryFallbackRaw: string | null = null;

export function loadAIConfig(): AIConfig {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : memoryFallbackRaw;
    if (!raw) return { ...DEFAULT_CONFIG, keys: {}, models: {} };
    const parsed = JSON.parse(raw) as Partial<AIConfig>;
    const models = { ...(parsed.models || {}) };
    for (const [provider, modelId] of Object.entries(models)) {
      if (typeof modelId === 'string') {
        const next = migrateModelId(modelId);
        if (next !== modelId) models[provider as AIProviderId] = next;
      }
    }
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      keys: { ...(parsed.keys || {}) },
      models,
    };
  } catch {
    return { ...DEFAULT_CONFIG, keys: {}, models: {} };
  }
}

export function saveAIConfig(config: AIConfig): void {
  const serialized = JSON.stringify(config);
  memoryFallbackRaw = serialized;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getActiveModel(config: AIConfig, provider = config.activeProvider): string {
  const stored = config.models[provider]?.trim();
  const resolved = migrateModelId(stored || getProviderMeta(provider).models[0].id);
  return resolved;
}

export function resolveWorkingProvider(config = loadAIConfig()): AIProviderId {
  if (config.keys[config.activeProvider]?.trim()) {
    return config.activeProvider;
  }
  for (const p of AI_PROVIDERS) {
    if (config.keys[p.id]?.trim()) return p.id;
  }
  return config.activeProvider;
}

export function hasActiveKey(config = loadAIConfig()): boolean {
  const provider = resolveWorkingProvider(config);
  return Boolean(config.keys[provider]?.trim());
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  /** Minta output JSON (didukung penuh oleh OpenAI-compatible; lainnya via prompt). */
  json?: boolean;
  signal?: AbortSignal;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text);
    return j?.error?.message || j?.message || text.slice(0, 200) || res.statusText;
  } catch {
    return text.slice(0, 200) || res.statusText;
  }
}

function openAICompatible(
  url: string,
  extraHeaders: Record<string, string> = {},
) {
  return async (
    key: string,
    model: string,
    messages: ChatMessage[],
    opts: CallOptions,
  ): Promise<string> => {
    const sendReq = async (useJsonFormat: boolean) =>
      fetch(url, {
        method: 'POST',
        signal: opts.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          ...extraHeaders,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.35,
          max_tokens: opts.maxTokens ?? 4096,
          ...(useJsonFormat ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

    let res = await sendReq(Boolean(opts.json));
    if (!res.ok && opts.json && (res.status === 400 || res.status === 422)) {
      // Beberapa model di OpenRouter / Groq tidak mendukung response_format json_object
      res = await sendReq(false);
    }
    if (!res.ok) throw new Error(`${res.status}: ${await readError(res)}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('Respons AI kosong');
    return text;
  };
}

const callOpenRouter = openAICompatible('https://openrouter.ai/api/v1/chat/completions', {
  'X-Title': 'Monefyi Planner',
});
const callGroq = openAICompatible('https://api.groq.com/openai/v1/chat/completions');
const callOpenAI = openAICompatible('https://api.openai.com/v1/chat/completions');

async function callAnthropic(
  key: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOptions,
): Promise<string> {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const convo = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system,
      messages: convo,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await readError(res)}`);
  const data = await res.json();
  const text = data?.content?.find((c: { type: string }) => c.type === 'text')?.text;
  if (typeof text !== 'string') throw new Error('Respons AI kosong');
  return text;
}

const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'];

function shouldRetryModel(status: number, errText: string): boolean {
  return status === 503 || status === 404 || /overloaded|unavailable|no longer available|not found/i.test(errText);
}

async function callGeminiOnce(
  key: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOptions,
): Promise<string> {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      signal: opts.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.35,
          maxOutputTokens: opts.maxTokens ?? 4096,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    const errText = await readError(res);
    throw new Error(`${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
  if (!text) throw new Error('Respons AI kosong');
  return text;
}

async function callGemini(
  key: string,
  model: string,
  messages: ChatMessage[],
  opts: CallOptions,
): Promise<string> {
  const tryModels = [model, ...GEMINI_MODEL_FALLBACKS.filter(m => m !== model)];
  let lastError = 'Gagal menghubungi Gemini';
  for (const candidate of tryModels) {
    try {
      return await callGeminiOnce(key, candidate, messages, opts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg;
      const status = Number(msg.match(/^(\d{3}):/)?.[1] ?? 0);
      if (!shouldRetryModel(status, msg)) throw e instanceof Error ? e : new Error(msg);
    }
  }
  throw new Error(lastError);
}

export class MissingAIKeyError extends Error {
  constructor(provider: AIProviderId) {
    super(`API key ${getProviderMeta(provider).label} belum diisi. Buka Pengaturan → AI & API Key.`);
    this.name = 'MissingAIKeyError';
  }
}

/** Panggil provider aktif (atau provider lain yang sudah memiliki key) dengan key milik pengguna. */
export async function callUnifiedAI(
  messages: ChatMessage[],
  opts: CallOptions = {},
  config: AIConfig = loadAIConfig(),
): Promise<string> {
  const provider = resolveWorkingProvider(config);
  const key = config.keys[provider]?.trim();
  if (!key) throw new MissingAIKeyError(provider);
  const model = getActiveModel(config, provider);
  switch (provider) {
    case 'openrouter': return callOpenRouter(key, model, messages, opts);
    case 'groq': return callGroq(key, model, messages, opts);
    case 'openai': return callOpenAI(key, model, messages, opts);
    case 'anthropic': return callAnthropic(key, model, messages, opts);
    case 'gemini': return callGemini(key, model, messages, opts);
  }
}

export async function testAIConnection(config: AIConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const reply = await callUnifiedAI(
      [{ role: 'user', content: 'Balas singkat dengan kata: OK' }],
      { maxTokens: 20, temperature: 0 },
      config,
    );
    return { ok: true, message: `Terhubung (${getActiveModel(config)}): ${reply.trim().slice(0, 40)}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Gagal terhubung' };
  }
}

/** Ekstrak objek JSON dari teks model (toleran terhadap code fence, teks tambahan, atau JSON yang terpotong). */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      // lanjut ke ekstraksi parsial di bawah
    }
  }

  // Toleran jika JSON terpotong di tengah stream (misal terpotong di delegations/actions)
  if (start >= 0) {
    const replyMatch = candidate.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*?)(?:"|,|\n|$)/s);
    if (replyMatch && replyMatch[1]) {
      let cleanReply = replyMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim();
      return { reply: cleanReply } as T;
    }
  }

  return null;
}

/**
 * Membersihkan teks respons bila masih mengandung fragmen JSON mentah seperti:
 * { "reply": "...", atau "delegations": [ ...
 * agar antarmuka chat selalu menampilkan narasi manusia yang bersih dan luwes.
 */
export function cleanRawAssistantReply(raw: string): string {
  if (!raw) return 'Siap Pak/Bu Owner, saya sudah cek kondisi proyek Anda.';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.includes('"reply"')) {
    const m = trimmed.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*?)(?:"|\s*,\s*"delegations"|\s*,\s*"actions"|\s*,\s*"followUps"|$)/s);
    if (m && m[1]) {
      return m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim();
    }
    // Jika format JSON sangat hancur, buang semua tanda kurung kurawal & properti JSON
    return trimmed
      .replace(/\{[\s\S]*?"reply"\s*:\s*"/i, '')
      .replace(/"\s*,\s*"delegations"[\s\S]*/i, '')
      .replace(/"\s*,\s*"actions"[\s\S]*/i, '')
      .replace(/[{}\[\]"]/g, '')
      .trim();
  }
  return trimmed;
}

