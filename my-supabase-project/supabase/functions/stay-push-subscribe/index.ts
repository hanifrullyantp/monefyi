import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getAnonClient, getServiceClient } from "../_shared/supabase.ts";
import { getStayVapidPublicKey, notifyStayTenantPush } from "../_shared/stayWebPush.ts";

interface PushSubscriptionBody {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method === "GET") {
    return jsonResponse(req, {
      publicKey: getStayVapidPublicKey(),
      enabled: Boolean(getStayVapidPublicKey() && Deno.env.get("STAY_VAPID_PRIVATE_KEY")),
    });
  }

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(req, "Unauthorized", 401);
  }

  const anon = getAnonClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await anon.auth.getUser(token);
  if (userError || !user) {
    return errorResponse(req, "Unauthorized", 401);
  }

  const { data: stayUser, error: stayUserError } = await anon
    .from("stay_users")
    .select("tenant_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (stayUserError || !stayUser?.tenant_id) {
    return errorResponse(req, "STAY user not found", 403);
  }

  const tenantId = stayUser.tenant_id as string;
  const body = await req.json();
  const action = (body.action as string) ?? "subscribe";

  if (action === "unsubscribe") {
    const endpoint = body.endpoint as string | undefined;
    if (!endpoint) {
      return errorResponse(req, "endpoint required", 400);
    }
    await anon
      .from("stay_push_subscriptions")
      .delete()
      .eq("auth_user_id", user.id)
      .eq("endpoint", endpoint);
    return jsonResponse(req, { success: true, action: "unsubscribe" });
  }

  if (action === "test") {
    const result = await notifyStayTenantPush(getServiceClient(), tenantId, {
      title: "STAY — Push Server Aktif",
      body: "Notifikasi ini dikirim dari server. Berfungsi meski app ditutup.",
      tag: "stay-server-test",
      url: "/stay/front-desk",
      type: "system",
    }, { authUserId: user.id });
    return jsonResponse(req, { success: true, action: "test", ...result });
  }

  const sub = body.subscription as PushSubscriptionBody | undefined;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return errorResponse(req, "Invalid push subscription", 400);
  }

  const row = {
    tenant_id: tenantId,
    auth_user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth_key: sub.keys.auth,
    user_agent: req.headers.get("user-agent") ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await anon
    .from("stay_push_subscriptions")
    .upsert(row, { onConflict: "auth_user_id,endpoint" });

  if (upsertError) {
    console.error("[stay-push-subscribe] upsert failed:", upsertError);
    return errorResponse(req, upsertError.message, 500);
  }

  return jsonResponse(req, { success: true, action: "subscribe" });
});
