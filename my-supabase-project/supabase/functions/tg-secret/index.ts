import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { redactSecrets, sealSecret } from "../_shared/channel/channelGate.ts";
import { connectWebhook } from "../_shared/channel/channelProvider.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const CORS = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") {
    return json({ code: "metode_salah", message_id: "metode_salah", fix_hint: "Pakai POST.", valid_options: [] }, 405);
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ code: "tanpa_sesi", message_id: "tanpa_sesi", fix_hint: "Masuk dulu.", valid_options: [] }, 401);
  let token = "";
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }
    const body = await req.json().catch(() => ({}));
    token = String(body.token || "");
    const orgId = String(body.org_id || "");
    if (token.length < 20 || token.length > 200 || !token.includes(":")) {
      return json({ code: "token_tidak_valid", message_id: "token_tidak_valid", fix_hint: "Tempel token dari BotFather.", valid_options: [] }, 400);
    }
    const { data: members } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", authData.user.id)
      .eq("status", "active");
    const owner = (members ?? []).find((item) => item.org_id === orgId && item.role === "owner");
    if (!owner) {
      return json({ code: "di_luar_wewenang", message_id: "di_luar_wewenang", fix_hint: "Hanya pemilik yang memasang token bot.", valid_options: [] }, 403);
    }
    const key = Deno.env.get("CHANNEL_SECRET_KEY") ?? "";
    if (!key) {
      return json({
        code: "konfigurasi_server",
        message_id: "konfigurasi_server",
        fix_hint: "Kunci enkripsi kanal belum dipasang di server.",
        valid_options: [],
      }, 503);
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const ciphertext = await sealSecret(token, key);
    const saved = await admin.from("planner_channel_secrets").upsert({
      org_id: orgId,
      provider: "telegram",
      ciphertext,
      updated_at: new Date().toISOString(),
    });
    if (saved.error) {
      return json({ code: "simpan_gagal", message_id: "simpan_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
    }
    const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhook = webhookSecret && supabaseUrl
      ? await connectWebhook(token, `${supabaseUrl}/functions/v1/tg-webhook`, webhookSecret)
      : false;
    return json({ ok: true, webhook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "galat";
    console.error(redactSecrets(message, [token]));
    return json({ code: "simpan_gagal", message_id: "simpan_gagal", fix_hint: "Coba lagi.", valid_options: [] }, 500);
  }
});
