/**
 * Ajukan garansi refund 7 hari — Planner Estimator.
 * Validasi pembelian lynk_orders + window 7 hari, insert refund_requests (service role).
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { sanitizeText } from "../_shared/sanitize.ts";

const REFUND_WINDOW_DAYS = 7;

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.floor((Date.now() - t) / 86_400_000);
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const user = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const reason = sanitizeText(String(body.reason || ""), 1000).trim();

    if (reason.length < 10) {
      return jsonResponse({ error: "Alasan minimal 10 karakter" }, 400);
    }

    const { data: order } = await sb
      .from("lynk_orders")
      .select("ref_id, product, plan_type, amount, created_at")
      .eq("user_id", user.id)
      .eq("product_line", "planner")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order?.created_at) {
      return jsonResponse({
        error: "Tidak ditemukan pembelian Planner. Hubungi support@monefyi.com dengan bukti transfer.",
      }, 400);
    }

    if (daysSince(String(order.created_at)) > REFUND_WINDOW_DAYS) {
      return jsonResponse({
        error: `Garansi refund hanya berlaku ${REFUND_WINDOW_DAYS} hari sejak pembelian.`,
      }, 400);
    }

    const { data: pending } = await sb
      .from("refund_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pending?.id) {
      return jsonResponse({ error: "Permintaan refund masih diproses. Tim kami akan menghubungi Anda." }, 400);
    }

    const planType = String(order.product || order.plan_type || "estimator");

    const { error: insertErr } = await sb.from("refund_requests").insert({
      user_id: user.id,
      plan_type: planType,
      purchase_reference: order.ref_id ? String(order.ref_id) : null,
      purchase_date: order.created_at,
      reason,
      status: "pending",
    });

    if (insertErr) {
      console.error("refund insert:", insertErr.message);
      return jsonResponse({ error: "Gagal menyimpan permintaan refund" }, 500);
    }

    return jsonResponse({
      success: true,
      message: "Permintaan refund diterima. Tim review dalam 1–3 hari kerja; refund manual via Lynk.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "EMAIL_NOT_VERIFIED" ? 403 : 500;
    return jsonResponse({ error: msg }, status);
  }
});
