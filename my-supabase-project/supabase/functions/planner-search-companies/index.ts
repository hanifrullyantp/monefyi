import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = getServiceClient();
    const url = new URL(req.url);
    const q = sanitizeText(url.searchParams.get("q") || (await req.json().catch(() => ({}))).q, 100);

    if (!q || q.length < 2) return jsonResponse({ companies: [] });

    const { data, error } = await sb
      .from("planner_organizations")
      .select("id, name, slug, industry, team_size, logo_url, brand_color")
      .eq("is_public_discoverable", true)
      .eq("allow_join_request", true)
      .ilike("name", `%${q}%`)
      .limit(10);

    if (error) throw error;
    return jsonResponse({ companies: data || [] });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
