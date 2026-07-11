import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const cronSecret = Deno.env.get("FINANCE_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");

  const isCron = cronSecret && headerSecret === cronSecret;
  const isService = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "__none__");

  if (!isCron && !isService) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("planner_finance_daily_amortize");
  if (error) return json(req, { error: error.message }, 500);

  return json(req, { ok: true, result: data });
});
