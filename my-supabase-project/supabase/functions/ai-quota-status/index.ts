// Supabase Edge Function: ai-quota-status
// ---------------------------------------
// Mengembalikan status kuota AI harian user saat ini.
//
// Respon:
// {
//   "limit": 20,
//   "usedToday": 5,
//   "remaining": 15,
//   "resetTime": "2025-12-28T00:00:00+07:00"
// }

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

// Hitung "hari ini" dan resetTime versi WIB (+7)
function getTodayAndResetWIB() {
  const nowUtc = new Date();
  const offsetMs = 7 * 60 * 60 * 1000; // +7 jam
  const wibNow = new Date(nowUtc.getTime() + offsetMs);

  const y = wibNow.getUTCFullYear();
  const m = wibNow.getUTCMonth();
  const d = wibNow.getUTCDate();

  // hari ini di WIB, jam 00:00
  const todayWib = new Date(Date.UTC(y, m, d, 0, 0, 0));
  // besok jam 00:00 WIB
  const tomorrowWib = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));

  const todayStr = todayWib.toISOString().slice(0, 10);
  const resetISO = tomorrowWib.toISOString(); // ISO UTC; cukup untuk klien

  return { todayStr, resetISO };
}

// decode JWT manual untuk ambil sub (user_id)
function decodeUserIdFromAuthHeader(authHeader: string): string | null {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return String(payload.sub || payload.user_id || "");
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return errorResponse(req, "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userId = decodeUserIdFromAuthHeader(authHeader);
    if (!userId) {
      return errorResponse(req, "Unauthorized (invalid token)", 401);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { todayStr, resetISO } = getTodayAndResetWIB();

    // Ambil plan & limit
    const { data: planRow, error: planErr } = await supa
      .from("user_plans")
      .select("plan_type, ai_daily_limit")
      .eq("user_id", userId)
      .maybeSingle();

    if (planErr) {
      console.error("ai-quota-status planErr:", planErr);
    }

    let limit = 0;
    let planType = "none";

    if (planRow) {
      planType = String(planRow.plan_type || "none");
      if (typeof planRow.ai_daily_limit === "number") {
        limit = planRow.ai_daily_limit;
      } else {
        // fallback default
        if (planType === "lifetime") limit = 50;
        else if (planType === "monthly") limit = 20;
        else limit = 0;
      }
    }

    // Ambil usage hari ini
    const { data: usageRow, error: usageErr } = await supa
      .from("ai_usage")
      .select("requests_count")
      .eq("user_id", userId)
      .eq("usage_date", todayStr)
      .maybeSingle();

    if (usageErr) {
      console.error("ai-quota-status usageErr:", usageErr);
    }

    const usedToday = usageRow?.requests_count ?? 0;
    const remaining = Math.max(0, limit - usedToday);

    return jsonResponse(req, {
      limit,
      usedToday,
      remaining,
      resetTime: resetISO,
      planType,
      today: todayStr,
    });
  } catch (e) {
    console.error("❌ ai-quota-status error:", e);
    return errorResponse(req, String(e?.message || e));
  }
});
