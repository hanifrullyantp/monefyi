import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

async function requireAdmin(supa: ReturnType<typeof createClient>, callerId: string) {
  const { data: prof } = await supa.from("profiles").select("role").eq("id", callerId).maybeSingle();
  if (String(prof?.role || "").toLowerCase() !== "admin") throw new Error("FORBIDDEN");
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return jsonResponse(req,{ error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    const body = await req.json();
    const action = String(body.action || "list");

    if (action === "list") {
      const includeInactive = !!body.include_inactive;
      let q = sb.from("company_types").select("*").order("sort_order", { ascending: true });
      if (!includeInactive) {
        const { data: authProf } = await sb.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
        if (String(authProf?.role) !== "admin") {
          q = q.eq("is_active", true);
        }
      } else {
        await requireAdmin(sb, authData.user.id);
      }
      const { data, error } = await q;
      if (error) return jsonResponse(req,{ error: error.message }, 500);
      return jsonResponse(req,{ ok: true, items: data || [] });
    }

    await requireAdmin(sb, authData.user.id);

    if (action === "create") {
      const slug = String(body.slug || "").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const label = String(body.label || "").trim();
      if (!slug || !label) return jsonResponse(req,{ error: "slug and label required" }, 400);
      const { data, error } = await sb.from("company_types").insert({
        slug,
        label,
        description: body.description || null,
        sort_order: Number(body.sort_order || 0),
        is_active: body.is_active !== false,
      }).select().single();
      if (error) return jsonResponse(req,{ error: error.message }, 500);
      return jsonResponse(req,{ ok: true, item: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return jsonResponse(req,{ error: "id required" }, 400);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.label !== undefined) patch.label = String(body.label);
      if (body.slug !== undefined) patch.slug = String(body.slug).toLowerCase();
      if (body.description !== undefined) patch.description = body.description;
      if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);
      if (body.is_active !== undefined) patch.is_active = !!body.is_active;
      const { data, error } = await sb.from("company_types").update(patch).eq("id", id).select().single();
      if (error) return jsonResponse(req,{ error: error.message }, 500);
      return jsonResponse(req,{ ok: true, item: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return jsonResponse(req,{ error: "id required" }, 400);
      const { error } = await sb.from("company_types").delete().eq("id", id);
      if (error) return jsonResponse(req,{ error: error.message }, 500);
      return jsonResponse(req,{ ok: true });
    }

    return jsonResponse(req,{ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req,{ error: "Forbidden" }, 403);
    return jsonResponse(req,{ error: msg }, 500);
  }
});
