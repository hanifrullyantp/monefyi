import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("FINANCE_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");

  const isCron = cronSecret && headerSecret === cronSecret;
  const isService = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "__none__");

  if (!isCron && !isService) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("planner_finance_daily_amortize");
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, result: data });
});
