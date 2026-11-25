import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

function maskSecret(token?: string | null): string {
  const val = String(token || "").trim();
  if (!val) return "";
  if (val.length <= 10) return "••••••••";
  return `${val.slice(0, 6)}••••${val.slice(-4)}`;
}

/**
 * GET /api/engine/config
 * Mengambil konfigurasi Winning Engine, token Meta, dan OpenRouter dari Supabase Cloud Database.
 * Menjamin multi-device sync (laptop, HP, tablet) tanpa bergantung pada browser localStorage.
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    const includeFullSecrets =
      req.nextUrl.searchParams.get("full") === "1" ||
      req.headers.get("x-admin-config") === "1";

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("winning_engine_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: true, config: null });
    }

    const fmtToken = (raw?: string | null) =>
      includeFullSecrets ? String(raw || "") : maskSecret(raw);

    const adv = (data.advanced_params && typeof data.advanced_params === "object" && !Array.isArray(data.advanced_params)
      ? data.advanced_params
      : {}) as Record<string, unknown>;

    const rawStoredAccounts = Array.isArray(adv.metaAccounts) ? adv.metaAccounts : [];
    const normalizedAccounts = [0, 1].map((idx) => {
      const slotId = `meta_${idx + 1}`;
      const existing = rawStoredAccounts[idx] as Record<string, unknown> | undefined;
      if (existing && typeof existing === "object") {
        return {
          id: String(existing.id || slotId),
          label: String(existing.label || (idx === 0 ? "Akun Meta 1 (Utama)" : "Akun Meta 2 (Baru)")),
          adAccountId: String(existing.adAccountId || (idx === 0 ? data.ad_account_id || "" : "")),
          pixelId: String(existing.pixelId || (idx === 0 ? data.meta_pixel_id || "1530674178146899" : "")),
          metaAccessToken: fmtToken(String(existing.metaAccessToken || (idx === 0 ? data.meta_access_token || "" : ""))),
          capiAccessToken: fmtToken(String(existing.capiAccessToken || (idx === 0 ? data.meta_capi_token || "" : ""))),
        };
      }
      return idx === 0
        ? {
            id: "meta_1",
            label: "Akun Meta 1 (Utama)",
            adAccountId: data.ad_account_id || "",
            pixelId: data.meta_pixel_id || "1530674178146899",
            metaAccessToken: fmtToken(data.meta_access_token),
            capiAccessToken: fmtToken(data.meta_capi_token),
          }
        : {
            id: "meta_2",
            label: "Akun Meta 2 (Baru)",
            adAccountId: "",
            pixelId: "",
            metaAccessToken: "",
            capiAccessToken: "",
          };
    });
    const activeMetaAccountId = String(adv.activeMetaAccountId || "meta_1");

    return NextResponse.json({
      ok: true,
      config: {
        mode: data.mode || "cuan",
        adAccountId: data.ad_account_id || "",
        minDailyBudget: Number(data.min_daily_budget || 100000),
        maxDailyBudget: Number(data.max_daily_budget || 1000000),
        approvedDailyCeiling: Number(data.approved_daily_ceiling || 1000000),
        monthlySpendCap: Number(data.monthly_spend_cap || 30000000),
        targetCpa: Number(data.target_cpa || 45000),
        targetRoas: Number(data.target_roas || 3.0),
        maxScalePctPerStep: Number(data.max_scale_pct || 20),
        scaleCooldownHours: Number(data.scale_cooldown_hours || 48),
        killSwitch: Boolean(data.kill_switch),
        autonomous: data.autonomous !== false,
        budgetUnitVerified: Boolean(data.budget_unit_verified),
        advanceMasterPlanApproved: Boolean(data.advance_master_plan_approved),
        analysisWindowDays: Number(adv.analysisWindowDays || 14),
        minPurchasesToScale: Number(adv.minPurchasesToScale || 5),
        learningMinAgeDays: Number(adv.learningMinAgeDays || 7),
        learningMinOptimizationEvents: Number(adv.learningMinOptimizationEvents || 50),
        learningHardStopSpend: Number(adv.learningHardStopSpend || 135000),
        minLinkClicksToJudge: Number(adv.minLinkClicksToJudge || 100),
        breakEvenCpa: Number(adv.breakEvenCpa ?? 0),
        contributionMarginPct: Number(adv.contributionMarginPct || 90),
        killMaxMultipleOfTarget: Number(adv.killMaxMultipleOfTarget || 2.5),
        winProbabilityToScale: Number(adv.winProbabilityToScale || 0.8),
        lossProbabilityToPause: Number(adv.lossProbabilityToPause || 0.9),
        priorStrengthClicks: Number(adv.priorStrengthClicks || 40),
        metaAccessToken: fmtToken(data.meta_access_token),
        metaCapiToken: fmtToken(data.meta_capi_token),
        metaPixelId: data.meta_pixel_id || "1530674178146899",
        activeMetaAccountId,
        metaAccounts: normalizedAccounts,
        openRouterApiKey: fmtToken(data.openrouter_api_key),
        strategistModel: data.strategist_model || "anthropic/claude-3.5-sonnet",
        processorModel: data.openrouter_processor_model || "openai/gpt-6-luna-pro",
        technicalModel: data.technical_model || "openai/gpt-6-luna-pro",
        whatsappAdminPhone: data.whatsapp_admin_phone || "",
        whatsappApiKey: fmtToken(data.whatsapp_api_key),
        telegramBotToken: fmtToken(data.telegram_bot_token),
        telegramChatId: data.telegram_chat_id || "",
        updatedAt: data.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal mengambil konfigurasi dari database cloud." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/engine/config
 * Menyimpan token Meta, OpenRouter key, dan setting Winning Engine langsung ke Supabase Cloud.
 */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();

    const payload: Record<string, any> = {
      id: "default",
      updated_at: new Date().toISOString(),
    };

    if (body.mode !== undefined) payload.mode = body.mode;
    if (body.adAccountId !== undefined) payload.ad_account_id = String(body.adAccountId).trim();
    if (body.minDailyBudget !== undefined) payload.min_daily_budget = Number(body.minDailyBudget);
    if (body.maxDailyBudget !== undefined) payload.max_daily_budget = Number(body.maxDailyBudget);
    if (body.approvedDailyCeiling !== undefined) payload.approved_daily_ceiling = Number(body.approvedDailyCeiling);
    if (body.monthlySpendCap !== undefined) payload.monthly_spend_cap = Number(body.monthlySpendCap);
    if (body.targetCpa !== undefined) payload.target_cpa = Number(body.targetCpa);
    if (body.targetRoas !== undefined) payload.target_roas = Number(body.targetRoas);
    if (body.maxScalePctPerStep !== undefined) payload.max_scale_pct = Number(body.maxScalePctPerStep);
    if (body.scaleCooldownHours !== undefined) payload.scale_cooldown_hours = Number(body.scaleCooldownHours);
    if (body.autonomous !== undefined) payload.autonomous = Boolean(body.autonomous);
    if (body.killSwitch !== undefined) payload.kill_switch = Boolean(body.killSwitch);
    if (body.budgetUnitVerified !== undefined) payload.budget_unit_verified = Boolean(body.budgetUnitVerified);
    if (body.advanceMasterPlanApproved !== undefined) payload.advance_master_plan_approved = Boolean(body.advanceMasterPlanApproved);

    const advKeys = [
      "analysisWindowDays", "minPurchasesToScale", "learningMinAgeDays", "learningMinOptimizationEvents",
      "learningHardStopSpend", "minLinkClicksToJudge", "breakEvenCpa", "contributionMarginPct",
      "killMaxMultipleOfTarget", "winProbabilityToScale", "lossProbabilityToPause", "priorStrengthClicks",
    ];
    const isUnmasked = (v: unknown) => typeof v === "string" && !v.includes("••••");
    const hasMetaAccountsUpdate = Array.isArray(body.metaAccounts) || body.activeMetaAccountId !== undefined;
    if (advKeys.some((k) => body[k] !== undefined) || hasMetaAccountsUpdate) {
      const { data: existing } = await supabase
        .from("winning_engine_config")
        .select("advanced_params, ad_account_id, meta_pixel_id, meta_access_token, meta_capi_token")
        .eq("id", "default")
        .maybeSingle();
      const existingAdv =
        existing?.advanced_params && typeof existing.advanced_params === "object" && !Array.isArray(existing.advanced_params)
          ? (existing.advanced_params as Record<string, any>)
          : {};
      const mergedAdv: Record<string, any> = { ...existingAdv };

      for (const k of advKeys) {
        if (body[k] !== undefined) {
          const val = Number(body[k]);
          if (Number.isFinite(val)) mergedAdv[k] = val;
        }
      }

      if (body.activeMetaAccountId !== undefined) {
        mergedAdv.activeMetaAccountId = String(body.activeMetaAccountId || "meta_1");
      }

      if (Array.isArray(body.metaAccounts)) {
        const prevAccounts: any[] = Array.isArray(existingAdv.metaAccounts) ? existingAdv.metaAccounts : [];
        mergedAdv.metaAccounts = body.metaAccounts.slice(0, 2).map((acc: any, idx: number) => {
          const id = String(acc?.id || `meta_${idx + 1}`);
          const prev = prevAccounts.find((p) => p?.id === id) || prevAccounts[idx] || {};
          const fallbackAccess = idx === 0 ? existing?.meta_access_token || "" : "";
          const fallbackCapi = idx === 0 ? existing?.meta_capi_token || "" : "";

          const metaAccessToken =
            acc?.metaAccessToken === undefined
              ? String(prev.metaAccessToken || fallbackAccess)
              : isUnmasked(acc.metaAccessToken)
              ? String(acc.metaAccessToken).trim()
              : String(prev.metaAccessToken || fallbackAccess);

          const capiAccessToken =
            acc?.capiAccessToken === undefined
              ? String(prev.capiAccessToken || fallbackCapi)
              : isUnmasked(acc.capiAccessToken)
              ? String(acc.capiAccessToken).trim()
              : String(prev.capiAccessToken || fallbackCapi);

          return {
            id,
            label: String(acc?.label || prev.label || (idx === 0 ? "Akun Meta 1 (Utama)" : "Akun Meta 2 (Baru)")).trim(),
            adAccountId: String(acc?.adAccountId ?? prev.adAccountId ?? "").trim(),
            pixelId: String(acc?.pixelId ?? prev.pixelId ?? "").trim(),
            metaAccessToken,
            capiAccessToken,
          };
        });

        const activeId = String(mergedAdv.activeMetaAccountId || "meta_1");
        const activeAcc = mergedAdv.metaAccounts.find((a: any) => a.id === activeId) || mergedAdv.metaAccounts[0];
        if (activeAcc) {
          payload.ad_account_id = activeAcc.adAccountId;
          payload.meta_pixel_id = activeAcc.pixelId || "1530674178146899";
          if (activeAcc.metaAccessToken) payload.meta_access_token = activeAcc.metaAccessToken;
          if (activeAcc.capiAccessToken) payload.meta_capi_token = activeAcc.capiAccessToken;
        }
      }

      payload.advanced_params = mergedAdv;
    }

    // Kredensial Meta & OpenRouter Cloud (Abaikan nilai ter-masking ••••)
    if (isUnmasked(body.metaAccessToken)) payload.meta_access_token = String(body.metaAccessToken).trim();
    if (isUnmasked(body.metaCapiToken)) payload.meta_capi_token = String(body.metaCapiToken).trim();
    if (body.metaPixelId !== undefined) payload.meta_pixel_id = String(body.metaPixelId).trim();
    if (isUnmasked(body.openRouterApiKey)) payload.openrouter_api_key = String(body.openRouterApiKey).trim();
    if (body.strategistModel !== undefined) payload.strategist_model = String(body.strategistModel).trim();
    if (body.processorModel !== undefined) payload.openrouter_processor_model = String(body.processorModel).trim();
    if (body.technicalModel !== undefined) payload.technical_model = String(body.technicalModel).trim();
    if (body.whatsappAdminPhone !== undefined) payload.whatsapp_admin_phone = String(body.whatsappAdminPhone).trim();
    if (isUnmasked(body.whatsappApiKey)) payload.whatsapp_api_key = String(body.whatsappApiKey).trim();
    if (isUnmasked(body.telegramBotToken)) payload.telegram_bot_token = String(body.telegramBotToken).trim();
    if (body.telegramChatId !== undefined) payload.telegram_chat_id = String(body.telegramChatId).trim();

    const { data, error } = await supabase
      .from("winning_engine_config")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Konfigurasi Meta & OpenRouter berhasil disimpan permanen ke Supabase Cloud Database.",
      savedConfig: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal menyimpan konfigurasi ke database cloud." },
      { status: 500 }
    );
  }
}

