// supabase/functions/monefyi-landing-config/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function assertAdminFromBearer(authHeader: string): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  if (!SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: "Missing SUPABASE_ANON_KEY" };
  }
  if (!authHeader) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileErr) {
    return { ok: false, status: 500, error: "Failed to validate profile role" };
  }
  if (String(profile?.role || "").toLowerCase() !== "admin") {
    return { ok: false, status: 403, error: "Forbidden (admin only)" };
  }
  return { ok: true, status: 200 };
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "default";

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("landing_content")
      .select("content")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("GET landing_content error:", error);
      return errorResponse(req, "Failed to load content", 500);
    }

    if (!data) {
      return jsonResponse(req, { slug, content: null });
    }

    return jsonResponse(req, { slug, content: data.content });
  }

  if (req.method === "POST") {
    const authResult = await assertAdminFromBearer(
      req.headers.get("Authorization") || "",
    );
    if (!authResult.ok) {
      return jsonResponse(req, { error: authResult.error || "Unauthorized" }, authResult.status);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(req, "Invalid JSON", 400);
    }

    const bodySlug = String(body.slug || slug || "default");
    const content = body.content;
    if (!content) {
      return errorResponse(req, "Missing content", 400);
    }

    const { error } = await supabaseAdmin.from("landing_content").upsert(
      {
        slug: bodySlug,
        content,
      },
      { onConflict: "slug" },
    );

    if (error) {
      console.error("POST landing_content error:", error);
      return errorResponse(req, "Failed to save content", 500);
    }

    return jsonResponse(req, { ok: true, slug: bodySlug });
  }

  return errorResponse(req, "Method not allowed", 405);
});
