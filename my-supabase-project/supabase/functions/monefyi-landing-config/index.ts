// supabase/functions/monefyi-landing-config/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  const APP_CORS_ORIGIN = Deno.env.get("APP_CORS_ORIGIN") || "*";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": APP_CORS_ORIGIN,
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, apikey, x-client-info",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "default";

  if (req.method === "GET") {
    // Ambil config landing
    const { data, error } = await supabaseAdmin
      .from("landing_content")
      .select("content")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("GET landing_content error:", error);
      return jsonResponse({ error: "Failed to load content" }, 500);
    }

    if (!data) {
      // tidak ada row, kirim kosong
      return jsonResponse({ slug, content: null }, 200);
    }

    return jsonResponse({ slug, content: data.content }, 200);
  }

  if (req.method === "POST") {
    const authResult = await assertAdminFromBearer(
      req.headers.get("Authorization") || "",
    );
    if (!authResult.ok) {
      return jsonResponse({ error: authResult.error || "Unauthorized" }, authResult.status);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const bodySlug = body.slug || slug || "default";
    const content = body.content;
    if (!content) {
      return jsonResponse({ error: "Missing content" }, 400);
    }

    // Upsert row
    const { error } = await supabaseAdmin.from("landing_content").upsert(
      {
        slug: bodySlug,
        content,
      },
      { onConflict: "slug" },
    );

    if (error) {
      console.error("POST landing_content error:", error);
      return jsonResponse({ error: "Failed to save content" }, 500);
    }

    return jsonResponse({ ok: true, slug: bodySlug }, 200);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});