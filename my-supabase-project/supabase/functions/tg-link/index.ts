import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { issueLinkCode, type ChannelRole } from "../_shared/channel/channelGate.ts";

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
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return json({ code: "sesi_tidak_sah", message_id: "sesi_tidak_sah", fix_hint: "Masuk ulang.", valid_options: [] }, 401);
    }
    const { data: members } = await userClient
      .from("planner_org_members")
      .select("org_id, role")
      .eq("user_id", authData.user.id)
      .eq("status", "active");
    const body = await req.json().catch(() => ({}));
    const requested = String(body.org_id || "");
    const list = members ?? [];
    const member = list.find((item) => item.org_id === requested) ?? (list.length === 1 ? list[0] : null);
    if (!member || !["worker", "manager", "owner"].includes(String(member.role))) {
      return json({
        code: "pilih_organisasi_di_aplikasi",
        message_id: "pilih_organisasi_di_aplikasi",
        fix_hint: "Pilih organisasi yang Anda ikuti.",
        valid_options: [],
      }, 409);
    }
    const issued = await issueLinkCode({
      userId: authData.user.id,
      orgId: String(member.org_id),
      role: String(member.role) as ChannelRole,
      now: Date.now(),
    });
    const { data, error } = await userClient.rpc("planner_issue_channel_link", {
      p_org_id: member.org_id,
      p_code_hash: issued.record.hash,
    });
    if (error) {
      return json({ code: "tautan_gagal", message_id: "tautan_gagal", fix_hint: "Coba lagi dari Pengaturan.", valid_options: [] }, 400);
    }
    return json({ link_code: issued.code, expires_at: data });
  } catch {
    return json({ code: "tautan_gagal", message_id: "tautan_gagal", fix_hint: "Coba lagi dari Pengaturan.", valid_options: [] }, 500);
  }
});
