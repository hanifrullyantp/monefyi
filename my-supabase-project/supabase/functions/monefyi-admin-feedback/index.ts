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
    if (authErr || !authData?.user) return jsonResponse(req, { error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    await requireAdmin(sb, authData.user.id);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list").toLowerCase();

    if (action === "list") {
      const status = String(body.status || "all").toLowerCase();
      const type = String(body.type || "all").toLowerCase();
      let q = sb
        .from("user_feedback")
        .select("id, user_id, type, title, body, status, admin_notes, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(Number(body.limit) || 100);

      if (status !== "all") q = q.eq("status", status);
      if (type !== "all") q = q.eq("type", type);

      const { data, error } = await q;
      if (error) return jsonResponse(req, { error: error.message }, 500);

      // Enrich with email/name
      const userIds = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))];
      const profileMap = new Map<string, { name?: string; email?: string }>();
      if (userIds.length) {
        const { data: profiles } = await sb.from("profiles").select("id, name").in("id", userIds);
        for (const p of profiles || []) profileMap.set(p.id, { name: p.name || "" });
        for (const uid of userIds) {
          try {
            const { data: u } = await sb.auth.admin.getUserById(uid);
            const prev = profileMap.get(uid) || {};
            profileMap.set(uid, { ...prev, email: u?.user?.email || "" });
          } catch { /* ignore */ }
        }
      }

      const items = (data || []).map((r) => ({
        ...r,
        user_name: profileMap.get(r.user_id || "")?.name || "",
        user_email: profileMap.get(r.user_id || "")?.email || "",
      }));

      return jsonResponse(req, { ok: true, items });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return jsonResponse(req, { error: "id required" }, 400);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status !== undefined) {
        const s = String(body.status).toLowerCase();
        if (!["open", "in_progress", "resolved", "closed"].includes(s)) {
          return jsonResponse(req, { error: "Invalid status" }, 400);
        }
        patch.status = s;
      }
      if (body.admin_notes !== undefined) patch.admin_notes = String(body.admin_notes).slice(0, 4000);
      const { error } = await sb.from("user_feedback").update(patch).eq("id", id);
      if (error) return jsonResponse(req, { error: error.message }, 500);
      return jsonResponse(req, { ok: true });
    }

    return jsonResponse(req, { error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "FORBIDDEN") return jsonResponse(req, { error: "Forbidden" }, 403);
    return jsonResponse(req, { error: msg }, 500);
  }
});
