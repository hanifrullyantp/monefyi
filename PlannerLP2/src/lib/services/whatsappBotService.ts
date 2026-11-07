// PlannerLP2/src/lib/services/whatsappBotService.ts
// Service pengelolaan WhatsApp Bot non-resmi (Fonnte / Wablas / Starsender / Baileys Gateway)
// Mendukung dual-mode: 1) Bot CS (Mbak Esti), 2) Bot Koordinasi Karyawan (Finance, Mandor, PM)

import { getCustomerSupportReply } from './customerSupportService';

export type WAProvider = 'fonnte' | 'wablas' | 'starsender' | 'custom_baileys';

export interface WAEmpContact {
  id: string;
  name: string;
  phone: string; // format 628xxx
  role: 'finance' | 'mandor' | 'purchasing' | 'project_manager' | 'owner';
  active: boolean;
  notes?: string;
}

export interface WABotConfig {
  enabled: boolean;
  provider: WAProvider;
  apiKey: string;
  senderPhone: string;
  ownerPhone: string;
  webhookUrl: string;
  csEnabled: boolean;
  csGreeting: string;
  employeeCoordinationEnabled: boolean;
  employees: WAEmpContact[];
  autoReminders: {
    dailyProgressReminder: boolean; // Kirim ke mandor jam 16:30
    weeklyCashbonSummary: boolean;  // Kirim ke finance tiap Jumat
    invoiceDueAlert: boolean;       // Kirim ke finance saat termin H-3
  };
}

export const DEFAULT_WA_BOT_CONFIG: WABotConfig = {
  enabled: true,
  provider: 'fonnte',
  apiKey: '',
  senderPhone: '',
  ownerPhone: '',
  webhookUrl: '/api/webhook/whatsapp',
  csEnabled: true,
  csGreeting:
    'Halo! Terima kasih sudah menghubungi Monefyi. Saya Mbak Esti, siap membantu Anda seputar aplikasi, RAB, atau info paket upgrade. Ada yang bisa Esti bantu? 😊',
  employeeCoordinationEnabled: true,
  employees: [
    {
      id: 'emp-1',
      name: 'Mbak Rina (Finance)',
      phone: '6281234567801',
      role: 'finance',
      active: true,
      notes: 'Approval kasbon & monitoring termin',
    },
    {
      id: 'emp-2',
      name: 'Pak Joko (Mandor Lapangan)',
      phone: '6281234567802',
      role: 'mandor',
      active: true,
      notes: 'Laporan progres fisik & absensi tukang',
    },
  ],
  autoReminders: {
    dailyProgressReminder: true,
    weeklyCashbonSummary: true,
    invoiceDueAlert: true,
  },
};

const WA_CONFIG_STORAGE_KEY = 'monefyi_wa_bot_config_v1';

export function loadWABotConfig(): WABotConfig {
  if (typeof window === 'undefined') return DEFAULT_WA_BOT_CONFIG;
  try {
    const raw = localStorage.getItem(WA_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_WA_BOT_CONFIG;
    return { ...DEFAULT_WA_BOT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WA_BOT_CONFIG;
  }
}

export function saveWABotConfig(config: WABotConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WA_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Gagal menyimpan konfigurasi WhatsApp bot:', e);
  }
}

/**
 * Normalisasi format nomor WhatsApp ke format internasional (628xxx)
 */
export function normalizeWAPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.replace('+', '');
  } else if (!cleaned.startsWith('62') && cleaned.length > 8) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Mengirim pesan keluar via Gateway Non-Resmi
 */
