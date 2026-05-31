/** Resolve Gemini API key: user key first, then platform key with daily fallback quota. */

export type GeminiKeySource = "user" | "platform" | "none";

export interface GeminiResolveResult {
  apiKey: string;
  source: GeminiKeySource;
  usageDate: string;
  platformFallbackUsed: number;
  platformFallbackLimit: number;
  userDailyUsed: number;
  userDailyLimit: number;
}

function getTodayWib(): string {
  const nowUtc = new Date();
  const wib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function defaultLimitByPlan(planType: string): number {
  if (planType === "lifetime") return 50;
  if (planType === "monthly") return 20;
  return 5;
}

export async function getPlatformFallbackLimit(adminClient: {
  from: (t: string) => { select: (c: string) => { eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> } } };
}): Promise<number> {
  const envLimit = Number(Deno.env.get("PLATFORM_GEMINI_DAILY_FALLBACK") || 0);
  if (envLimit > 0) return envLimit;

  const { data: cfg } = await adminClient
    .from("app_config")
    .select("platform_settings")
    .eq("id", "global")
    .maybeSingle();

  const ps = (cfg as { platform_settings?: Record<string, unknown> } | null)?.platform_settings || {};
  const fromDb = Number(ps.platform_gemini_daily_fallback);
  return fromDb > 0 ? fromDb : 10;
}

export async function resolveGeminiForUser(
  adminClient: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          maybeSingle: () => Promise<{ data: unknown }>;
        };
      };
    };
  },
  userId: string,
): Promise<GeminiResolveResult> {
  const usageDate = getTodayWib();
  const empty: GeminiResolveResult = {
    apiKey: "",
    source: "none",
    usageDate,
    platformFallbackUsed: 0,
    platformFallbackLimit: 0,
    userDailyUsed: 0,
    userDailyLimit: 0,
  };

  const { data: prof } = await adminClient
    .from("profiles")
    .select("gemini_key, settings, status")
    .eq("id", userId)
    .maybeSingle();

  const profile = prof as {
    gemini_key?: string;
    settings?: { gemini_key?: string };
    status?: string;
  } | null;

  if (profile?.status === "suspended") {
    return { ...empty, source: "none" };
  }

  const userKey = String(
    profile?.gemini_key || profile?.settings?.gemini_key || "",
  ).trim();

  const { data: planRow } = await adminClient
    .from("user_plans")
    .select("plan_type, ai_daily_limit")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = planRow as { plan_type?: string; ai_daily_limit?: number } | null;
  const planType = String(plan?.plan_type || "none");
  const userDailyLimit =
    typeof plan?.ai_daily_limit === "number"
      ? plan.ai_daily_limit
      : defaultLimitByPlan(planType);

  const { data: usageRow } = await adminClient
    .from("ai_usage")
    .select("requests_count, platform_fallback_count")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  const usage = usageRow as {
    requests_count?: number;
    platform_fallback_count?: number;
  } | null;

  const userDailyUsed = Number(usage?.requests_count || 0);
  const platformFallbackUsed = Number(usage?.platform_fallback_count || 0);
  const platformFallbackLimit = await getPlatformFallbackLimit(adminClient);

  if (userKey) {
    return {
      apiKey: userKey,
      source: "user",
      usageDate,
      platformFallbackUsed,
      platformFallbackLimit,
      userDailyUsed,
      userDailyLimit,
    };
  }

  const platformKey = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  if (!platformKey) {
    return {
      ...empty,
      platformFallbackLimit,
      userDailyUsed,
      userDailyLimit,
    };
  }

  if (platformFallbackUsed >= platformFallbackLimit) {
    return {
      apiKey: "",
      source: "none",
      usageDate,
      platformFallbackUsed,
      platformFallbackLimit,
      userDailyUsed,
      userDailyLimit,
    };
  }

  return {
    apiKey: platformKey,
    source: "platform",
    usageDate,
    platformFallbackUsed,
    platformFallbackLimit,
    userDailyUsed,
    userDailyLimit,
  };
}

export async function recordGeminiUsage(
  adminClient: {
    from: (t: string) => {
      upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
    };
  },
  userId: string,
  usageDate: string,
  source: GeminiKeySource,
  current: { requests_count: number; platform_fallback_count: number },
) {
  const nextRequests = current.requests_count + 1;
  const nextFallback =
    source === "platform"
      ? current.platform_fallback_count + 1
      : current.platform_fallback_count;

  await adminClient.from("ai_usage").upsert(
    {
      user_id: userId,
      usage_date: usageDate,
      requests_count: nextRequests,
      platform_fallback_count: nextFallback,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_date" },
  );
}

export async function callGeminiGenerate(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model = "gemini-2.0-flash",
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
    }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${txt.slice(0, 400)}`);

  const obj = JSON.parse(txt);
  return String(obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}
