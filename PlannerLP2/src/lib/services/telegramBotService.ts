/**
 * Dispatcher Notifikasi Multi-Kanal (Telegram Bot + WhatsApp Bot) untuk Monefyi Winning Engine.
 * Seluruh pesan bebas emoticon, rapi, terstruktur, dan jelas agar user dapat memantau
 * rekomendasi Mode Cuan maupun eksekusi otomatis Mode Advance dari HP.
 */

export interface EngineNotificationConfig {
  whatsappEnabled?: boolean;
  whatsappAdminPhone?: string;
  whatsappGatewayUrl?: string;
  whatsappApiKey?: string;
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface DispatchNotificationResult {
  telegram: { sent: boolean; message: string };
  whatsapp: { sent: boolean; message: string };
}

/**
 * Mengirim pesan ke Telegram Bot API.
 */
export async function sendTelegramAlert(
  text: string,
  botToken?: string,
  chatId?: string
): Promise<{ sent: boolean; message: string }> {
  const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const targetChatId = (chatId || process.env.TELEGRAM_CHAT_ID || "").trim();

  if (!token || !targetChatId) {
    return {
      sent: false,
      message: "Telegram Bot Token atau Chat ID belum dikonfigurasi.",
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return {
        sent: true,
        message: `Terkirim ke Telegram Chat ID ${targetChatId}`,
      };
    }
    return {
      sent: false,
      message: data?.description || "Gagal mengirim pesan Telegram.",
    };
  } catch (err: any) {
    return {
      sent: false,
      message: err?.message || "Koneksi ke Telegram API gagal.",
    };
  }
}

/**
 * Mengirim pesan ke WhatsApp Gateway (Fonnte / Wablas / Cloud API).
 */
export async function sendWhatsAppAlert(
  text: string,
  phone?: string,
  gatewayUrl?: string,
  apiKey?: string
): Promise<{ sent: boolean; message: string }> {
  const targetPhone = (phone || process.env.WHATSAPP_ADMIN_PHONE || "").replace(/[^0-9]/g, "");
  const token = (apiKey || process.env.FONNTE_TOKEN || process.env.WHATSAPP_API_KEY || "").trim();
  const endpoint = (
    gatewayUrl ||
    process.env.WHATSAPP_GATEWAY_URL ||
    "https://api.fonnte.com/send"
  ).trim();

  if (!targetPhone || !token) {
    return {
      sent: false,
      message: "Nomor WhatsApp Admin atau Token Gateway WA belum dikonfigurasi.",
    };
  }

  const normalizedPhone = targetPhone.startsWith("0")
    ? "62" + targetPhone.slice(1)
    : targetPhone;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        target: normalizedPhone,
        message: text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.status !== false)) {
      return {
        sent: true,
        message: `Terkirim ke WhatsApp ${normalizedPhone}`,
      };
    }
    return {
      sent: false,
      message: data?.reason || data?.message || "Gagal mengirim ke gateway WhatsApp.",
    };
  } catch (err: any) {
    return {
      sent: false,
      message: err?.message || "Koneksi ke WhatsApp Gateway gagal.",
    };
  }
}

/**
 * Mengirim laporan Winning Engine ke kedua kanal (WhatsApp & Telegram) sekaligus.
 */
export async function dispatchEngineNotification(
  text: string,
  config?: EngineNotificationConfig
): Promise<DispatchNotificationResult> {
  const [tgResult, waResult] = await Promise.all([
    config?.telegramEnabled !== false
      ? sendTelegramAlert(text, config?.telegramBotToken, config?.telegramChatId)
      : Promise.resolve({ sent: false, message: "Notifikasi Telegram dinonaktifkan." }),
    config?.whatsappEnabled !== false
      ? sendWhatsAppAlert(
          text,
          config?.whatsappAdminPhone,
          config?.whatsappGatewayUrl,
          config?.whatsappApiKey
        )
      : Promise.resolve({ sent: false, message: "Notifikasi WhatsApp dinonaktifkan." }),
  ]);

  return {
    telegram: tgResult,
    whatsapp: waResult,
  };
}

