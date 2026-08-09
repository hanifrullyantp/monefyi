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

  if (/life event|rencana (nikah|rumah|bayi|pendidikan)|milestone/.test(text)) {
    return {
      type: 'command',
      intent: 'life_event',
      params: {},
      reply: 'Membuka Life Event Planner.',
      action: { target: 'life_event' },
    };
  }

  if (/simulasi|what.?if|kalau beli/.test(text)) {
    return {
      type: 'command',
      intent: 'what_if',
      params: {},
      reply: 'Membuka simulasi what-if.',
      action: { target: 'what_if' },
    };
  }

  if (/wishlist|daftar keinginan/.test(text)) {
    return {
      type: 'command',
      intent: 'wishlist',
      params: {},
      reply: 'Membuka wishlist impulse.',
      action: { target: 'wishlist' },
    };
  }

  if (/rencana darurat|emergency plan|assessment darurat/.test(text)) {
    return {
      type: 'command',
      intent: 'emergency_plan',
      params: {},
      reply: 'Membuka assessment mode darurat.',
      action: { target: 'emergency_plan' },
    };
  }

  if (/utang|debt planner|cicilan utang/.test(text)) {
    return {
      type: 'query',
      intent: 'debt_planner',
      params: {},
      reply: 'Membuka debt payoff planner.',
      action: { target: 'debt_planner' },
    };
  }

  if (/transaksi terakhir|cek transaksi/.test(text)) {
    const txs = window.STATE?.transactions || [];
    const last = txs[txs.length - 1];
    const reply = last
      ? `Transaksi terakhir: ${last.merchant || last.category || '—'} Rp ${fmt(Math.abs(Number(last.amount || 0)))} (${String(last.date || '').slice(0, 10)})`
      : 'Belum ada transaksi tercatat.';
    return { type: 'query', intent: 'last_transaction', params: {}, reply };
  }

  return {
    type: 'unknown',
    intent: 'fallback',
    params: { text },
    reply: 'Coba: "berapa saldo", "catat kopi 30rb", "rencana nikah", atau "simulasi beli".',
  };
}

/**
 * Execute parsed voice command side effects (Sprint 24).
 * @param {object} parsed
 * @param {object} [callbacks]
 */
export async function executeVoiceCommand(parsed, callbacks = {}) {
  if (!parsed?.action?.target) return parsed;

  const target = parsed.action.target;

  if (target === 'emergency_mode') {
    const { setEmergencyMode } = await import('./emergency-mode.js');
    setEmergencyMode(!!parsed.params.active, 'voice_assistant');
  } else if (target === 'wellness') {
    const { showWellnessCheckinSheet } = await import('../components/wellness-checkin-sheet.js');
    showWellnessCheckinSheet({ force: true });
  } else if (target === 'quick_add' && parsed.action.payload) {
    window.dispatchEvent(new CustomEvent('monefyi:voice-quick-add', {
      detail: parsed.action.payload,
    }));
  } else if (target === 'life_event') {
    const { showLifeEventPlannerSheet } = await import('../components/life-event-planner-sheet.js');
    showLifeEventPlannerSheet();
  } else if (target === 'what_if') {
    const { showWhatIfSimulator } = await import('../components/what-if-simulator.js');
    await showWhatIfSimulator({ tab: 'purchase' });
  } else if (target === 'wishlist') {
    const { showImpulseWishlistSheet } = await import('../components/impulse-wishlist-sheet.js');
    showImpulseWishlistSheet();
  } else if (target === 'emergency_plan') {
    const { showEmergencyPlanSheet } = await import('../components/emergency-plan-sheet.js');
    showEmergencyPlanSheet();
  } else if (target === 'debt_planner') {
    callbacks.onDebtPlanner?.();
  } else if (target === 'budget') {
    callbacks.onViewBudget?.();
  }

  return parsed;
}

/**
 * @param {string} transcript
 * @returns {Promise<object|null>}
 */
export async function handleVoiceAssistant(transcript, callbacks = {}) {
  const parsed = parseVoiceCommand(transcript);
  if (!parsed) return null;

  await executeVoiceCommand(parsed, callbacks);

  if (parsed.reply && typeof window !== 'undefined') {
    window.showToast?.(parsed.reply, parsed.type === 'command' ? 'success' : 'info');
  }

  return parsed;
}

if (typeof window !== 'undefined') {
  window.monefyiVoiceAssistant = {
    parseVoiceCommand,
    handleVoiceAssistant,
    executeVoiceCommand,
  };
}
