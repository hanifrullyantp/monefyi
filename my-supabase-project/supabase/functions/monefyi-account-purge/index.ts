/**
 * Scheduled hard-delete for account_deletion_requests past recovery window.
 * Invoke via cron with header: x-cron-secret: CRON_SECRET
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { sendEmailSafe } from "../_shared/email.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  if (!cronSecret || headerSecret !== cronSecret) {
    return jsonResponse(req, { error: "Forbidden" }, 403);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service, { auth: { persistSession: false } });

    const now = new Date().toISOString();
    const { data: due, error: fetchErr } = await sb
      .from("account_deletion_requests")
      .select("id, user_id, scheduled_hard_delete_at")
      .eq("status", "pending")
      .lte("scheduled_hard_delete_at", now)
      .limit(50);

    if (fetchErr) throw fetchErr;

    const results: { user_id: string; ok: boolean; error?: string }[] = [];

    for (const row of due || []) {
      const userId = row.user_id;
      try {
        const { data: authUser } = await sb.auth.admin.getUserById(userId);
        const email = authUser?.user?.email || "";

        const { error: delErr } = await sb.auth.admin.deleteUser(userId);
        if (delErr) throw delErr;

        await sb.from("account_deletion_requests").update({
          status: "completed",
          completed_at: now,
        }).eq("id", row.id);

        if (email.includes("@")) {
          await sendEmailSafe({
            to: email,
            subject: "Monefyi — Akun dihapus permanen",
            html: `<p>Akun Monefyi kamu telah dihapus permanen sesuai permintaan sebelumnya.</p>`,
            text: "Akun Monefyi dihapus permanen.",
          });
        }

        results.push({ user_id: userId, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[account-purge] failed", userId, msg);
        results.push({ user_id: userId, ok: false, error: msg });
      }
    }

    return jsonResponse(req, {
      ok: true,
      processed: results.length,
      results,
    });
  } catch (e) {
    console.error("[account-purge]", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