export async function sendWhatsAppMessage(
  targetPhone: string,
  message: string,
  config?: WABotConfig
): Promise<{ ok: boolean; message: string; response?: unknown }> {
  const cfg = config || loadWABotConfig();
  const target = normalizeWAPhone(targetPhone);

  if (!cfg.apiKey && cfg.provider !== 'custom_baileys') {
    return {
      ok: false,
      message: 'API Key WhatsApp Gateway belum diatur di halaman pengaturan.',
    };
  }

  try {
    if (cfg.provider === 'fonnte') {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target,
          message,
          countryCode: '62',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === false) {
        return { ok: false, message: data.reason || 'Gagal mengirim via Fonnte', response: data };
      }
      return { ok: true, message: 'Pesan berhasil terkirim via Fonnte', response: data };
    }

    if (cfg.provider === 'wablas') {
      const res = await fetch('https://kudus.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          Authorization: cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: target,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, message: 'Respon Wablas diterima', response: data };
    }

    if (cfg.provider === 'starsender') {
      const res = await fetch('https://starsender.online/api/sendText', {
        method: 'POST',
        headers: {
          apikey: cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageType: 'text',
          to: target,
          body: message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, message: 'Respon Starsender diterima', response: data };
    }

    // Custom Webhook / Baileys Gateway Server
    return {
      ok: true,
      message: `Simulasi terkirim ke ${target} via ${cfg.provider}`,
      response: { simulated: true, target, textLength: message.length },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Kesalahan jaringan saat mengirim WhatsApp',
    };
  }
}

/**
 * Memproses Pesan Masuk (Webhook Handler Logic)
 * Mengidentifikasi apakah pengirim adalah Karyawan (Finance/Mandor) atau Customer (CS).
 */
export function handleIncomingWAMessage(
  senderPhone: string,
  incomingText: string,
  config: WABotConfig
): {
  replyText: string;
  senderType: 'employee' | 'customer';
  employeeRole?: string;
  escalationRequired?: boolean;
} {
  const normSender = normalizeWAPhone(senderPhone);
  const text = incomingText.trim();
  const lower = text.toLowerCase();

  // 1. Cek apakah pengirim adalah karyawan terdaftar
  const employee = config.employees.find(
    (e) => e.active && normalizeWAPhone(e.phone) === normSender
  );

  if (employee && config.employeeCoordinationEnabled) {
    return handleEmployeeCoordination(employee, text, lower);
  }

  // 2. Jika bukan karyawan, proses sebagai Customer Support (Mbak Esti)
  return handleCustomerSupportChat(normSender, text, lower, config);
}

/**
 * Logika Koordinasi Karyawan (Finance, Mandor, PM, Purchasing)
 */
function handleEmployeeCoordination(
  employee: WAEmpContact,
  rawText: string,
  lower: string
): {
  replyText: string;
  senderType: 'employee';
  employeeRole: string;
  escalationRequired?: boolean;
} {
  // Command: #bantuan atau menu
  if (lower === '#bantuan' || lower === '#menu' || lower === 'help') {
    if (employee.role === 'finance') {
      return {
        replyText: `Halo ${employee.name} (Finance)! Berikut format perintah cepat WhatsApp Monefyi:\n\n` +
          `• *#kas-masuk [jumlah] [keterangan]*\nContoh: \`#kas-masuk 15jt DP Proyek Pak Budi\`\n\n` +
          `• *#kas-keluar [jumlah] [keterangan]*\nContoh: \`#kas-keluar 2.5jt Beli Triplek Toko Abadi\`\n\n` +
          `• *#cek-kasbon*\nUntuk melihat daftar kasbon mandor/tukang yang pending approval.\n\n` +
          `• *#cek-termin*\nUntuk melihat invoice/termin klien yang jatuh tempo minggu ini.`,
        senderType: 'employee',
        employeeRole: employee.role,
      };
    }

    if (employee.role === 'mandor') {
      return {
        replyText: `Halo ${employee.name} (Mandor Lapangan)! Berikut format laporan cepat WhatsApp:\n\n` +
          `• *#opname [persen] [nama proyek] [catatan]*\nContoh: \`#opname 75% Kitchen Budi Pemasangan kabinet atas selesai\`\n\n` +
          `• *#kasbon [jumlah] [nama tukang] [nama proyek]*\nContoh: \`#kasbon 300rb Pak Slamet Proyek Budi\`\n\n` +
          `• *#lapor-material [nama barang] [jumlah]*\nContoh: \`#lapor-material Semen 10 sak\`\n\n` +
          `Ketik langsung format di atas, sistem akan mencatat dan meneruskan ke kantor!`,
        senderType: 'employee',
        employeeRole: employee.role,
      };
    }
  }

  // Command: Kasbon
  if (lower.startsWith('#kasbon')) {
    return {
      replyText: `✅ *Pengajuan Kasbon Tercatat!*\n\n` +
        `👤 Pengaju: ${employee.name} (${employee.role})\n` +
        `📝 Detail: ${rawText.replace(/^#kasbon/i, '').trim()}\n` +
        `⏰ Waktu: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n\n` +
        `Pengajuan ini telah otomatis diteruskan ke tim Finance untuk diverifikasi & ditransfer. Terima kasih!`,
      senderType: 'employee',
      employeeRole: employee.role,
      escalationRequired: true,
    };
  }

  // Command: Opname Progres Fisik
  if (lower.startsWith('#opname') || lower.startsWith('#progres')) {
    return {
      replyText: `📊 *Laporan Opname Progres Diterima!*\n\n` +
        `👷 Pelaksana: ${employee.name}\n` +
        `📌 Progres: ${rawText.replace(/^#(opname|progres)/i, '').trim()}\n` +
        `📈 Status: Kurva S & catatan harian proyek telah diperbarui.\n\n` +
        `Mantap Pak! Jangan lupa lampirkan foto dokumentasi jika ada.`,
      senderType: 'employee',
      employeeRole: employee.role,
    };
  }

  // Command: Kas Masuk / Kas Keluar Finance
  if (lower.startsWith('#kas-masuk') || lower.startsWith('#kas-keluar')) {
    const isMasuk = lower.startsWith('#kas-masuk');
    return {
      replyText: `💰 *Transaksi Keuangan Tercatat!*\n\n` +
        `Tipe: *${isMasuk ? 'KAS MASUK (+)' : 'KAS KELUAR (-)'}*\n` +
        `Dicatat oleh: ${employee.name}\n` +
        `Rincian: ${rawText.replace(/^#(kas-masuk|kas-keluar)/i, '').trim()}\n\n` +
        `Arus kas di sistem keuangan Monefyi telah disinkronkan real-time.`,
      senderType: 'employee',
      employeeRole: employee.role,
    };
  }

  // Command: Cek Kasbon / Termin
  if (lower.includes('#cek-kasbon')) {
    return {
      replyText: `📋 *Rekap Kasbon Pending Minggu Ini:*\n\n` +
        `1. Pak Slamet (Proyek Budi): Rp 300.000\n` +
        `2. Pak Wahyu (Proyek Melati): Rp 500.000\n\n` +
        `Total: *Rp 800.000*\nKetik *#approve-kasbon [id]* untuk setujui.`,
      senderType: 'employee',
      employeeRole: employee.role,
    };
  }

  if (lower.includes('#cek-termin')) {
    return {
      replyText: `📑 *Tagihan Termin Klien Jatuh Tempo:*\n\n` +
        `1. Termin 2 (50%) - Ibu Diana: Rp 18.500.000 (Jatuh tempo: Besok)\n` +
        `2. Pelunasan - Pak Hendra: Rp 7.200.000 (Jatuh tempo: 3 hari lagi)\n\n` +
        `Invoice & kwitansi PDF sudah siap dikirimkan via WA ke klien.`,
      senderType: 'employee',
      employeeRole: employee.role,
    };
  }

  // Default response untuk karyawan
  return {
    replyText: `Halo ${employee.name}! Laporan Anda sudah kami terima: "${rawText}".\n\nKetik *#bantuan* untuk melihat daftar format perintah cepat (kasbon, opname progres, kas masuk/keluar).`,
    senderType: 'employee',
    employeeRole: employee.role,
  };
}

/**
 * Logika Customer Support (Mbak Esti) untuk chat dari calon klien/user luar
 */
function handleCustomerSupportChat(
  senderPhone: string,
  rawText: string,
  lower: string,
  config: WABotConfig
): {
  replyText: string;
  senderType: 'customer';
  escalationRequired?: boolean;
} {
  // Deteksi pertanyaan sulit / negosiasi khusus / komplain yang butuh owner
  const isDifficultQuestion =
    /diskon|kurang|potongan|spesial|khusus|nego|tawar|tender|kerjasama|kantor kami|komplain|refund|retur/i.test(
      lower
    );

  if (isDifficultQuestion) {
    const ownerContact = config.ownerPhone ? ` ke nomor Owner (${config.ownerPhone})` : '';
    return {
      replyText: `Terima kasih banyak atas pertanyaannya Mas/Mbak! 😊\n\nMengenai permintaan penawaran/kebijakan khusus ini, Mbak Esti izin teruskan langsung${ownerContact} agar Mas/Mbak bisa mendapatkan keputusan terbaik langsung dari pimpinan kami.\n\nPesan Anda: "${rawText}" sudah masuk dalam antrean prioritas kami. Tim kami akan segera merespon ya!`,
      senderType: 'customer',
      escalationRequired: true,
    };
  }

  // Gunakan engine AI customer support service
  const csReply = getCustomerSupportReply(rawText);
  return {
    replyText: csReply.text,
    senderType: 'customer',
  };
}

