import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai GET.", valid_options: [] }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
    }

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }

    const { data: members } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", authData.user.id)
      .eq("status", "active");

    if (!members || members.length === 0) {
      return json({
        code: "pilih_organisasi_di_aplikasi",
        message_id: "pilih_organisasi_di_aplikasi",
        fix_hint: "Pilih organisasi di aplikasi terlebih dahulu.",
        valid_options: [],
      }, 409);
    }

    // Ambil health status untuk setiap organisasi anggota
    const orgHealth = await Promise.all(members.map(async (member) => {
      const orgId = String(member.org_id);

      // Kill switch & autonomy
      const { data: settings } = await userClient
        .from("planner_agent_settings")
        .select("kill_switch, autonomy")
        .eq("org_id", orgId)
        .maybeSingle();

      // Penggunaan kuota hari ini
      const tz = "Asia/Jakarta";
      const v_date = new Date().toLocaleDateString("en-CA", { timeZone: tz });
      const { data: usage } = await userClient
        .from("planner_agent_usage")
        .select("runs, tokens")
        .eq("org_id", orgId)
        .eq("usage_date", v_date)
        .maybeSingle();

      // Plan type
      const { data: org } = await userClient
        .from("planner_organizations")
        .select("plan_type")
        .eq("id", orgId)
        .maybeSingle();

      const planType = String(org?.plan_type || "free");
      const quota = {
        free: { runs: 10, tokens: 20_000 },
        starter: { runs: 30, tokens: 80_000 },
        pro: { runs: 100, tokens: 300_000 },
        pro_plus: { runs: 200, tokens: 600_000 },
        enterprise: { runs: 1000, tokens: 2_000_000 },
      }[planType] ?? { runs: 10, tokens: 20_000 };

      const runsUsed = usage?.runs ?? 0;
      const tokensUsed = usage?.tokens ?? 0;
      const runsRemaining = Math.max(0, quota.runs - runsUsed);
      const tokensRemaining = Math.max(0, quota.tokens - tokensUsed);

      const killSwitch = Boolean(settings?.kill_switch);
      const autonomy = settings?.autonomy || "L1";

      const health = killSwitch
        ? "disabled"
        : runsRemaining === 0 || tokensRemaining === 0
          ? "quota_exhausted"
          : "healthy";

      return {
        org_id: orgId,
        role: member.role,
        plan_type: planType,
        autonomy,
        kill_switch: killSwitch,
        health,
        quota: {
          runs_limit: quota.runs,
          runs_used: runsUsed,
          runs_remaining: runsRemaining,
          tokens_limit: quota.tokens,
          tokens_used: tokensUsed,
          tokens_remaining: tokensRemaining,
        },
      };
    }));

    const allHealthy = orgHealth.every((o) => o.health === "healthy");
    const anyDisabled = orgHealth.some((o) => o.health === "disabled");
    const anyQuotaExhausted = orgHealth.some((o) => o.health === "quota_exhausted");

    const overall = anyDisabled
      ? "disabled"
      : anyQuotaExhausted
        ? "quota_exhausted"
        : allHealthy
          ? "healthy"
          : "degraded";

    return json({
      status: overall,
      timestamp: new Date().toISOString(),
      organizations: orgHealth,
      summary: {
        total_orgs: orgHealth.length,
        healthy: orgHealth.filter((o) => o.health === "healthy").length,
        disabled: orgHealth.filter((o) => o.health === "disabled").length,
        quota_exhausted: orgHealth.filter((o) => o.health === "quota_exhausted").length,
      },
    });
  } catch (error) {
    console.error("planner-agent-health gagal:", error);
    return json({ code: "agen_gagal", message_id: "agen_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
