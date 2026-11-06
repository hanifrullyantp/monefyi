/**
 * Layanan integrasi komunikasi Telegram & koordinasi proaktif tim lapangan oleh AI.
 * Memungkinkan AI General Manager dan Site Manager menghubungi mandor / tukang / staf
 * lapangan secara proaktif berdasarkan peran/jabatan mereka.
 */

import { supabase } from '../lib/supabase';
import { logTrace } from './runtimeTracer';

export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  enabled: boolean;
  defaultChannelChatId?: string;
}

export interface FieldMemberContact {
  memberId: string;
  userId: string;
  name: string;
  role: string;
  position: string;
  phone?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  proactiveReminders: {
    dailyLog: boolean; // Pengingat isi progres fisik harian (mandor/site manager)
    attendance: boolean; // Pengingat absensi pagi & pulang (tukang/staf)
    cashbonNotice: boolean; // Notifikasi status kasbon
    urgentTasks: boolean; // Tugas kritis mendekati tenggat
  };
}

export interface ProactiveTriggerRecord {
  id: string;
  timestamp: string;
  targetMemberName: string;
  targetRole: string;
  category: 'dailyLog' | 'attendance' | 'cashbonNotice' | 'urgentTasks';
  message: string;
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
}

const STORAGE_TELEGRAM_CFG = 'monefyi_telegram_config_v1';
const STORAGE_FIELD_CONTACTS = 'monefyi_field_member_contacts_v1';
const STORAGE_PROACTIVE_LOGS = 'monefyi_proactive_triggers_v1';

export function loadTelegramConfig(): TelegramConfig {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_TELEGRAM_CFG) : null;
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback */
  }
  return {
    botToken: '',
    botUsername: '',
    enabled: false,
    defaultChannelChatId: '',
  };
}

export function saveTelegramConfig(config: TelegramConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_TELEGRAM_CFG, JSON.stringify(config));
    }
  } catch {
    /* ignore */
  }
}

export function loadFieldMemberContacts(): Record<string, FieldMemberContact> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_FIELD_CONTACTS) : null;
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback */
  }
  return {};
}

export function saveFieldMemberContacts(contacts: Record<string, FieldMemberContact>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_FIELD_CONTACTS, JSON.stringify(contacts));
    }
  } catch {
    /* ignore */
  }
}

export function loadProactiveTriggers(): ProactiveTriggerRecord[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PROACTIVE_LOGS) : null;
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback */
  }
  return [];
}

export function addProactiveTriggerLog(log: Omit<ProactiveTriggerRecord, 'id' | 'timestamp'>): ProactiveTriggerRecord {
  const item: ProactiveTriggerRecord = {
    ...log,
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const list = [item, ...loadProactiveTriggers()].slice(0, 50);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PROACTIVE_LOGS, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
  return item;
}

/**
 * Mengirim pesan ke Telegram Bot API
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, error: 'Token Bot dan Chat ID wajib diisi' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      const err = data.description || `HTTP ${res.status}`;
      logTrace('telegram_send_fail', { component: 'telegramService', message: err, metadata: { chatId: cleanChatId } }, 'warning');
      return { ok: false, error: err };
    }

    logTrace('telegram_send_ok', { component: 'telegramService', message: 'Message delivered', metadata: { chatId: cleanChatId } }, 'info');
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logTrace('telegram_network_error', { component: 'telegramService', message: msg }, 'error');
    return { ok: false, error: msg };
  }
}

/**
 * Tes koneksi bot Telegram dengan membaca profil bot (getMe)
 */
export async function testTelegramBot(token: string): Promise<{ ok: boolean; username?: string; name?: string; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) return { ok: false, error: 'Token bot belum diisi' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || 'Gagal membaca info bot dari Telegram API' };
    }
    return {
      ok: true,
      username: data.result?.username,
      name: data.result?.first_name,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Koneksi ke api.telegram.org gagal' };
  }
}

/**
 * Pemicu proaktif AI: Memilih karyawan relevan sesuai jabatannya lalu mengirim pesan proaktif.
 * - Mandor / Site Manager: Diminta laporkan progres harian & pekerja hadir
 * - Tukang: Pengingat absensi & checklist kerja
 * - Keuangan: Konfirmasi nota pengeluaran / kasbon
 */
export async function dispatchProactiveAIOutreach(params: {
  member: FieldMemberContact;
  category: ProactiveTriggerRecord['category'];
  projectName?: string;
  customNote?: string;
}): Promise<{ ok: boolean; summary: string }> {
  const cfg = loadTelegramConfig();
  const { member, category, projectName = 'Proyek Aktif', customNote } = params;

  let message = '';
  switch (category) {
    case 'dailyLog':
      message = `Halo <b>${member.name}</b> (${member.position || member.role})!\n` +
        `👔 <i>Pesan Otomatis dari General Manager AI:</i>\n` +
        `Mohon update opname progres pekerjaan & jumlah tukang yang hadir di lapangan hari ini untuk <b>${projectName}</b>.\n` +
        (customNote ? `Catatan: ${customNote}\n` : '') +
        `Ketik atau balas pesan ini agar laporan harian langsung tercatat ke sistem.`;
      break;
    case 'attendance':
      message = `Halo <b>${member.name}</b>!\n` +
        `👥 <i>Pesan AI HRD:</i>\n` +
        `Jangan lupa konfirmasi absensi kehadiran kerja Anda hari ini di proyek <b>${projectName}</b>.\n` +
        (customNote ? `Catatan: ${customNote}\n` : '') +
        `Semoga pekerjaan hari ini berjalan lancar dan aman!`;
      break;
    case 'cashbonNotice':
      message = `Halo <b>${member.name}</b>!\n` +
        `💰 <i>Pesan AI Keuangan & HRD:</i>\n` +
        (customNote || `Pengajuan kasbon Anda telah diperbarui statusnya di sistem perusahaan.`);
      break;
    case 'urgentTasks':
      message = `⚠️ <b>PERINGATAN TUGAS TIM</b> — Halo <b>${member.name}</b>!\n` +
        `Ada pekerjaan penting di <b>${projectName}</b> yang mendekati batas waktu penyerahan:\n` +
        `<b>${customNote || 'Pemeriksaan pekerjaan di lapangan'}</b>\n` +
        `Mohon segera selesaikan atau laporkan kendala ke Site Manager.`;
      break;
  }

  if (cfg.enabled && cfg.botToken && member.telegramChatId) {
    const res = await sendTelegramMessage(cfg.botToken, member.telegramChatId, message);
    addProactiveTriggerLog({
      targetMemberName: member.name,
      targetRole: member.position || member.role,
      category,
      message,
      status: res.ok ? 'sent' : 'failed',
      error: res.error,
    });
    return {
      ok: res.ok,
      summary: res.ok
        ? `Terkirim ke Telegram ${member.name} (ID: ${member.telegramChatId})`
        : `Gagal kirim ke Telegram: ${res.error}`,
    };
  }

  // Jika Telegram belum tersambung atau Chat ID belum ada, simulasikan & catat ke log proaktif AI
  addProactiveTriggerLog({
    targetMemberName: member.name,
    targetRole: member.position || member.role,
    category,
    message,
    status: 'simulated',
    error: !member.telegramChatId ? 'Chat ID Telegram belum diatur' : 'Bot Telegram belum diaktifkan',
  });

  return {
    ok: true,
    summary: `Pesan koordinasi AI disimulasikan & dicatat di antrean sistem (${member.name} - ${member.position || member.role}).`,
  };
}

