import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { notifyStayTenantPush, type StayPushPayload } from "../_shared/stayWebPush.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = req.headers.get("x-stay-push-secret") ?? "";
  const expectedSecret = Deno.env.get("STAY_PUSH_SECRET") ?? "";

  const isServiceRole = authHeader === `Bearer ${serviceKey}`;
  const isCron = expectedSecret && cronSecret === expectedSecret;

  if (!isServiceRole && !isCron) {
    return errorResponse(req, "Forbidden", 403);
  }

  try {
    const body = await req.json();
    const tenantId = body.tenant_id as string | undefined;
    if (!tenantId) {
      return errorResponse(req, "tenant_id required", 400);
    }

    const payload: StayPushPayload = {
      title: (body.title as string) ?? "STAY",
      body: body.body as string | undefined,
      tag: body.tag as string | undefined,
      url: body.url as string | undefined,
      type: body.type as string | undefined,
      data: body.data as Record<string, unknown> | undefined,
    };

    const result = await notifyStayTenantPush(getServiceClient(), tenantId, payload, {
      authUserId: body.auth_user_id as string | undefined,
    });

    return jsonResponse(req, { success: true, ...result });
  } catch (e) {
    console.error("[stay-push-notify]", e);
    return errorResponse(req, e instanceof Error ? e.message : "Push failed", 500);
  }
});
