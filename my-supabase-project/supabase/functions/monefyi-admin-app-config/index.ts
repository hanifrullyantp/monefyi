// Supabase Edge Function: monefyi-admin-app-config
// -------------------------------------------------
// Admin-only merge+upsert untuk baris public.app_config (id = 'global').
// Dipakai panel Super Admin ketika RLS client memblok direct upsert.
//
// POST JSON (partial fields — hanya key yang dikirim yang ditimpa):
// {
//   "logo_url"?: string | null,
//   "checkout_monthly_url"?: string | null,
//   "checkout_lifetime_url"?: string | null,
//   "affiliate_commission"?: number,
//   "tutorial"?: object,
//   "notif_threshold"?: number
// }
//
// Response: { "ok": true, "appConfig": { ...row } }
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional: APP_CORS_ORIGIN (default *)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

const ALLOWED_KEYS = new Set([
  "logo_url",
  "checkout_monthly_url",
  "checkout_lifetime_url",
  "affiliate_commission",
  "tutorial",
  "notif_threshold",
  "platform_settings",
]);

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const SUPABASE_URL = pickEnv("SUPABASE_URL");
  const ANON = pickEnv("SUPABASE_ANON_KEY");
  const SERVICE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON || !SERVICE) {
    return jsonResponse(req,
      { error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return jsonResponse(req,{ error: "Missing Authorization" }, 401);
  }

  const supaUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authErr } = await supaUser.auth.getUser();
  if (authErr || !authData?.user?.id) {
    return jsonResponse(req,{ error: "Unauthorized" }, 401);
  }

  const supaAdmin = createClient(SUPABASE_URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: prof, error: profErr } = await supaAdmin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profErr) {
    console.error("monefyi-admin-app-config profErr:", profErr);
    return jsonResponse(req,{ error: "Failed to load profile" }, 500);
  }
  if (String(prof?.role || "").toLowerCase() !== "admin") {
    return jsonResponse(req,{ error: "Forbidden (admin only)" }, 403);
  }

  const raw = await req.json().catch(() => ({}));
  const patch = (raw && typeof raw === "object" && raw.patch && typeof raw.patch === "object")
    ? raw.patch
    : raw;

  const { data: cur, error: curErr } = await supaAdmin
    .from("app_config")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  if (curErr) {
    console.error("monefyi-admin-app-config curErr:", curErr);
    return jsonResponse(req,{ error: "Failed to read app_config" }, 500);
  }

  const merged: Record<string, unknown> = {
    ...(cur || {}),
    id: "global",
  };

  for (const [k, v] of Object.entries(patch || {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    merged[k] = v;
  }

  if (Object.prototype.hasOwnProperty.call(merged, "affiliate_commission")) {
    merged.affiliate_commission = Number(merged.affiliate_commission ?? 0);
  }
  if (Object.prototype.hasOwnProperty.call(merged, "notif_threshold")) {
    merged.notif_threshold = Number(merged.notif_threshold ?? 80);
  }

  merged.updated_at = new Date().toISOString();

  const { data: saved, error: saveErr } = await supaAdmin
    .from("app_config")
    .upsert(merged)
    .select("*")
    .single();

  if (saveErr) {
    console.error("monefyi-admin-app-config saveErr:", saveErr);
    return jsonResponse(req,{ error: saveErr.message || "Upsert failed" }, 500);
  }

  return jsonResponse(req,{ ok: true, appConfig: saved }, 200);
});
