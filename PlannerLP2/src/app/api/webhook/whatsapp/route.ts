// PlannerLP2/src/app/api/webhook/whatsapp/route.ts
// Webhook endpoint untuk menerima pesan WhatsApp masuk dari gateway non-resmi (Fonnte, Wablas, Starsender, dll)
import { NextResponse } from 'next/server';
import {
  handleIncomingWAMessage,
  loadWABotConfig,
  sendWhatsAppMessage,
} from '@/lib/services/whatsappBotService';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Tangani variasi format payload dari gateway non-resmi:
    // Fonnte: { sender: '628xxx', message: 'halo' }
    // Wablas: { phone: '628xxx', message: 'halo' }
    // Starsender: { from: '628xxx', message: 'halo' }
    const sender =
      body.sender ||
      body.phone ||
      body.from ||
      body.data?.sender ||
      body.data?.phone ||
      '';

    const message =
      body.message ||
      body.text ||
      body.body ||
      body.data?.message ||
      '';

    if (!sender || !message) {
      return NextResponse.json(
        { ok: false, error: 'Parameter sender atau message tidak ditemukan dalam payload' },
        { status: 400 }
      );
    }

    const config = loadWABotConfig();
    if (!config.enabled) {
      return NextResponse.json({ ok: true, status: 'Bot WhatsApp sedang dinonaktifkan di pengaturan' });
    }

    // Proses pesan masuk (CS vs Karyawan)
    const result = handleIncomingWAMessage(sender, message, config);

    // Kirim balasan WhatsApp otomatis kembali ke pengirim
    if (result.replyText) {
      await sendWhatsAppMessage(sender, result.replyText, config);
    }

    // Jika membutuhkan eskalasi ke Owner (misal: negosiasi diskon atau kasbon karyawan)
    if (result.escalationRequired && config.ownerPhone) {
      const alertMsg =
        `🚨 *Notifikasi Bot WhatsApp Monefyi*\n\n` +
        `Kategori: *${result.senderType === 'employee' ? 'Koordinasi Karyawan' : 'Eskalasi Customer'}*\n` +
        `Pengirim: ${sender}\n` +
        `Isi Pesan: "${message}"\n\n` +
        `Silakan ditindaklanjuti langsung via WhatsApp.`;

      await sendWhatsAppMessage(config.ownerPhone, alertMsg, config);
    }

    return NextResponse.json({
      ok: true,
      senderType: result.senderType,
      replied: Boolean(result.replyText),
    });
  } catch (err) {
    console.error('Error pada webhook WhatsApp:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Support GET untuk health check / verifikasi endpoint di dashboard gateway
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Monefyi WhatsApp Bot Webhook',
    timestamp: new Date().toISOString(),
  });
}

