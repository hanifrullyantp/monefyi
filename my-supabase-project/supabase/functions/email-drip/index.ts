// Edge Function: email-drip — process due drip_schedule rows (call via cron)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

type Template = { subject: string; html: (ctx: Ctx) => string };
type Ctx = { name: string; appUrl: string; monthlyUrl: string; lifetimeUrl: string };

const TEMPLATES: Record<string, Template> = {
  trial_day2: {
    subject: "Sudah catat 5 transaksi? Ini hasilnya!",
    html: (c) => `<p>Hai ${c.name},</p><p>Buka dashboard untuk lihat ringkasan awal keuanganmu.</p><p><a href="${c.appUrl}">Lihat Dashboard</a></p>`,
  },
  trial_day4: {
    subject: "Fitur yang belum kamu coba",
    html: (c) => `<p>Hai ${c.name},</p><p>Coba OCR struk atau budget otomatis — hemat waktu catat pengeluaran.</p><p><a href="${c.appUrl}">Coba Sekarang</a></p>`,
  },
  trial_day5: {
    subject: "Trial kamu tinggal 2 hari",
    html: (c) => `<p>Hai ${c.name},</p><p>Trial hampir habis. Upgrade ke Monthly agar data & fitur premium tetap jalan.</p><p><a href="${c.monthlyUrl}">Upgrade ke Monthly</a></p>`,
  },
  trial_day7: {
    subject: "Hari terakhir trial!",
    html: (c) => `<p>Hai ${c.name},</p><p>Hari terakhir trial. Upgrade sekarang — hemat 20% untuk langganan pertama.</p><p><a href="${c.monthlyUrl}">Upgrade Sekarang</a></p>`,
  },
  trial_day8: {
    subject: "Trial berakhir — tapi kamu bisa lanjut",
    html: (c) => `<p>Hai ${c.name},</p><p>Data kamu aman. Upgrade untuk akses kembali semua fitur.</p><p><a href="${c.monthlyUrl}">Aktifkan Kembali</a></p>`,
  },
  trial_day14: {
    subject: "Kami kangen kamu (+ diskon spesial)",
    html: (c) => `<p>Hai ${c.name},</p><p>Diskon 30% untuk 3 bulan pertama — klaim sebelum habis.</p><p><a href="${c.monthlyUrl}">Klaim Diskon</a></p>`,
  },
  paid_day7: {
    subject: "Minggu pertama: ini yang sudah kamu capai",
    html: (c) => `<p>Hai ${c.name},</p><p>Cek statistik minggu pertama di dashboard Monefyi.</p><p><a href="${c.appUrl}">Buka App</a></p>`,
  },
  paid_day25: {
    subject: "Perpanjangan dalam 5 hari",
    html: (c) => `<p>Hai ${c.name},</p><p>Langganan bulanan akan diperpanjang. Review value bulan ini di app.</p><p><a href="${c.monthlyUrl}">Perpanjang / Kelola</a></p>`,
  },
  paid_day30: {
    subject: "Laporan Monefyi bulan ini",
    html: (c) => `<p>Hai ${c.name},</p><p>Ringkasan income, expense, saving rate, dan skor Monevisor menunggumu.</p><p><a href="${c.appUrl}">Lihat Laporan</a></p>`,
  },
};

serve(async (req) => {
  const cors = handleCorsPreflightRequest(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  // Protect with cron secret
  const cronSecret = pickEnv("DRIP_CRON_SECRET", "");
  const got = (req.headers.get("x-cron-secret") || "").trim();
  if (cronSecret && got !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  const url = pickEnv("SUPABASE_URL");
  const service = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    return new Response(JSON.stringify({ error: "misconfigured" }), { status: 500, headers });
  }
  const sb = createClient(url, service, { auth: { persistSession: false } });
  const appUrl = pickEnv("APP_URL", "https://app.monefyi.com");
  const monthlyUrl = pickEnv("CHECKOUT_MONTHLY_URL", "https://lynk.id/asfin-ai/9zexz9z5wom1/checkout");
  const lifetimeUrl = pickEnv("CHECKOUT_LIFETIME_URL", "https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout");

  const nowIso = new Date().toISOString();
  const { data: due, error } = await sb
    .from("drip_schedule")
    .select("id, user_id, template_id")
    .eq("status", "pending")
    .lte("send_at", nowIso)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due || []) {
    const tpl = TEMPLATES[row.template_id];
    if (!tpl) {
      await sb.from("drip_schedule").update({ status: "skipped" }).eq("id", row.id);
      continue;
    }
    try {
      const { data: userData } = await sb.auth.admin.getUserById(row.user_id);
      const email = userData?.user?.email;
      if (!email) {
        await sb.from("drip_schedule").update({ status: "skipped" }).eq("id", row.id);
        continue;
      }
      const { data: prof } = await sb.from("profiles").select("name, plan_type").eq("id", row.user_id).maybeSingle();
      // Skip trial drips if already paid
      if (String(row.template_id).startsWith("trial_") && ["monthly", "lifetime"].includes(String(prof?.plan_type))) {
        await sb.from("drip_schedule").update({ status: "skipped", sent_at: nowIso }).eq("id", row.id);
        continue;
      }
      const ctx: Ctx = {
        name: String(prof?.name || email.split("@")[0]),
        appUrl,
        monthlyUrl,
        lifetimeUrl,
      };
      await sendEmail({
        to: email,
        subject: tpl.subject,
        html: `<div style="font-family:system-ui,sans-serif;color:#0f172a">${tpl.html(ctx)}</div>`,
      });
      await sb.from("drip_schedule").update({ status: "sent", sent_at: nowIso }).eq("id", row.id);
      sent++;
    } catch (e) {
      console.error("drip fail", row.id, e);
      await sb.from("drip_schedule").update({ status: "failed" }).eq("id", row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, checked: (due || []).length }), {
    status: 200,
    headers,
  });
});
