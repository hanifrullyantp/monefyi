import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardWebhook } from "../_shared/channel/channelGate.ts";
import { parseTelegramUpdate } from "../_shared/channel/channelProvider.ts";
import { handleUpdate } from "../_shared/channel/handleUpdate.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  const guard = guardWebhook(
    req.headers.get("X-Telegram-Bot-Api-Secret-Token"),
    Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "",
  );
  if (guard.status === 401) {
    return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const body = await req.json().catch(() => null);
  const update = parseTelegramUpdate(body);
  const response = new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  if (!update) return response;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const inserted = await admin.from("planner_channel_inbox").insert({ update_id: update.updateId });
  if (inserted.error) return response;
  const task = handleUpdate(admin, update);
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil: (work: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
  else await task;
  return response;
});
