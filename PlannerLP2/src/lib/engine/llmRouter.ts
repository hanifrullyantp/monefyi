/**
 * Multi-LLM Task Router untuk Monefyi Winning Engine.
 *
 * 3-Tier Model Architecture via OpenRouter (atau Direct Key):
 * 1. "strategist" -> Anthropic Claude 3.5 Sonnet / 3.7 Sonnet:
 *    Khusus Analisa Mendalam, Perencanaan Winning, Evaluasi Offer & Copywriting LP.
 * 2. "processor"  -> Luna 6 Pro / OpenAI Luna:
 *    Prapemrosesan & Filter Data Massal, Analisis Visual & Tren Real-time.
 * 3. "technical"  -> Google Gemini 2.5 Flash / Gemini Pro:
 *    Komunikasi interaktif chat dengan user, pembacaan metrik rutin, dan tugas cepat.
 */

export type LlmProviderType = "openrouter" | "gemini" | "claude" | "openai" | "groq";
export type LlmTaskRole = "strategist" | "processor" | "technical";

export interface LlmSlotConfig {
  provider: LlmProviderType;
  apiKey?: string;
  model?: string;
}

export interface MultiLlmRoutingConfig {
  openRouterApiKey?: string;
  strategist: LlmSlotConfig;
  processor?: LlmSlotConfig;
  technical: LlmSlotConfig;
}

export interface LlmCallInput {
  role: LlmTaskRole;
  systemPrompt: string;
  userPrompt: string;
  routing?: Partial<MultiLlmRoutingConfig>;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCallOutput {
  ok: boolean;
  text: string;
  providerUsed: string;
  modelUsed: string;
  role: LlmTaskRole;
  error?: string;
}

export const DEFAULT_ROUTING_CONFIG: MultiLlmRoutingConfig = {
  openRouterApiKey: "",
  strategist: {
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
  },
  processor: {
    provider: "openrouter",
    model: "openai/gpt-5.6-luna",
  },
  technical: {
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
  },
};

function resolveEnvKey(provider: LlmProviderType): string {
  switch (provider) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || "";
    case "gemini":
      return (
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        ""
      );
    case "claude":
      return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
    case "openai":
      return process.env.OPENAI_API_KEY || "";
    case "groq":
      return process.env.GROQ_API_KEY || "";
    default:
      return "";
  }
}

