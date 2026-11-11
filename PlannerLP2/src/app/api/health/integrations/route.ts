import { NextRequest, NextResponse } from "next/server";
import { getActiveMayarApiKey, getActiveMayarApiUrl } from "@/lib/services/mayarHealthService";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(req: NextRequest) {
  const result = {
    mayar: { connected: false, name: "Mayar", message: "Memeriksa..." },
    meta: { connected: false, name: "Meta Ads", message: "Memeriksa..." },
    wa: { connected: false, name: "WhatsApp", message: "Memeriksa..." },
    ai: { connected: false, name: "AI Engine", message: "Memeriksa..." },
    timestamp: new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();
  let dbConfig: Record<string, any> | null = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("winning_engine_config")
        .select("*")
        .eq("id", "default")
        .maybeSingle();
      dbConfig = data;
    } catch (e) {
      console.warn("Could not load winning_engine_config:", e);
    }
  }

  // 1. Cek Mayar
  try {
    const mayarKey = await getActiveMayarApiKey();
    const mayarUrl = await getActiveMayarApiUrl();
    if (mayarKey && mayarKey.length > 5) {
      const balRes = await fetch(`${mayarUrl}/hl/v2/balances`, {
        headers: { Authorization: `Bearer ${mayarKey}` },
        cache: "no-store",
      });
      if (balRes.ok) {
        result.mayar = { connected: true, name: "Mayar", message: "Terhubung (Live)" };
      } else {
        result.mayar = { connected: false, name: "Mayar", message: `HTTP ${balRes.status} Unauthorized` };
      }
    } else {
      result.mayar = { connected: false, name: "Mayar", message: "API Key Belum Diisi" };
    }
  } catch (err: any) {
    result.mayar = { connected: false, name: "Mayar", message: err?.message || "Koneksi Gagal" };
  }

  // 2. Cek Meta Ads
  try {
    const metaToken =
      process.env.META_ACCESS_TOKEN ||
      dbConfig?.meta_access_token ||
      "";
    if (metaToken && metaToken.length > 10) {
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${metaToken}`,
        { cache: "no-store" }
      );
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        result.meta = {
          connected: true,
          name: "Meta Ads",
          message: `Terhubung (${metaJson.name || "Akun Meta"})`,
        };
      } else {
        result.meta = { connected: false, name: "Meta Ads", message: "Token Expired / Tidak Valid" };
      }
    } else {
      result.meta = { connected: false, name: "Meta Ads", message: "Access Token Kosong" };
    }
  } catch (err: any) {
    result.meta = { connected: false, name: "Meta Ads", message: err?.message || "Koneksi Gagal" };
  }

  // 3. Cek WhatsApp Bot
  try {
    const waToken =
      process.env.FONNTE_TOKEN ||
      process.env.WHATSAPP_API_KEY ||
      dbConfig?.batch_diagnostics_snapshot?.whatsapp_config?.token ||
      dbConfig?.telegram_bot_token ||
      "";
    const waPhone =
      process.env.NEXT_PUBLIC_ADMIN_PHONE ||
      process.env.ADMIN_WHATSAPP_PHONE ||
      "628";

    if (waToken && waToken.length > 5) {
      result.wa = { connected: true, name: "WhatsApp", message: "Gateway Aktif" };
    } else if (waPhone && waPhone.length >= 8) {
      // Direct WA Click-to-Chat Ready
      result.wa = { connected: true, name: "WhatsApp", message: "Direct WA Ready" };
    } else {
      result.wa = { connected: false, name: "WhatsApp", message: "Nomor / Gateway Kosong" };
    }
  } catch (err: any) {
    result.wa = { connected: false, name: "WhatsApp", message: err?.message || "Gagal" };
  }

  // 4. Cek AI Engine (Gemini / OpenAI / OpenRouter)
  try {
    const aiKey =
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      dbConfig?.gemini_api_key ||
      "";
    if (aiKey && aiKey.length > 8) {
      result.ai = { connected: true, name: "AI Engine", message: "GEMINI Ready" };
    } else {
      result.ai = { connected: false, name: "AI Engine", message: "API Key AI Belum Diisi" };
    }
  } catch (err: any) {
    result.ai = { connected: false, name: "AI Engine", message: err?.message || "Gagal" };
  }

  const allConnected =
    result.mayar.connected &&
    result.meta.connected &&
    result.wa.connected &&
    result.ai.connected;

  return NextResponse.json({
    ok: true,
    allConnected,
    integrations: result,
  });
}

