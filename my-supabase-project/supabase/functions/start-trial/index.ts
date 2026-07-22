// Edge Function: start-trial — self-serve trial signup with anti-abuse
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const DISPOSABLE = new Set([
  "tempmail.com", "guerrillamail.com", "mailinator.com", "10minutemail.com",
  "yopmail.com", "trashmail.com", "temp-mail.org", "sharklasers.com",
  "guerrillamail.info", "discard.email", "fakeinbox.com",
]);

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function randomPassword(len = 12) {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  const cors = handleCorsPreflightRequest(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 120);
    const deviceHash = String(body.device_hash || body.deviceHash || "").trim().slice(0, 128);
    const utm = {
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      ref_code: body.ref_code || body.ref || null,
    };

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email tidak valid" }), { status: 400, headers });
    }

    const domain = email.split("@")[1] || "";
    if (DISPOSABLE.has(domain)) {
      return new Response(JSON.stringify({ error: "Gunakan email asli (bukan temporary email)" }), {
        status: 400,
        headers,
      });
    }

    const url = pickEnv("SUPABASE_URL");
    const service = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers });
    }
    const sb = createClient(url, service, { auth: { persistSession: false } });

    // Domain rate limit
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: domainCount } = await sb
      .from("trial_abuse_signals")
      .select("id", { count: "exact", head: true })
      .eq("email_domain", domain)
      .gte("created_at", weekAgo);
    if ((domainCount || 0) > 5) {
      return new Response(JSON.stringify({ error: "Terlalu banyak trial dari domain ini. Coba lagi nanti." }), {
        status: 429,
        headers,
      });
    }

    // Device limit
    if (deviceHash) {
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: deviceCount } = await sb
        .from("trial_abuse_signals")
        .select("id", { count: "exact", head: true })
        .eq("device_hash", deviceHash)
        .gte("created_at", monthAgo);
      if ((deviceCount || 0) >= 2) {
        return new Response(JSON.stringify({ error: "Trial sudah digunakan di perangkat ini." }), {
          status: 429,
          headers,
        });
      }
    }

    // Cooldown 90 days per email
    const { data: lastSignal } = await sb
      .from("trial_abuse_signals")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastSignal?.created_at) {
      const days = (Date.now() - new Date(lastSignal.created_at).getTime()) / 86400000;
      if (days < 90) {
        return new Response(JSON.stringify({ error: "Cooldown trial: 90 hari sejak trial terakhir." }), {
          status: 429,
          headers,
        });
      }
    }

    // Find or create user
    let userId = "";
    let isNew = false;
    let generatedPassword: string | null = null;

    const perPage = 200;
    for (let page = 1; page <= 20 && !userId; page++) {
      const list = await sb.auth.admin.listUsers({ page, perPage });
      const u = (list.data?.users || []).find((x) => String(x.email || "").toLowerCase() === email);
      if (u?.id) userId = u.id;
      if (!(list.data?.users?.length)) break;
    }

    if (userId) {
      const { data: plan } = await sb.from("user_plans").select("plan_type, expires_at").eq("user_id", userId).maybeSingle();
      const pt = String(plan?.plan_type || "none");
      if (pt === "monthly" || pt === "lifetime") {
        return new Response(JSON.stringify({ error: "Akun ini sudah berlangganan." }), { status: 400, headers });
      }
      if (pt === "trial" && plan?.expires_at && new Date(plan.expires_at).getTime() > Date.now()) {
        return new Response(JSON.stringify({ error: "Trial masih aktif. Silakan login." }), { status: 400, headers });
      }
    } else {
      generatedPassword = randomPassword(12);
      const created = await sb.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { name: name || email.split("@")[0] },
      });
      if (created.error || !created.data.user?.id) {
        return new Response(JSON.stringify({ error: created.error?.message || "Gagal membuat akun" }), {
          status: 500,
          headers,
        });
      }
      userId = created.data.user.id;
      isNew = true;
    }

    const trialDays = Number(pickEnv("TRIAL_DAYS", "7")) || 7;
    const expires = addDays(new Date(), trialDays);

    await sb.from("user_plans").upsert({
      user_id: userId,
      plan_type: "trial",
      expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await sb.from("profiles").upsert({
      id: userId,
      name: name || email.split("@")[0],
      plan_type: "trial",
      plan_expires_at: expires.toISOString(),
      status: "active",
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    await sb.from("trial_abuse_signals").insert({
      email,
      email_domain: domain,
      device_hash: deviceHash || null,
      user_id: userId,
    });

    await sb.from("acquisition_events").insert({
      event: "trial_start",
      user_id: userId,
      email,
      ...utm,
      meta: { trial_days: trialDays },
    });

    // Schedule drip emails
    const dripTemplates = [
      { id: "trial_day0", offset: 0 },
      { id: "trial_day2", offset: 2 },
      { id: "trial_day4", offset: 4 },
      { id: "trial_day5", offset: 5 },
      { id: "trial_day7", offset: 7 },
      { id: "trial_day8", offset: 8 },
      { id: "trial_day14", offset: 14 },
    ];
    const now = new Date();
    for (const t of dripTemplates) {
      const sendAt = addDays(now, t.offset);
      await sb.from("drip_schedule").upsert({
        user_id: userId,
        template_id: t.id,
        send_at: sendAt.toISOString(),
        status: t.offset === 0 ? "pending" : "pending",
      }, { onConflict: "user_id,template_id" });
    }

    const appUrl = pickEnv("APP_URL", "https://app.monefyi.com");
    const loginBits = isNew && generatedPassword
      ? `<p>Password login sementara:</p><pre style="background:#f1f5f9;padding:10px;border-radius:8px">${generatedPassword}</pre>`
      : `<p>Login dengan email & password yang sudah kamu punya (atau reset password di app).</p>`;

    await sendEmail({
      to: email,
      subject: "Selamat datang di Monefyi!",
      html: `
        <div style="font-family:system-ui,sans-serif;color:#0f172a">
          <h2>Selamat datang${name ? `, ${name}` : ""}!</h2>
          <p>Trial kamu aktif selama <b>${trialDays} hari</b> (sampai ${expires.toISOString().slice(0, 10)}).</p>
          <p>3 hal yang bisa dilakukan sekarang:</p>
          <ol><li>Set tujuan keuangan</li><li>Catat transaksi pertama</li><li>Lihat dashboard</li></ol>
          ${loginBits}
          <p><a href="${appUrl}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Buka Monefyi</a></p>
        </div>`,
    });

    // Mark day0 sent
    await sb.from("drip_schedule")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("template_id", "trial_day0");

    return new Response(JSON.stringify({
      ok: true,
      user_id: userId,
      is_new: isNew,
      plan_type: "trial",
      expires_at: expires.toISOString(),
      app_url: appUrl,
    }), { status: 200, headers });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers,
    });
  }
});
