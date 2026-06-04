/**
 * Multi-provider AI fallback routing for Monefyi Planner.
 *
 * Priority order: Groq (free, fastest) → Gemini → GPT-3.5 → Claude
 * Circuit breakers prevent hammering a failing provider during the same isolate session.
 * Each provider is only included in the loop when its API key is available.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  id: "groq" | "gemini" | "openai" | "anthropic";
  model: string;
  apiKey: string;
  endpoint: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  /** Cost in USD per 1K tokens (prompt + completion combined). 0 = free tier. */
  costPer1K: number;
}

export interface AIParseResult {
  intent: string;
  params: Record<string, unknown>;
  confidence: number;
  explanation?: string;
  usage: { prompt_tokens: number; completion_tokens: number };
  model: string;
  provider_id: string;
}

export interface AIUsageLog {
  provider: string;
  model: string;
  success: boolean;
  response_time_ms: number;
  confidence?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
  error_message?: string;
}

export interface ParseWithAIOptions {
  providers: ProviderConfig[];
  systemPrompt: string;
  userPrompt: string;
  /** Hard ceiling across all provider attempts. Defaults to 15 000 ms. */
  maxTotalMs?: number;
  /** Called after every provider attempt (success or failure). Never throws. */
  onLog?: (log: AIUsageLog) => Promise<void>;
}

export interface ParseWithAIResult {
  parsed: AIParseResult;
  /** Errors from providers that were tried before the successful one. */
  errors: Array<{ provider: string; error: string; time_ms: number }>;
}

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

class CircuitBreaker {
  private failures = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private nextAttemptAt = 0;

  constructor(
    readonly id: string,
    private readonly threshold = 5,
    private readonly windowMs = 60_000,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttemptAt) {
        throw new Error(`Circuit OPEN for ${this.id}`);
      }
      this.state = "HALF_OPEN";
    }
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private reset() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private recordFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      this.nextAttemptAt = Date.now() + this.windowMs;
    }
  }
}

// Persist across warm invocations within the same Deno isolate.
const _breakers = new Map<string, CircuitBreaker>();
function getBreaker(id: string): CircuitBreaker {
  if (!_breakers.has(id)) _breakers.set(id, new CircuitBreaker(id));
  return _breakers.get(id)!;
}

// ---------------------------------------------------------------------------
// Provider HTTP Adapters
// ---------------------------------------------------------------------------

/** OpenAI-compatible endpoint (Groq, OpenAI). */
async function callOpenAICompat(
  p: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<AIParseResult> {
  const res = await fetch(p.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: p.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: p.temperature,
      max_tokens: p.maxTokens,
      response_format: { type: "json_object" },
    }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${p.id} ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };
  return normalise(JSON.parse(data.choices[0].message.content), data.usage, p);
}

/** Google Gemini generateContent. */
async function callGemini(
  p: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<AIParseResult> {
  const url = `${p.endpoint}?key=${encodeURIComponent(p.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      }],
      generationConfig: {
        temperature: p.temperature,
        maxOutputTokens: p.maxTokens,
        responseMimeType: "application/json",
      },
    }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`gemini ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const raw = data.candidates[0].content.parts[0].text;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : {};
  }

  return normalise(obj, {
    prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
    completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  }, p);
}

