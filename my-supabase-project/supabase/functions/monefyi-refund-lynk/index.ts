/**
 * Process approved refund — Lynk lookup + optional API (admin/cron).
 * Invoke with admin auth or x-cron-secret for batch.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { sendEmailSafe } from "../_shared/email.ts";

async function requireAdminOrCron(req: Request, sb: ReturnType<typeof createClient>) {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (cronSecret && headerSecret === cronSecret) return { ok: true as const };

  const authHeader = req.headers.get("Authorization") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: authData } = await userClient.auth.getUser();
  if (!authData?.user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: prof } = await sb.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  const role = String(prof?.role || "").toLowerCase();
  if (!["admin", "super_admin"].includes(role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, adminId: authData.user.id };
}

async function lookupLynkOrder(sb: ReturnType<typeof createClient>, userId: string, ref?: string | null) {
  if (ref) {
    const { data } = await sb.from("lynk_orders").select("*").eq("ref_id", ref).maybeSingle();
    if (data) return data;
    const { data: o2 } = await sb.from("orders").select("*").eq("ref_id", ref).maybeSingle();
    if (o2) return o2;
  }

  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return null;

  const { data: recent } = await sb
    .from("lynk_orders")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return recent;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service, { auth: { persistSession: false } });

    const auth = await requireAdminOrCron(req, sb);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);

    const body = await req.json();
    const requestId = String(body.request_id || body.id || "");
    if (!requestId) return jsonResponse(req, { error: "request_id required" }, 400);

    const { data: refund, error: fetchErr } = await sb
      .from("refund_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (fetchErr || !refund) return jsonResponse(req, { error: "Refund not found" }, 404);
    if (refund.status !== "pending" && body.force !== true) {
      return jsonResponse(req, { error: `Already ${refund.status}` }, 400);
    }

    const order = await lookupLynkOrder(sb, refund.user_id, refund.purchase_reference);
    let lynkStatus = "manual";
    let lynkNote = "No Lynk API key — process refund manually in Lynk dashboard.";

    const lynkKey = Deno.env.get("LYNK_API_KEY")?.trim();
    const lynkRefundUrl = Deno.env.get("LYNK_REFUND_API_URL")?.trim()
      || "https://api.lynk.id/v1/refunds";

    if (lynkKey && order?.ref_id) {
      try {
        const res = await fetch(lynkRefundUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lynkKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref_id: order.ref_id,
            reason: refund.reason?.slice(0, 200) || "customer_request",
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok) {
          lynkStatus = "submitted";
          lynkNote = `Lynk refund submitted for ${order.ref_id}`;
        } else {
          lynkStatus = "lynk_error";
          lynkNote = String(payload.message || payload.error || res.statusText).slice(0, 300);
        }
      } catch (e) {
        lynkStatus = "lynk_error";
        lynkNote = e instanceof Error ? e.message : String(e);
      }
    }

    const adminNotes = [
      body.admin_notes || "",
      lynkNote,
    ].filter(Boolean).join(" | ");

    await sb.from("refund_requests").update({
      status: body.reject === true ? "rejected" : "approved",
      admin_notes: adminNotes.slice(0, 1000),
      processed_by: auth.adminId || null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", requestId);

    const { data: authRow } = await sb.auth.admin.getUserById(refund.user_id);
    const userEmail = authRow?.user?.email;
    if (userEmail?.includes("@")) {
      await sendEmailSafe({
        to: userEmail,
        subject: `Monefyi — Refund ${body.reject ? "ditolak" : "disetujui"}`,
        html: `<p>Permintaan refund kamu ${body.reject ? "ditolak" : "disetujui"}.</p><p>${adminNotes}</p>`,
      });
    }

    return jsonResponse(req, {
      ok: true,
      request_id: requestId,
      lynk_status: lynkStatus,
      order_ref: order?.ref_id || null,
    });
  } catch (e) {
    console.error("[refund-lynk]", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
