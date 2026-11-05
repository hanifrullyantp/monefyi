import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { secretsMatch } from "../_shared/channel/channelGate.ts";
import { dispatchDue } from "../_shared/channel/dispatchDue.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data } = await admin.from("planner_channel_config").select("value").eq("key", "dispatch_secret").maybeSingle();
  const expected = String(data?.value || "");
  if (!secretsMatch(req.headers.get("x-channel-dispatch-secret") ?? "", expected) || !expected) {
    return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const result = await dispatchDue(admin);
  return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: { "Content-Type": "application/json" } });
});
