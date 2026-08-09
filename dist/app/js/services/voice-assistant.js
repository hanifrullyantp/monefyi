/**
 * Voice financial assistant — query/command router (Growth Fase 5.6).
 * @module services/voice-assistant
 */

/**
 * @param {string} transcript
 * @returns {{ type: string, intent: string, params: object, reply: string }|null}
 */
export function parseVoiceCommand(transcript) {
  const text = String(transcript || '').trim().toLowerCase();
  if (!text) return null;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  if (/berapa saldo|saldo (saya|ku)|uang (saya|ku)/.test(text)) {
    const safe = window.STATE?._dailySituation?.safeToSpend
      ?? window.STATE?.db?.profile?.safe_to_spend
      ?? 0;
    return {
      type: 'query',
      intent: 'balance',
      params: {},
      reply: `Safe-to-spend kamu sekitar Rp ${fmt(safe)}.`,
    };
  }

  if (/budget (makan|food)|makan (bulan|minggu)/.test(text)) {
    return {
      type: 'query',
      intent: 'budget_category',
      params: { category: 'Makan' },
      reply: 'Buka halaman budget untuk detail kategori Makan.',
      action: { target: 'budget' },
    };
  }

  if (/insight|ringkasan (bulan|minggu)/.test(text)) {
    return {
      type: 'query',
      intent: 'insights',
      params: {},
      reply: 'Cek kartu insight di beranda untuk ringkasan terbaru.',
      action: { target: 'home' },
    };
  }

  const recordMatch = text.match(/catat\s+(.+?)\s+(\d+)\s*(rb|jt|k)?/i);
  if (recordMatch) {
    let amount = Number(recordMatch[2]);
    const unit = (recordMatch[3] || '').toLowerCase();
    if (unit === 'rb' || unit === 'k') amount *= 1000;
    if (unit === 'jt') amount *= 1_000_000;
    return {
      type: 'command',
      intent: 'record_transaction',
      params: {
        notes: recordMatch[1].trim(),
        amount,
        type: 'expense',
      },
      reply: `Siap catat ${recordMatch[1]} Rp ${fmt(amount)}. Konfirmasi di preview.`,
      action: { target: 'quick_add', payload: { notes: recordMatch[1], amount } },
    };
  }

  if (/mode darurat|emergency mode/.test(text)) {
    return {
      type: 'command',
      intent: 'emergency_mode',
      params: { active: !/matikan|off/.test(text) },
      reply: /matikan|off/.test(text) ? 'Mode darurat dimatikan.' : 'Mode darurat diaktifkan.',
      action: { target: 'emergency_mode' },
    };
  }

  if (/wellness|check.?in/.test(text)) {
    return {
      type: 'command',
      intent: 'wellness_checkin',
      params: {},
      reply: 'Membuka wellness check-in mingguan.',
      action: { target: 'wellness' },
    };
  }

  return {
    type: 'unknown',
    intent: 'fallback',
    params: { text },
    reply: 'Coba: "berapa saldo saya", "catat kopi 30rb", atau "insight bulan ini".',
  };
}

/**
 * @param {string} transcript
 * @returns {Promise<object|null>}
 */
export async function handleVoiceAssistant(transcript) {
  const parsed = parseVoiceCommand(transcript);
  if (!parsed) return null;

  if (parsed.action?.target === 'emergency_mode') {
    const { setEmergencyMode } = await import('./emergency-mode.js');
    setEmergencyMode(!!parsed.params.active, 'voice_assistant');
  }

  if (parsed.action?.target === 'wellness') {
    const { showWellnessCheckinSheet } = await import('../components/wellness-checkin-sheet.js');
    showWellnessCheckinSheet({ force: true });
  }

  if (parsed.action?.target === 'quick_add' && parsed.action.payload) {
    window.dispatchEvent(new CustomEvent('monefyi:voice-quick-add', {
      detail: parsed.action.payload,
    }));
  }

  return parsed;
}

if (typeof window !== 'undefined') {
  window.monefyiVoiceAssistant = { parseVoiceCommand, handleVoiceAssistant };
}
