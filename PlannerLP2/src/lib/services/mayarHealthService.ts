import { createClient } from "@supabase/supabase-js";
import { dispatchEngineNotification } from "./telegramBotService";

export interface MayarHealthStatus {
  ok: boolean;
  status: "healthy" | "unauthorized" | "error" | "unconfigured";
  httpStatusCode?: number;
  message: string;
  balance?: number;
  lastChecked: string;
  lastAlertSent?: string | null;
  apiUrl: string;
  isFallbackActive: boolean;
}

// In-memory cache for fast access & rate-limiting alerts
let cachedHealthStatus: MayarHealthStatus = {
  ok: false,
  status: "unconfigured",
  message: "Belum diperiksa",
  lastChecked: new Date().toISOString(),
  lastAlertSent: null,
  apiUrl: "https://api.mayar.id",
  isFallbackActive: false,
};

let lastAlertTimestamp = 0;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown to avoid spamming admin

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Mengambil Mayar API Key aktif (Prioritas: Supabase -> ENV)
 */
export async function getActiveMayarApiKey(): Promise<string> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("winning_engine_config")
        .select("batch_diagnostics_snapshot")
        .eq("id", "default")
        .maybeSingle();

      const snapshot = data?.batch_diagnostics_snapshot as Record<string, any> | null;
      const dbKey = snapshot?.mayar_config?.apiKey;
      if (dbKey && typeof dbKey === "string" && dbKey.trim().length > 5) {
        return dbKey.trim();
      }
    }
  } catch (err) {
    console.warn("[MayarHealth] Supabase fetch error, fallback to env:", err);
  }

  return (
    process.env.MAYAR_API_KEY ||
    process.env.MAYAR_API_KEY_SANDBOX ||
    ""
  ).trim();
}

/**
 * Mengambil Mayar API URL aktif (Prioritas: Supabase -> ENV -> Default Production)
 */
export async function getActiveMayarApiUrl(): Promise<string> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("winning_engine_config")
        .select("batch_diagnostics_snapshot")
        .eq("id", "default")
        .maybeSingle();

      const snapshot = data?.batch_diagnostics_snapshot as Record<string, any> | null;
      const dbUrl = snapshot?.mayar_config?.apiUrl;
      if (dbUrl && typeof dbUrl === "string" && dbUrl.trim().length > 5) {
        return dbUrl.trim().replace(/\/$/, "");
      }
    }
  } catch {
    // fallback
  }

  const envUrl = process.env.MAYAR_API_URL;
  if (envUrl && envUrl.trim().length > 5) {
    return envUrl.trim().replace(/\/$/, "");
  }

  return "https://api.mayar.id";
}

/**
 * Menyimpan Mayar API Key dan URL ke Supabase
 */
export async function saveMayarConfig(
  apiKey: string,
  apiUrl: string = "https://api.mayar.id"
): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return { ok: false, message: "Supabase client belum terkonfigurasi" };
    }

    const { data: existing } = await supabase
      .from("winning_engine_config")
      .select("batch_diagnostics_snapshot")
      .eq("id", "default")
      .maybeSingle();

    const prevSnapshot =
      (existing?.batch_diagnostics_snapshot as Record<string, any>) || {};

    const updatedSnapshot = {
      ...prevSnapshot,
      mayar_config: {
        apiKey: apiKey.trim(),
        apiUrl: apiUrl.trim().replace(/\/$/, ""),
        updatedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from("winning_engine_config")
      .update({
        batch_diagnostics_snapshot: updatedSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    if (error) {
      return { ok: false, message: `Gagal menyimpan ke database: ${error.message}` };
    }

    return { ok: true, message: "Kredensial Mayar berhasil disimpan." };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal menyimpan konfigurasi Mayar" };
  }
}

/**
 * Mengambil nomor telepon admin & bot token untuk pengiriman alert
 */
async function getAdminAlertConfig() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("winning_engine_config")
        .select("whatsapp_admin_phone, telegram_chat_id, telegram_bot_token, whatsapp_api_key")
        .eq("id", "default")
        .maybeSingle();

      return {
        whatsappAdminPhone:
          data?.whatsapp_admin_phone || process.env.WHATSAPP_ADMIN_PHONE || "",
        whatsappApiKey:
          data?.whatsapp_api_key || process.env.WHATSAPP_API_KEY || process.env.FONNTE_TOKEN || "",
        telegramBotToken:
          data?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || "",
        telegramChatId:
          data?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || "",
      };
    }
  } catch {
    // fallback
  }

  return {
    whatsappAdminPhone: process.env.WHATSAPP_ADMIN_PHONE || "",
    whatsappApiKey: process.env.WHATSAPP_API_KEY || process.env.FONNTE_TOKEN || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  };
}

/**
 * Mengirim notifikasi alert darurat via WhatsApp & Telegram jika Mayar Unauthorized / Error
 * Dilengkapi proteksi anti-spam (Rate Limiting: max 1 alert per 30 menit).
 */
