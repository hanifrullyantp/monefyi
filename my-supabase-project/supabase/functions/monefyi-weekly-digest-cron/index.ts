/**
 * Server cron — generate weekly_digests for active users (Sunday ~19:00 WIB).
 * Schedule: 0 12 * * 0 UTC (= 19:00 WIB). Header: x-cron-secret
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { sendEmailSafe, getAppUrl } from "../_shared/email.ts";

function getISOWeekInfo(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year };
}

function weekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function buildDigestFromTxs(txs: { type?: string; amount?: number; category?: string }[]) {
  const expenses = txs.filter((t) => t.type === "expense");
  const income = txs.filter((t) => t.type === "income");
  const weekTotal = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
  const weekIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    week_total: weekTotal,
    week_income: weekIncome,
    net: weekIncome - weekTotal,
    tx_count: txs.length,
    has_data: txs.length > 0,
    highlights: weekTotal > 0 ? [`Pengeluaran minggu ini Rp ${weekTotal.toLocaleString("id-ID")}`] : [],
    recommendations: ["Review budget minggu depan di Monefyi"],
    source: "server_cron",
  };
}

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

    const { week, year } = getISOWeekInfo();
    const range = weekRange();
    const appUrl = getAppUrl();

    const { data: profiles } = await sb
      .from("profiles")
      .select("id, name, plan_type")
      .in("plan_type", ["trial", "monthly", "lifetime"])
      .limit(200);

    const results: { user_id: string; ok: boolean }[] = [];

    for (const p of profiles || []) {
      try {
        const { data: existing } = await sb
          .from("weekly_digests")
          .select("id")
          .eq("user_id", p.id)
          .eq("year", year)
          .eq("week_number", week)
          .maybeSingle();
        if (existing) {
          results.push({ user_id: p.id, ok: true });
          continue;
        }

        const { data: txs } = await sb
          .from("transactions")
          .select("type, amount, category, date")
          .eq("user_id", p.id)
          .gte("date", range.start)
          .lte("date", range.end)
          .limit(400);

        const content = {
          ...buildDigestFromTxs(txs || []),
          period_label: `${range.start} – ${range.end}`,
          generated_at: new Date().toISOString(),
        };

        await sb.from("weekly_digests").upsert({
          user_id: p.id,
          week_number: week,
          year,
          content_json: content,
          generated_at: new Date().toISOString(),
        }, { onConflict: "user_id,year,week_number" });

        const { data: authRow } = await sb.auth.admin.getUserById(p.id);
        const email = authRow?.user?.email;
        if (email?.includes("@") && content.has_data) {
          await sendEmailSafe({
            to: email,
            subject: "Rekap mingguan Monefyi sudah siap",
            html: `
              <p>Hai${p.name ? ` ${p.name}` : ""},</p>
              <p>Rekap minggu ${range.start} – ${range.end} sudah tersedia.</p>
              <p>Pengeluaran: Rp ${content.week_total.toLocaleString("id-ID")}</p>
              <p><a href="${appUrl}/app/#weekly-digest">Buka di aplikasi</a></p>
            `,
          });
        }

        results.push({ user_id: p.id, ok: true });
      } catch (e) {
        console.warn("[weekly-digest-cron] user", p.id, e);
        results.push({ user_id: p.id, ok: false });
      }
    }

    return jsonResponse(req, {
      ok: true,
      week,
      year,
      processed: results.length,
      results,
    });
  } catch (e) {
    console.error("[weekly-digest-cron]", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
