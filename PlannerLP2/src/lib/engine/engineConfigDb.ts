import { getServiceClient } from "@/lib/engine/engineDb";
import { resolvePolicy, type AutonomyPolicy } from "@/lib/engine/autonomyPolicy";

/**
 * Konfigurasi dari database. Untuk bidang keamanan (kill switch, otonomi, plafon, verifikasi satuan),
 * database adalah sumber kebenaran: body request tidak boleh melonggarkannya.
 */
export interface DbEngineSettings {
  overrides: Record<string, unknown>;
  policy: AutonomyPolicy;
  intervalMin: number;
  openRouterApiKey: string;
  metaTokenPresent: boolean;
  found: boolean;
}

export async function loadDbEngineSettings(): Promise<DbEngineSettings> {
  const empty: DbEngineSettings = {
    overrides: {},
    policy: resolvePolicy(null),
    intervalMin: 30,
    openRouterApiKey: "",
    metaTokenPresent: Boolean(process.env.META_ACCESS_TOKEN),
    found: false,
  };
  try {
    const { data } = await getServiceClient().from("winning_engine_config").select("*").eq("id", "default").maybeSingle();
    if (!data) return empty;
    const o: Record<string, unknown> = {
      killSwitch: Boolean(data.kill_switch),
      budgetUnitVerified: Boolean(data.budget_unit_verified),
      advanceMasterPlanApproved: Boolean(data.advance_master_plan_approved),
    };
    if (data.autonomous !== null && data.autonomous !== undefined) o.autonomous = Boolean(data.autonomous);
    const num = (k: string, v: unknown) => {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) o[k] = n;
    };
    num("minDailyBudget", data.min_daily_budget);
    num("maxDailyBudget", data.max_daily_budget);
    num("approvedDailyCeiling", data.approved_daily_ceiling);
    num("monthlySpendCap", data.monthly_spend_cap);
    num("targetCpa", data.target_cpa);
    num("targetRoas", data.target_roas);
    num("maxScalePctPerStep", data.max_scale_pct);
    num("scaleCooldownHours", data.scale_cooldown_hours);
    if (data.mode === "cuan" || data.mode === "advance") o.mode = data.mode;
    return {
      overrides: o,
      policy: resolvePolicy(data.autonomy_policy),
      intervalMin: Number(data.tick_interval_minutes) > 0 ? Number(data.tick_interval_minutes) : 30,
      openRouterApiKey: String(data.openrouter_api_key || ""),
      metaTokenPresent: Boolean(data.meta_access_token || process.env.META_ACCESS_TOKEN),
      found: true,
    };
  } catch {
    return empty;
  }
}

