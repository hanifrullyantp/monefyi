import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { dispatchEngineNotification } from "@/lib/services/telegramBotService";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(url, key);
}

async function sendBillingEmail(to: string, subject: string, text: string) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from =
    (process.env.RESEND_FROM_EMAIL || "").trim() || "froyek <noreply@froyek.com>";
  if (!apiKey) return { sent: false, message: "RESEND_API_KEY belum diisi." };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { sent: false, message: err.slice(0, 180) };
  }
  return { sent: true, message: `Email terkirim ke ${to}` };
}

/**
 * Pengingat penagihan Meta: browser sudah bunyi di klien.
 * Route ini meneruskan pesan yang sama ke Telegram, WhatsApp, dan email admin.
 */
export async function POST(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "");
  if (!["date_soon", "threshold_soon", "payment_failed"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "Jenis peringatan tidak dikenal." }, { status: 400 });
  }

  const title = String(body.title || "Pengingat pembayaran Meta Ads").slice(0, 160);
  const message = String(body.message || "").slice(0, 1200);
  const email = String(body.email || "").trim().toLowerCase();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Pesan kosong." }, { status: 400 });
  }

  let telegramBotToken = "";
  let telegramChatId = "";
  let whatsappAdminPhone = "";
  let whatsappApiKey = "";
  try {
    const supabase = serverClient();
    const { data } = await supabase
      .from("winning_engine_config")
      .select("telegram_bot_token, telegram_chat_id, whatsapp_admin_phone, whatsapp_api_key")
      .eq("id", "default")
      .maybeSingle();
    telegramBotToken = String(data?.telegram_bot_token || "");
    telegramChatId = String(data?.telegram_chat_id || "");
    whatsappAdminPhone = String(data?.whatsapp_admin_phone || "");
    whatsappApiKey = String(data?.whatsapp_api_key || "");
  } catch {
    // Env fallback di dispatcher tetap dipakai.
  }

  const text = `${title}\n\n${message}`;
  const channels = await dispatchEngineNotification(text, {
    telegramEnabled: true,
    telegramBotToken,
    telegramChatId,
    whatsappEnabled: true,
    whatsappAdminPhone,
    whatsappApiKey,
  });

  const mail =
    email.includes("@")
      ? await sendBillingEmail(email, title, message)
      : { sent: false, message: "Email admin belum diisi di pengaturan peringatan." };

  return NextResponse.json({
    ok: channels.telegram.sent || channels.whatsapp.sent || mail.sent,
    telegram: channels.telegram,
    whatsapp: channels.whatsapp,
    email: mail,
  });
}