export async function sendMayarAlert(params: {
  status: number;
  reason: string;
  context?: string;
  forceSend?: boolean;
}): Promise<{ sent: boolean; reason: string }> {
  const now = Date.now();
  if (!params.forceSend && now - lastAlertTimestamp < ALERT_COOLDOWN_MS) {
    const remainingMins = Math.ceil((ALERT_COOLDOWN_MS - (now - lastAlertTimestamp)) / 60000);
    return {
      sent: false,
      reason: `Alert disaring (Rate-limit active, tunggu ${remainingMins} menit lagi untuk mencegah spam)`,
    };
  }

  const config = await getAdminAlertConfig();
  const timeStr = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  });

  const alertText = [
    `🚨 *ALERT MAYAR PAYMENT GATEWAY (MONEFYI)* 🚨`,
    ``,
    `⚠️ *STATUS: UNAUTHORIZED (HTTP ${params.status})*`,
    `🕒 *Waktu:* ${timeStr} WIB`,
    `❌ *Penyebab:* ${params.reason}`,
    params.context ? `📋 *Konteks Transaksi:* ${params.context}` : ``,
    ``,
    `🛡️ *Tindakan Otomatis Sistem:*`,
    `Sistem checkout otomatis mengaktifkan *MODE FALLBACK (Lynk.id / WhatsApp)*. Pembeli tidak terblokir dan tetap bisa menyelesaikan transaksi.`,
    ``,
    `👉 *Langkah Penyelesaian Segera:*`,
    `1. Login ke dashboard Mayar (https://dashboard.mayar.id).`,
    `2. Salin API Key aktif yang baru.`,
    `3. Masuk ke Admin Monefyi -> Pengaturan -> Pembayaran Mayar.`,
    `4. Tempel API Key baru & klik "Test & Simpan".`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await dispatchEngineNotification(alertText, {
      whatsappEnabled: true,
      whatsappAdminPhone: config.whatsappAdminPhone,
      whatsappApiKey: config.whatsappApiKey,
      telegramEnabled: true,
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
    });

    lastAlertTimestamp = now;
    cachedHealthStatus.lastAlertSent = new Date().toISOString();

    return { sent: true, reason: "Alert berhasil dikirim ke Admin WhatsApp & Telegram" };
  } catch (err: any) {
    return { sent: false, reason: err?.message || "Gagal mengirim alert" };
  }
}

/**
 * Pengecekan berkala kesehatan koneksi Mayar API
 */
export async function checkMayarHealth(options?: {
  customKey?: string;
  customUrl?: string;
  triggerAlertOnFail?: boolean;
}): Promise<MayarHealthStatus> {
  const apiKey = (options?.customKey || (await getActiveMayarApiKey())).trim();
  const apiUrl = (options?.customUrl || (await getActiveMayarApiUrl())).trim();

  if (!apiKey) {
    cachedHealthStatus = {
      ok: false,
      status: "unconfigured",
      message: "API Key Mayar belum dikonfigurasi.",
      lastChecked: new Date().toISOString(),
      apiUrl,
      isFallbackActive: true,
    };
    return cachedHealthStatus;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${apiUrl}/hl/v2/balances`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      const balanceAmount =
        typeof json?.data?.balance === "number"
          ? json.data.balance
          : typeof json?.balance === "number"
          ? json.balance
          : 0;

      cachedHealthStatus = {
        ok: true,
        status: "healthy",
        httpStatusCode: 200,
        message: "Koneksi Mayar aktif dan terverifikasi.",
        balance: balanceAmount,
        lastChecked: new Date().toISOString(),
        apiUrl,
        isFallbackActive: false,
      };
      return cachedHealthStatus;
    }

    if (res.status === 401) {
      cachedHealthStatus = {
        ok: false,
        status: "unauthorized",
        httpStatusCode: 401,
        message: "Unauthorized (HTTP 401): API Key Mayar kedaluwarsa atau tidak valid.",
        lastChecked: new Date().toISOString(),
        apiUrl,
        isFallbackActive: true,
      };

      if (options?.triggerAlertOnFail !== false) {
        await sendMayarAlert({
          status: 401,
          reason: "Kredensial API Key Mayar ditolak (Unauthorized 401). Mohon perbarui di dashboard Monefyi.",
        });
      }

      return cachedHealthStatus;
    }

    cachedHealthStatus = {
      ok: false,
      status: "error",
      httpStatusCode: res.status,
      message: json?.messages || json?.error || `Mayar API error (HTTP ${res.status})`,
      lastChecked: new Date().toISOString(),
      apiUrl,
      isFallbackActive: true,
    };
    return cachedHealthStatus;
  } catch (err: any) {
    cachedHealthStatus = {
      ok: false,
      status: "error",
      message: err?.name === "AbortError" ? "Koneksi Mayar timeout (> 8 detik)" : err?.message || "Gagal menghubungi Mayar API",
      lastChecked: new Date().toISOString(),
      apiUrl,
      isFallbackActive: true,
    };
    return cachedHealthStatus;
  }
}

/**
 * Mengambil status kesehatan terakhir dari memory cache
 */
export function getCachedMayarHealth(): MayarHealthStatus {
  return cachedHealthStatus;
}