/** Anthropic Messages API. */
async function callAnthropic(
  p: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<AIParseResult> {
  const res = await fetch(p.endpoint, {
    method: "POST",
    headers: {
      "x-api-key": p.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: p.maxTokens,
      temperature: p.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`anthropic ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json() as {
    content: Array<{ text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(data.content[0].text);
  } catch {
    const m = data.content[0].text.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : {};
  }

  return normalise(obj, {
    prompt_tokens: data.usage.input_tokens,
    completion_tokens: data.usage.output_tokens,
  }, p);
}

/** Normalise any provider's raw JSON object into `AIParseResult`. */
function normalise(
  raw: Record<string, unknown>,
  usage: { prompt_tokens: number; completion_tokens: number },
  p: ProviderConfig,
): AIParseResult {
  return {
    intent: String(raw.intent || "unknown"),
    params: (raw.params as Record<string, unknown>) ?? {},
    confidence: Number(raw.confidence ?? 0.7),
    explanation: raw.explanation as string | undefined,
    usage,
    model: p.model,
    provider_id: p.id,
  };
}

function dispatch(
  p: ProviderConfig,
  sys: string,
  user: string,
  signal: AbortSignal,
): Promise<AIParseResult> {
  switch (p.id) {
    case "groq":
    case "openai":
      return callOpenAICompat(p, sys, user, signal);
    case "gemini":
      return callGemini(p, sys, user, signal);
    case "anthropic":
      return callAnthropic(p, sys, user, signal);
  }
}

// ---------------------------------------------------------------------------
// Main fallback loop
// ---------------------------------------------------------------------------

export async function parseWithAI(opts: ParseWithAIOptions): Promise<ParseWithAIResult> {
  const { providers, systemPrompt, userPrompt, maxTotalMs = 15_000, onLog } = opts;
  const errors: ParseWithAIResult["errors"] = [];
  let totalMs = 0;

  for (const provider of providers) {
    if (totalMs >= maxTotalMs) break;

    const t0 = Date.now();
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), provider.timeout);

    try {
      const result = await getBreaker(provider.id).call(() =>
        dispatch(provider, systemPrompt, userPrompt, ctrl.signal)
      );

      const responseTime = Date.now() - t0;
      const tokens = (result.usage.prompt_tokens + result.usage.completion_tokens) / 1000;
      const costUsd = tokens * provider.costPer1K;

      await onLog?.({
        provider: provider.id,
        model: provider.model,
        success: true,
        response_time_ms: responseTime,
        confidence: result.confidence,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        cost_usd: costUsd,
      })?.catch(() => {});

      return { parsed: result, errors };
    } catch (err) {
      const responseTime = Date.now() - t0;
      totalMs += responseTime;
      const msg = err instanceof Error ? err.message : String(err);

      errors.push({ provider: provider.id, error: msg, time_ms: responseTime });

      await onLog?.({
        provider: provider.id,
        model: provider.model,
        success: false,
        response_time_ms: responseTime,
        error_message: msg.slice(0, 500),
      })?.catch(() => {});
    } finally {
      clearTimeout(tid);
    }
  }

  throw new Error(
    `All AI providers failed (${errors.map(e => `${e.provider}: ${e.error}`).join(" | ")})`,
  );
}

// ---------------------------------------------------------------------------
// Provider config builders  (called by each edge function)
// ---------------------------------------------------------------------------

export interface BuildProvidersOptions {
  geminiKey?: string;
}

/**
 * Returns a sorted provider list populated only with keys that are present.
 * Groq → Gemini → GPT-3.5 → Claude
 */
export function buildProviders(opts: BuildProvidersOptions = {}): ProviderConfig[] {
  const list: ProviderConfig[] = [];

  const groqKey = (Deno.env.get("GROQ_API_KEY") ?? "").trim();
  if (groqKey) {
    list.push({
      id: "groq",
      model: "llama-3.1-70b-versatile",
      apiKey: groqKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      timeout: 5_000,
      maxTokens: 500,
      temperature: 0.3,
      costPer1K: 0,
    });
  }

  const geminiKey = (opts.geminiKey ?? "").trim();
  if (geminiKey) {
    list.push({
      id: "gemini",
      model: "gemini-2.0-flash",
      apiKey: geminiKey,
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      timeout: 5_000,
      maxTokens: 500,
      temperature: 0.3,
      costPer1K: 0,
    });
  }

  const openaiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
  if (openaiKey) {
    list.push({
      id: "openai",
      model: "gpt-3.5-turbo",
      apiKey: openaiKey,
      endpoint: "https://api.openai.com/v1/chat/completions",
      timeout: 3_000,
      maxTokens: 500,
      temperature: 0.3,
      costPer1K: 0.0005,
    });
  }

  const anthropicKey = (Deno.env.get("ANTHROPIC_API_KEY") ?? "").trim();
  if (anthropicKey) {
    list.push({
      id: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      apiKey: anthropicKey,
      endpoint: "https://api.anthropic.com/v1/messages",
      timeout: 2_000,
      maxTokens: 500,
      temperature: 0.3,
      costPer1K: 0.003,
    });
  }

  return list;
}
