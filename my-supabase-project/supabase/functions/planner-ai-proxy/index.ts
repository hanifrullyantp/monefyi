import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { openSecret, redactSecrets, sealSecret } from "../_shared/channel/channelGate.ts";
import { handleCorsPreflightRequest, jsonResponse } from "../_shared/cors.ts";

const VALID_PROVIDERS = ["openrouter", "gemini", "groq", "anthropic", "openai"] as const;
type AIProviderId = (typeof VALID_PROVIDERS)[number];

const DEFAULT_MODELS: Record<AIProviderId, string> = {
  openrouter: "google/gemini-2.5-flash",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  anthropic: "claude-3-5-haiku-latest",
  openai: "gpt-4o-mini",
};

const GEMINI_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro"];
const PROVIDER_TIMEOUT_MS = 45_000;

const OPENAI_COMPAT_CONFIGS: Partial<
  Record<AIProviderId, { url: string; extraHeaders?: Record<string, string> }>
> = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    extraHeaders: {
      "HTTP-Referer": "https://froyek.com",
      "X-Title": "Froyek",
    },
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
  },
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class UpstreamProviderError extends Error {
  constructor(
    public readonly upstreamStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamProviderError";
  }
}

function parseProvider(raw: unknown): AIProviderId | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return (VALID_PROVIDERS as readonly string[]).includes(normalized)
    ? (normalized as AIProviderId)
    : null;
}

function maskKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 6) return "••••";
  if (trimmed.length <= 11) return `••••${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-4)}`;
}

function sanitizeError(raw: string, secrets: string[]): string {
  let out = redactSecrets(raw, secrets);
  out = out
    .replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/g, "[rahasia]")
    .replace(/\b(AIza[A-Za-z0-9_-]{8,})\b/g, "[rahasia]")
    .replace(/\b(gsk_[A-Za-z0-9_-]{8,})\b/g, "[rahasia]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, "$1[rahasia]");
  return out.slice(0, 400);
}

function resolveEncryptionKey(): string {
  return (Deno.env.get("AI_SECRET_KEY") ?? Deno.env.get("CHANNEL_SECRET_KEY") ?? "").trim();
}

async function readProviderError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return String(parsed?.error?.message || parsed?.message || text.slice(0, 250) || res.statusText);
  } catch {
    return text.slice(0, 250) || res.statusText;
  }
}

