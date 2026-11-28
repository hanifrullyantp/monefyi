import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sendFcmV1Batch, type FcmServiceAccount } from "../_shared/fcmV1.ts";

/**
 * Draft Edge Function: planner-push-notify
 * Mengirim push notification native Android via FCM HTTP v1 (android.priority: "high",
 * payload notification) dan otomatis menghapus token yang dibalas UNREGISTERED.
 * Hanya draft — tidak dideploy otomatis.
 */
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const pushSecret = req.headers.get("x-froyek-push-secret") ?? "";
  const expectedSecret = Deno.env.get("FROYEK_PUSH_SECRET") ?? "";

  const isServiceRole = Boolean(serviceKey) && authHeader === `Bearer ${serviceKey}`;
  const isCron = Boolean(expectedSecret) && pushSecret === expectedSecret;
  if (!isServiceRole && !isCron) {
    return errorResponse(req, "Forbidden", 403);
  }

  const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";
  if (!saRaw) {
    return errorResponse(req, "FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi", 500);
  }

  let sa: FcmServiceAccount;
  try {
    sa = JSON.parse(saRaw);
  } catch {
    return errorResponse(req, "FIREBASE_SERVICE_ACCOUNT_JSON tidak valid", 500);
  }

  try {
    const body = await req.json();
    const title = String(body.title || "Froyek").trim();
    const messageBody = String(body.body || "").trim();
    const userId = body.user_id ? String(body.user_id) : undefined;
    const url = body.url ? String(body.url) : "/";
    const tag = body.tag ? String(body.tag) : undefined;

    if (!messageBody) {
      return errorResponse(req, "body required", 400);
    }

    const supabase = getServiceClient();
    let query = supabase.from("froyek_fcm_tokens").select("id, token");
    if (userId) query = query.eq("user_id", userId);

    const { data: rows, error } = await query;
    if (error) {
      return errorResponse(req, error.message, 500);
    }

    const result = await sendFcmV1Batch(supabase, sa, rows || [], {
      title,
      body: messageBody,
      url,
      tag,
    });

    return jsonResponse(req, { ok: true, ...result });
  } catch (e) {
    console.error("[planner-push-notify]", e);
    return errorResponse(req, e instanceof Error ? e.message : "Push failed", 500);
  }
});