async function callSingleProvider(
  slot: LlmSlotConfig,
  role: LlmTaskRole,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  sharedOpenRouterKey?: string
): Promise<LlmCallOutput> {
  const provider = slot.provider;
  // Jika provider openrouter, utamakan openRouterApiKey bersama
  const apiKey = (
    provider === "openrouter"
      ? slot.apiKey || sharedOpenRouterKey || resolveEnvKey("openrouter")
      : slot.apiKey || resolveEnvKey(provider)
  ).trim();

  const model = slot.model?.trim() || (
    role === "strategist"
      ? "anthropic/claude-3.5-sonnet"
      : role === "processor"
      ? "openai/gpt-5.6-luna"
      : "google/gemini-2.5-flash"
  );

  if (!apiKey) {
    return {
      ok: false,
      text: "",
      providerUsed: provider,
      modelUsed: model,
      role,
      error: `API Key untuk provider ${provider.toUpperCase()} (${role}) belum diatur. Masukkan OpenRouter API Key Anda di menu Rules & AI Key.`,
    };
  }

  try {
    if (provider === "openrouter" || provider === "openai" || provider === "groq") {
      const endpoint =
        provider === "openrouter"
          ? "https://openrouter.ai/api/v1/chat/completions"
          : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(provider === "openrouter"
            ? {
                "HTTP-Referer": "https://monefyi.com",
                "X-Title": "Monefyi Winning Engine",
              }
            : {}),
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      const data = await res.json().catch(() => ({}));
      const text = data?.choices?.[0]?.message?.content || "";
      if (res.ok && text) {
        return {
          ok: true,
          text: String(text),
          providerUsed: `OpenRouter (${model})`,
          modelUsed: model,
          role,
        };
      }

      // Bila model Claude 3.5 Sonnet di OpenRouter terkena rate-limit / overload, coba fallback ke Claude 3.7
      if (!res.ok && model.includes("claude-3.5-sonnet")) {
        const altModel = "anthropic/claude-3.7-sonnet";
        const resAlt = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: altModel,
            temperature,
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });
        const dataAlt = await resAlt.json().catch(() => ({}));
        const textAlt = dataAlt?.choices?.[0]?.message?.content || "";
        if (resAlt.ok && textAlt) {
          return {
            ok: true,
            text: String(textAlt),
            providerUsed: `OpenRouter (${altModel})`,
            modelUsed: altModel,
            role,
          };
        }
      }

      return {
        ok: false,
        text: "",
        providerUsed: provider.toUpperCase(),
        modelUsed: model,
        role,
        error: data?.error?.message || `Gagal memanggil API ${provider.toUpperCase()}.`,
      };
    }

    if (provider === "gemini") {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model.replace(/^google\//, "")
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });

      const data = await res.json().catch(() => ({}));
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (res.ok && text) {
        return {
          ok: true,
          text: String(text),
          providerUsed: "Google Gemini Direct",
          modelUsed: model,
          role,
        };
      }

      return {
        ok: false,
        text: "",
        providerUsed: "Google Gemini",
        modelUsed: model,
        role,
        error: data?.error?.message || "Gagal memanggil Google Gemini API.",
      };
    }

    if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.content?.[0]?.text) {
        return {
          ok: true,
          text: String(data.content[0].text),
          providerUsed: "Anthropic Claude Direct",
          modelUsed: model,
          role,
        };
      }
      return {
        ok: false,
        text: "",
        providerUsed: "Anthropic Claude",
        modelUsed: model,
        role,
        error: data?.error?.message || "Gagal memanggil Anthropic Claude API.",
      };
    }

    return {
      ok: false,
      text: "",
      providerUsed: provider,
      modelUsed: model,
      role,
      error: `Provider ${provider} tidak dikenali.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      text: "",
      providerUsed: provider.toUpperCase(),
      modelUsed: model,
      role,
      error: err?.message || "Network error contacting LLM API",
    };
  }
}

/**
 * Menjalankan LLM dengan model routing 3-peran (Strategist Sonnet, Processor Luna, Technical Gemini)
 * melalui 1 OpenRouter API Key.
 */
export async function runRoutedLlm(input: LlmCallInput): Promise<LlmCallOutput> {
  const temperature = input.temperature ?? (input.role === "strategist" ? 0.35 : 0.2);
  const maxTokens = input.maxTokens ?? (input.role === "strategist" ? 2800 : 1200);

  const sharedOpenRouterKey = (
    input.routing?.openRouterApiKey ||
    process.env.OPENROUTER_API_KEY ||
    ""
  ).trim();

  const strategistSlot: LlmSlotConfig = input.routing?.strategist || {
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet",
  };
  const processorSlot: LlmSlotConfig = input.routing?.processor || {
    provider: "openrouter",
    model: "openai/gpt-5.6-luna",
  };
  const technicalSlot: LlmSlotConfig = input.routing?.technical || {
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
  };

  const targetSlot =
    input.role === "strategist"
      ? strategistSlot
      : input.role === "processor"
      ? processorSlot
      : technicalSlot;

  // Jalankan slot target
  const result = await callSingleProvider(
    targetSlot,
    input.role,
    input.systemPrompt,
    input.userPrompt,
    temperature,
    maxTokens,
    sharedOpenRouterKey
  );

  if (result.ok) return result;

  // Jika gagal dan slot lain memiliki provider openrouter dengan key yang sama, fallback otomatis
  if (sharedOpenRouterKey && targetSlot.provider === "openrouter") {
    const fallbackModel =
      input.role === "strategist"
        ? "anthropic/claude-3.7-sonnet"
        : input.role === "processor"
        ? "google/gemini-2.5-flash"
        : "openai/gpt-5.6-luna";

    const fbSlot: LlmSlotConfig = {
      provider: "openrouter",
      model: fallbackModel,
      apiKey: sharedOpenRouterKey,
    };

    const fbResult = await callSingleProvider(
      fbSlot,
      input.role,
      input.systemPrompt,
      input.userPrompt,
      temperature,
      maxTokens,
      sharedOpenRouterKey
    );

    if (fbResult.ok) return fbResult;
  }

  return result;
}
