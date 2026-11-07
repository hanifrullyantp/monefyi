/**
 * Multi-LLM Task Router untuk Monefyi Winning Engine.
 *
 * Memisahkan tugas menjadi 2 peran (Role) yang bisa di-switch dengan mudah oleh user:
 * 1. "strategist" -> Untuk analisa mendalam 5 Pilar (Offer, Copywriting Landing Page,
 *    Strategi Funnel Checkout, dan Perencanaan Winning Campaign). Default direkomendasikan: Claude / OpenRouter Claude.
 * 2. "technical"  -> Untuk pembacaan metrik cepat, skoring rutin, klasifikasi data,
 *    dan ringkasan teknis hemat biaya. Default direkomendasikan: Gemini 2.5 Flash / DeepSeek / Groq.
 */

export type LlmProviderType = "claude" | "gemini" | "openrouter" | "openai" | "groq";
export type LlmTaskRole = "strategist" | "technical";

export interface LlmSlotConfig {
  provider: LlmProviderType;
  apiKey?: string;
  model?: string;
}

export interface MultiLlmRoutingConfig {
  strategist: LlmSlotConfig;
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

const DEFAULT_MODELS: Record<LlmProviderType, { strategist: string; technical: string }> = {
  claude: {
    strategist: "claude-3-7-sonnet-latest",
    technical: "claude-3-5-haiku-latest",
  },
  gemini: {
    strategist: "gemini-2.5-pro",
    technical: "gemini-2.5-flash",
  },
  openrouter: {
    strategist: "anthropic/claude-3.7-sonnet",
    technical: "google/gemini-2.5-flash",
  },
  openai: {
    strategist: "gpt-4o",
    technical: "gpt-4o-mini",
  },
  groq: {
    strategist: "llama-3.3-70b-versatile",
    technical: "llama-3.3-70b-versatile",
  },
};

function resolveEnvKey(provider: LlmProviderType): string {
  switch (provider) {
    case "claude":
      return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
    case "gemini":
      return (
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        ""
      );
    case "openrouter":
      return process.env.OPENROUTER_API_KEY || "";
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
  maxTokens: number
): Promise<LlmCallOutput> {
  const provider = slot.provider;
  const apiKey = (slot.apiKey || resolveEnvKey(provider) || "").trim();
  const model =
    slot.model?.trim() ||
    DEFAULT_MODELS[provider]?.[role] ||
    DEFAULT_MODELS.gemini.technical;

  if (!apiKey) {
    return {
      ok: false,
      text: "",
      providerUsed: provider,
      modelUsed: model,
      role,
      error: `API Key untuk provider ${provider.toUpperCase()} (${role}) belum diatur.`,
    };
  }

  try {
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
          providerUsed: "Anthropic Claude",
          modelUsed: model,
          role,
        };
      }
      // Fallback ke claude-3-5-sonnet-latest bila claude-3-7 belum aktif di akun user
      if (!res.ok && model.includes("3-7")) {
        const fallbackModel = "claude-3-5-sonnet-latest";
        const res2 = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: fallbackModel,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok && data2?.content?.[0]?.text) {
          return {
            ok: true,
            text: String(data2.content[0].text),
            providerUsed: "Anthropic Claude",
            modelUsed: fallbackModel,
            role,
          };
        }
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

    if (provider === "gemini") {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
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
          providerUsed: "Google Gemini",
          modelUsed: model,
          role,
        };
      }
      // Fallback ke gemini-2.5-flash jika pro terkena limit kuota
      if (!res.ok && model !== "gemini-2.5-flash") {
        const fbUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;
        const res2 = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        });
        const data2 = await res2.json().catch(() => ({}));
        const text2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (res2.ok && text2) {
          return {
            ok: true,
            text: String(text2),
            providerUsed: "Google Gemini",
            modelUsed: "gemini-2.5-flash",
            role,
          };
        }
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

    // OpenRouter / OpenAI / Groq (OpenAI-compatible endpoint)
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
        providerUsed: provider.toUpperCase(),
        modelUsed: model,
        role,
      };
    }
    return {
      ok: false,
      text: "",
      providerUsed: provider.toUpperCase(),
      modelUsed: model,
      role,
      error: data?.error?.message || `Gagal memanggil ${provider.toUpperCase()} API.`,
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
 * Menjalankan LLM sesuai role tugas ("strategist" vs "technical") dengan fallback otomatis
 * ke slot sebelahnya jika slot utama kehabisan kredit atau belum diisi key-nya.
 */
export async function runRoutedLlm(input: LlmCallInput): Promise<LlmCallOutput> {
  const temperature = input.temperature ?? (input.role === "strategist" ? 0.35 : 0.2);
  const maxTokens = input.maxTokens ?? (input.role === "strategist" ? 2600 : 1200);

  const strategistSlot: LlmSlotConfig = input.routing?.strategist || {
    provider: "claude",
    model: "claude-3-7-sonnet-latest",
  };
  const technicalSlot: LlmSlotConfig = input.routing?.technical || {
    provider: "gemini",
    model: "gemini-2.5-flash",
  };

  const primarySlot = input.role === "strategist" ? strategistSlot : technicalSlot;
  const secondarySlot = input.role === "strategist" ? technicalSlot : strategistSlot;

  // 1. Coba slot utama sesuai role
  const primaryResult = await callSingleProvider(
    primarySlot,
    input.role,
    input.systemPrompt,
    input.userPrompt,
    temperature,
    maxTokens
  );
  if (primaryResult.ok) return primaryResult;

  // 2. Fallback otomatis ke slot pendamping bila slot utama belum memiliki key atau gagal
  const secondaryResult = await callSingleProvider(
    secondarySlot,
    input.role,
    input.systemPrompt,
    input.userPrompt,
    temperature,
    maxTokens
  );
  if (secondaryResult.ok) return secondaryResult;

  return primaryResult;
}

