/**
 * Compliance emails — account deletion + refund lifecycle.
 * Actions: deletion_requested | deletion_cancelled | refund_submitted | refund_processed
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getAppUrl, sendEmailSafe } from "../_shared/email.ts";

const VALID_ACTIONS = new Set([
  "deletion_requested",
  "deletion_cancelled",
  "refund_submitted",
  "refund_processed",
]);

function appLink(path = "") {
  const base = getAppUrl().replace(/\/app\/?$/, "");
  return `${base}/app/${path.replace(/^\//, "")}`;
}

function deletionRequestedHtml(name: string, daysLeft: number) {
  return `
    <div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:520px">
      <h2>Permintaan hapus akun diterima</h2>
      <p>Hai${name ? ` ${name}` : ""},</p>
      <p>Akun kamu dijadwalkan untuk dihapus permanen dalam <strong>${daysLeft} hari</strong>.</p>
      <p>Sebelum itu, kamu bisa batalkan kapan saja di Settings → Akun.</p>
      <p><a href="${appLink("#settings/account")}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Batalkan hapus akun</a></p>
    </div>`;
}

function refundSubmittedHtml(plan: string) {
  return `
    <div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:520px">
      <h2>Permintaan refund diterima</h2>
      <p>Tim Monefyi akan review permintaan refund untuk plan <strong>${plan}</strong> dalam 1–3 hari kerja.</p>
      <p>Kamu akan menerima email lagi setelah keputusan diambil.</p>
    </div>`;
}

function refundProcessedHtml(status: string, notes: string) {
  const approved = status === "approved";
  return `
    <div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:520px">
      <h2>Update permintaan refund</h2>
      <p>Status: <strong>${approved ? "Disetujui" : "Ditolak"}</strong></p>
      ${notes ? `<p>Catatan: ${notes}</p>` : ""}
      ${approved ? "<p>Tim akan memproses refund manual ke metode pembayaran asal (bukan otomatis).</p>" : "<p>Hubungi support jika ada pertanyaan.</p>"}
    </div>`;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const action = String(body.action || "");
    if (!VALID_ACTIONS.has(action)) {
      return jsonResponse(req, { error: "Invalid action" }, 400);
    }

    const sb = createClient(url, service, { auth: { persistSession: false } });
    const uid = authData.user.id;
    const email = authData.user.email || "";
    const { data: prof } = await sb.from("profiles").select("name, role").eq("id", uid).maybeSingle();
    const name = String(prof?.name || "").trim();

    if (action === "refund_processed") {
      const role = String(prof?.role || "").toLowerCase();
      if (!["admin", "super_admin"].includes(role)) {
        return jsonResponse(req, { error: "Forbidden" }, 403);
      }
      let to = String(body.user_email || body.email || "");
      if (!to.includes("@") && body.user_id) {
        const { data: authRow } = await sb.auth.admin.getUserById(String(body.user_id));
        to = authRow?.user?.email || "";
      }
      if (!to.includes("@")) {
        return jsonResponse(req, { ok: true, skipped: true, reason: "no email" });
      }
      const status = String(body.status || "rejected");
      const notes = String(body.admin_notes || "").slice(0, 500);
      await sendEmailSafe({
        to,
        subject: `Monefyi — Refund ${status === "approved" ? "disetujui" : "ditolak"}`,
        html: refundProcessedHtml(status, notes),
        text: `Refund ${status}. ${notes}`,
      });
      return jsonResponse(req, { ok: true, emailed: true });
    }

    if (!email.includes("@")) {
      return jsonResponse(req, { ok: true, skipped: true, reason: "no email" });
    }

    if (action === "deletion_requested") {
      const daysLeft = Number(body.days_left || 30);
      await sendEmailSafe({
        to: email,
        subject: "Monefyi — Permintaan hapus akun",
        html: deletionRequestedHtml(name, daysLeft),
        text: `Akun dijadwalkan hapus dalam ${daysLeft} hari. Batalkan di Settings.`,
      });
    } else if (action === "deletion_cancelled") {
      await sendEmailSafe({
        to: email,
        subject: "Monefyi — Hapus akun dibatalkan",
        html: `<p>Permintaan hapus akun kamu telah <strong>dibatalkan</strong>. Akun tetap aktif.</p>`,
        text: "Permintaan hapus akun dibatalkan.",
      });
    } else if (action === "refund_submitted") {
      const plan = String(body.plan_type || "unknown");
      await sendEmailSafe({
        to: email,
        subject: "Monefyi — Permintaan refund diterima",
        html: refundSubmittedHtml(plan),
        text: `Refund request received for ${plan}.`,
      });
    }

    return jsonResponse(req, { ok: true, emailed: true });
  } catch (e) {
    console.error("[compliance-notify]", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
