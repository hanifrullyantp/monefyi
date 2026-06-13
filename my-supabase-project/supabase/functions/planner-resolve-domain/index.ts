import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    let hostname = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      hostname = url.searchParams.get("hostname") || "";
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      hostname = String(body.hostname || "");
    } else {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    hostname = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!hostname) return jsonResponse({ error: "hostname required" }, 400);

    const sb = getServiceClient();
    const { data: row, error } = await sb
      .from("planner_org_custom_domains")
      .select(`
        hostname,
        org_id,
        planner_organizations (
          id, name, slug, brand_color, plan_type
        )
      `)
      .eq("hostname", hostname)
      .eq("status", "verified")
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);
    if (!row) return jsonResponse({ org_id: null });

    const org = row.planner_organizations as {
      id: string;
      name: string;
      slug: string;
      brand_color: string | null;
      plan_type: string;
    } | null;

    if (!org || org.plan_type !== "pro_plus") {
      return jsonResponse({ org_id: null });
    }

    return jsonResponse({
      org_id: org.id,
      org_name: org.name,
      org_slug: org.slug,
      brand_color: org.brand_color,
      hostname: row.hostname,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