async function callOpenAICompatible(opts: {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
  extraHeaders?: Record<string, string>;
  signal: AbortSignal;
}): Promise<string> {
  const sendReq = (useJsonFormat: boolean) =>
    fetch(opts.url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        ...(opts.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        ...(useJsonFormat ? { response_format: { type: "json_object" } } : {}),
      }),
    });

  let res = await sendReq(opts.jsonMode);
  if (!res.ok && opts.jsonMode && (res.status === 400 || res.status === 422)) {
    res = await sendReq(false);
  }
  if (!res.ok) {
    throw new UpstreamProviderError(res.status, `${res.status}: ${await readProviderError(res)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.length) {
    throw new UpstreamProviderError(502, "Empty response from AI provider");
  }
  return text;
}

async function callAnthropic(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  temperature: number;
  maxTokens: number;
  signal: AbortSignal;
}): Promise<string> {
  // Server-side Anthropic call — never send anthropic-dangerous-direct-browser-access.
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: opts.messages,
      temperature: Math.min(1, Math.max(0, opts.temperature)),
      max_tokens: opts.maxTokens,
    }),
  });
  if (!res.ok) {
    throw new UpstreamProviderError(res.status, `${res.status}: ${await readProviderError(res)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data?.content?.find((c) => c.type === "text")?.text;
  if (typeof text !== "string" || !text.length) {
    throw new UpstreamProviderError(502, "Empty response from Anthropic");
  }
  return text;
}

async function callGeminiOnce(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
  signal: AbortSignal;
}): Promise<string> {
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`,
    {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        ...(opts.systemPrompt ? { systemInstruction: { parts: [{ text: opts.systemPrompt }] } } : {}),
        contents,
        generationConfig: {
          temperature: opts.temperature,
          maxOutputTokens: opts.maxTokens,
          ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    throw new UpstreamProviderError(res.status, `${res.status}: ${await readProviderError(res)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) {
    throw new UpstreamProviderError(502, "Empty response from Gemini");
  }
  return text;
}

function shouldRetryGeminiModel(status: number, msg: string): boolean {
  return status === 503 || status === 404 || /overloaded|unavailable|no longer available|not found/i.test(msg);
}

async function callGemini(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
  signal: AbortSignal;
}): Promise<{ text: string; usedModel: string }> {
  const candidates = [opts.model, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== opts.model)];
  let lastError: unknown = new UpstreamProviderError(502, "Failed to reach Gemini");

  for (const candidate of candidates) {
    try {
      const text = await callGeminiOnce({ ...opts, model: candidate });
      return { text, usedModel: candidate };
    } catch (err) {
      lastError = err;
      if (err instanceof UpstreamProviderError && shouldRetryGeminiModel(err.upstreamStatus, err.message)) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function normalizeMessages(
  rawSystemPrompt: unknown,
  rawMessages: unknown,
): {
  ok: true;
  systemPrompt: string;
  convoMessages: Array<{ role: "user" | "assistant"; content: string }>;
  fullMessages: ChatMessage[];
} | { ok: false; error: string } {
  const systemParts: string[] = [];
  if (typeof rawSystemPrompt === "string" && rawSystemPrompt.trim()) {
    systemParts.push(rawSystemPrompt.trim());
  }

  if (rawMessages !== undefined && !Array.isArray(rawMessages)) {
    return { ok: false, error: "messages must be an array" };
  }

  const convoMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const entry of Array.isArray(rawMessages) ? rawMessages : []) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each message must be an object" };
    }
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (typeof content !== "string") {
      return { ok: false, error: "Each message content must be a string" };
    }
    if (role === "system") {
      if (content.trim()) systemParts.push(content.trim());
    } else if (role === "user" || role === "assistant") {
      convoMessages.push({ role, content });
    } else {
      return { ok: false, error: "Invalid message role" };
    }
  }

  if (convoMessages.length === 0) {
    return { ok: false, error: "At least one user or assistant message is required" };
  }

  const systemPrompt = systemParts.join("\n\n");
  const fullMessages: ChatMessage[] = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...convoMessages,
  ];
  return { ok: true, systemPrompt, convoMessages, fullMessages };
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const secrets: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(req, { error: "Server configuration incomplete" }, 503);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ") || !token) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !authData?.user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const user = authData.user;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(req, { error: "Invalid JSON body" }, 400);
    }

    const payload = body as Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action.trim() : "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (action === "status") {
      const { data: rows, error: selErr } = await admin
        .from("planner_user_ai_secrets")
        .select("provider, key_hint")
        .eq("user_id", user.id);

      if (selErr) {
        console.error("planner-ai-proxy status error:", sanitizeError(selErr.message, secrets));
        return jsonResponse(req, { error: "Failed to load AI key status" }, 500);
      }

      const providers: string[] = [];
      const hints: Record<string, string> = {};
      for (const row of rows ?? []) {
        const provider = parseProvider((row as { provider?: unknown }).provider);
        if (!provider) continue;
        providers.push(provider);
        hints[provider] = String((row as { key_hint?: unknown }).key_hint ?? "");
      }
      return jsonResponse(req, {
        ok: true,
        providers,
        hints,
        configuredProviders: providers,
        keyHints: hints,
      });
    }

    if (action === "set_key") {
      const provider = parseProvider(payload.provider);
      if (!provider) {
        return jsonResponse(req, { error: "Invalid provider" }, 400);
      }

      const rawKey = typeof payload.apiKey === "string"
        ? payload.apiKey
        : typeof payload.api_key === "string"
        ? payload.api_key
        : "";
      const apiKey = rawKey.trim();
      if (apiKey) secrets.push(apiKey);

      if (!apiKey || apiKey.length > 1024) {
        return jsonResponse(req, { error: "Valid non-empty apiKey is required" }, 400);
      }

      const secretKey = resolveEncryptionKey();
      if (!secretKey) {
        return jsonResponse(req, { error: "Server encryption key is not configured" }, 503);
      }
      secrets.push(secretKey);

      const hint = maskKeyHint(apiKey);
      const ciphertext = await sealSecret(apiKey, secretKey);

      const { error: upsertErr } = await admin
        .from("planner_user_ai_secrets")
        .upsert(
          {
            user_id: user.id,
            provider,
            ciphertext,
            key_hint: hint,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider" },
        );

      if (upsertErr) {
        console.error("planner-ai-proxy set_key error:", sanitizeError(upsertErr.message, secrets));
        return jsonResponse(req, { error: "Failed to save encrypted AI key" }, 500);
      }

      return jsonResponse(req, { ok: true, provider, hint });
    }

    if (action === "delete_key") {
      const provider = parseProvider(payload.provider);
      if (!provider) {
        return jsonResponse(req, { error: "Invalid provider" }, 400);
      }

      const { error: delErr } = await admin
        .from("planner_user_ai_secrets")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (delErr) {
        console.error("planner-ai-proxy delete_key error:", sanitizeError(delErr.message, secrets));
        return jsonResponse(req, { error: "Failed to delete AI key" }, 500);
      }

      return jsonResponse(req, { ok: true, provider });
    }

    if (action === "chat") {
      const provider = parseProvider(payload.provider);
      if (!provider) {
        return jsonResponse(req, { error: "Invalid provider" }, 400);
      }

      const secretKey = resolveEncryptionKey();
      if (!secretKey) {
        return jsonResponse(req, { error: "Server encryption key is not configured" }, 503);
      }
      secrets.push(secretKey);

      const normalized = normalizeMessages(payload.systemPrompt, payload.messages);
      if (!normalized.ok) {
        return jsonResponse(req, { error: normalized.error }, 400);
      }

      const rawModel = typeof payload.model === "string" ? payload.model.trim() : "";
      if (rawModel && (rawModel.length > 200 || /[\s?#]/.test(rawModel))) {
        return jsonResponse(req, { error: "Invalid model identifier" }, 400);
      }
      const model = rawModel || DEFAULT_MODELS[provider];

      const rawTemp = typeof payload.temperature === "number" && Number.isFinite(payload.temperature)
        ? payload.temperature
        : 0.35;
      const temperature = Math.min(2, Math.max(0, rawTemp));

      const rawMaxTokens = typeof payload.maxTokens === "number" && Number.isFinite(payload.maxTokens)
        ? Math.floor(payload.maxTokens)
        : 4096;
      const maxTokens = Math.min(16384, Math.max(1, rawMaxTokens));
      const jsonMode = Boolean(payload.json);

      const { data: secretRow, error: selErr } = await admin
        .from("planner_user_ai_secrets")
        .select("ciphertext")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .maybeSingle();

      if (selErr) {
        console.error("planner-ai-proxy lookup error:", sanitizeError(selErr.message, secrets));
        return jsonResponse(req, { error: "Failed to load AI key" }, 500);
      }
      if (!secretRow?.ciphertext) {
        return jsonResponse(req, { error: "API key for this provider is not configured" }, 404);
      }

      let apiKey: string;
      try {
        apiKey = (await openSecret(String(secretRow.ciphertext), secretKey)).trim();
      } catch (decryptErr) {
        const msg = decryptErr instanceof Error ? decryptErr.message : String(decryptErr);
        console.error("planner-ai-proxy decrypt error:", sanitizeError(msg, secrets));
        return jsonResponse(req, { error: "Failed to decrypt stored AI key" }, 500);
      }
      if (!apiKey) {
        return jsonResponse(req, { error: "Stored AI key is empty" }, 500);
      }
      secrets.push(apiKey);

      const ctrl = new AbortController();
      const timerId = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);

      try {
        let text = "";
        let usedModel = model;

        const openAICompat = OPENAI_COMPAT_CONFIGS[provider];
        if (openAICompat) {
          text = await callOpenAICompatible({
            url: openAICompat.url,
            apiKey,
            model,
            messages: normalized.fullMessages,
            temperature,
            maxTokens,
            jsonMode,
            extraHeaders: openAICompat.extraHeaders,
            signal: ctrl.signal,
          });
        } else if (provider === "gemini") {
          const gemRes = await callGemini({
            apiKey,
            model,
            systemPrompt: normalized.systemPrompt,
            messages: normalized.convoMessages,
            temperature,
            maxTokens,
            jsonMode,
            signal: ctrl.signal,
          });
          text = gemRes.text;
          usedModel = gemRes.usedModel;
        } else if (provider === "anthropic") {
          text = await callAnthropic({
            apiKey,
            model,
            systemPrompt: normalized.systemPrompt,
            messages: normalized.convoMessages,
            temperature,
            maxTokens,
            signal: ctrl.signal,
          });
        }

        return jsonResponse(req, { ok: true, text, provider, model: usedModel });
      } finally {
        clearTimeout(timerId);
      }
    }

    return jsonResponse(req, { error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof UpstreamProviderError) {
      const safeMsg = sanitizeError(err.message, secrets);
      console.error("planner-ai-proxy upstream error:", safeMsg);
      const status = err.upstreamStatus === 429
        ? 429
        : err.upstreamStatus >= 400 && err.upstreamStatus < 500 && err.upstreamStatus !== 401 && err.upstreamStatus !== 403
        ? err.upstreamStatus
        : 502;
      return jsonResponse(req, { error: safeMsg, upstream_status: err.upstreamStatus }, status);
    }

    const rawMsg = err instanceof Error ? err.message : "Internal server error";
    const safeMsg = sanitizeError(rawMsg, secrets);
    console.error("planner-ai-proxy error:", safeMsg);
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    return jsonResponse(req, { error: isTimeout ? "AI provider request timed out" : safeMsg }, isTimeout ? 504 : 500);
  }
});
