/**
 * Public config API for landing page (read-only, CORS-enabled).
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  getCorsHeaders,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service, { auth: { persistSession: false } });

    const u = new URL(req.url);
    let section = u.searchParams.get("section") || "all";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        section = String(body.section || section);
      } catch { /* ignore */ }
    }

    const { data: appConfig } = await sb.from("app_config").select("*").eq("id", "global").maybeSingle();
    const platform = (appConfig?.platform_settings as Record<string, unknown>) || {};

    const pricing = {
      trial_days: platform.trial_days ?? 7,
      lifetime_price: platform.lifetime_price_display ?? "Rp 99.000",
      couple_bump_price: platform.couple_bump_price ?? "Rp 48.000",
      pro_yearly_price: platform.pro_yearly_price ?? "Rp 250.000",
      checkout_lifetime_url: appConfig?.checkout_lifetime_url ?? "",
      checkout_monthly_url: appConfig?.checkout_monthly_url ?? "",
      checkout_couple_url: platform.checkout_couple_url ?? "",
    };

    let landing: Record<string, unknown> = {};
    try {
      const { data: lc } = await sb.from("landing_content").select("slug, content").eq("slug", "default").maybeSingle();
      landing = (lc?.content as Record<string, unknown>) || {};
    } catch { /* optional */ }

    let flags: Record<string, boolean> = {};
    try {
      const { data: ff } = await sb.from("feature_flags").select("key, enabled, status, rollout_pct").eq("status", "active");
      for (const f of ff || []) {
        flags[f.key] = !!f.enabled && Number(f.rollout_pct) >= 100;
      }
    } catch { /* ignore */ }

    const payload: Record<string, unknown> = {
      ok: true,
      updated_at: appConfig?.updated_at || new Date().toISOString(),
    };

    if (section === "pricing" || section === "all") payload.pricing = pricing;
    if (section === "landing" || section === "all") payload.landing = landing;
    if (section === "feature-flags" || section === "all") payload.feature_flags = flags;
    if (section === "all") {
      payload.app = {
        logo_url: appConfig?.logo_url ?? null,
        affiliate_commission: appConfig?.affiliate_commission ?? 100000,
      };
    }

    const headers = { ...getCorsHeaders(req), "Cache-Control": "public, max-age=60" };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse(req, { error: msg }, 500);
  }
});
