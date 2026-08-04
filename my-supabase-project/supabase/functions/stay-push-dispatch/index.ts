import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  dispatchStayDbEvent,
  validatePushDispatchSecret,
} from "../_shared/stayPushEvents.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const supabase = getServiceClient();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const dispatchSecret = req.headers.get("x-stay-push-secret") ?? "";

  const isServiceRole = authHeader === `Bearer ${serviceKey}`;
  const isDispatch = await validatePushDispatchSecret(supabase, dispatchSecret);

  if (!isServiceRole && !isDispatch) {
    return errorResponse(req, "Forbidden", 403);
  }

  try {
    const body = await req.json();
    const table = body.table as string | undefined;
    const record = body.record as Record<string, unknown> | undefined;

    if (!table || !record) {
      return errorResponse(req, "table and record required", 400);
    }

    const result = await dispatchStayDbEvent(supabase, table, record);
    return jsonResponse(req, { success: true, ...result });
  } catch (e) {
    console.error("[stay-push-dispatch]", e);
    return errorResponse(req, e instanceof Error ? e.message : "Dispatch failed", 500);
  }
});
