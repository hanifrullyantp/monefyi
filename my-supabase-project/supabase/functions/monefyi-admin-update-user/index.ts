import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return jsonResponse(req,{ error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    await requireAdmin(sb, authData.user.id);

    const body = await req.json();
    const userId = String(body.user_id || "");
    if (!userId) return jsonResponse(req,{ error: "user_id required" }, 400);

    const profilePatch: Record<string, unknown> = {};
    if (body.name !== undefined) profilePatch.name = String(body.name).slice(0, 200);
    if (body.phone !== undefined) profilePatch.phone = String(body.phone).slice(0, 50);
    if (body.role !== undefined) {
      const r = String(body.role).toLowerCase();
      if (!["user", "admin"].includes(r)) return jsonResponse(req,{ error: "Invalid role" }, 400);
      profilePatch.role = r;
    }
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      if (!["active", "suspended", "pending"].includes(s)) return jsonResponse(req,{ error: "Invalid status" }, 400);
      profilePatch.status = s;
    }
    if (body.gemini_key !== undefined) {
      profilePatch.gemini_key = body.gemini_key ? String(body.gemini_key).trim() : null;
    }
    if (body.email_notifications !== undefined) profilePatch.email_notifications = !!body.email_notifications;
    if (body.push_notifications !== undefined) profilePatch.push_notifications = !!body.push_notifications;
    if (body.admin_notes !== undefined) profilePatch.admin_notes = String(body.admin_notes).slice(0, 2000);
    // Grant trial shortcut
    if (body.grant_trial === true || body.action === "grant_trial") {
      const days = Number(body.trial_days || 7) || 7;
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      body.plan_type = "trial";
      body.plan_expires_at = expires;
      body.status = body.status || "active";
    }

    if (body.plan_type !== undefined) {
      const pt = String(body.plan_type).toLowerCase();
      if (!["none", "trial", "monthly", "lifetime"].includes(pt)) {
        return jsonResponse(req, { error: "Invalid plan_type" }, 400);
      }
      profilePatch.plan_type = pt;
    }
    if (body.plan_expires_at !== undefined) profilePatch.plan_expires_at = body.plan_expires_at;
    if (body.onboarding_completed !== undefined) {
      profilePatch.onboarding_completed = !!body.onboarding_completed;
    }

    profilePatch.updated_at = new Date().toISOString();

    if (Object.keys(profilePatch).length > 1) {
      const { error: profErr } = await sb.from("profiles").update(profilePatch).eq("id", userId);
      if (profErr) return jsonResponse(req,{ error: profErr.message }, 500);
    }

    if (body.plan_type !== undefined || body.ai_daily_limit !== undefined || body.plan_expires_at !== undefined) {
      const planRow: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (body.plan_type !== undefined) planRow.plan_type = String(body.plan_type);
      if (body.plan_expires_at !== undefined) planRow.expires_at = body.plan_expires_at;
      if (body.ai_daily_limit !== undefined) planRow.ai_daily_limit = Number(body.ai_daily_limit);

      const { error: planErr } = await sb.from("user_plans").upsert(planRow, { onConflict: "user_id" });
      if (planErr) return jsonResponse(req,{ error: planErr.message }, 500);
    }

    if (body.new_password && String(body.new_password).length >= 8) {
      const { error: pwErr } = await sb.auth.admin.updateUserById(userId, {
        password: String(body.new_password),
      });
      if (pwErr) return jsonResponse(req,{ error: pwErr.message }, 500);
    }

    return jsonResponse(req,{ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req,{ error: "Forbidden" }, 403);
    return jsonResponse(req,{ error: msg }, 500);
  }
});
