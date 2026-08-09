/**
 * SSOT message templates — status, greeting, and action prefix aligned.
 * @module services/monevisor-messages
 */

const MESSAGES = {
  safe: {
    greeting_morning: 'Selamat pagi! Kondisi keuanganmu bulan ini bagus.',
    greeting_afternoon: 'Selamat siang! Tetap jaga pola ini ya.',
    greeting_evening: 'Selamat sore! On track untuk bulan ini.',
    action_prefix: 'Beberapa hal yang bisa kamu lakukan:',
    label: 'Aman',
    icon: '✅',
  },
  warning: {
    greeting_morning: 'Selamat pagi! Kondisi keuanganmu perlu sedikit perhatian.',
    greeting_afternoon: 'Selamat siang! Ada beberapa hal yang perlu kamu cek.',
    greeting_evening: 'Selamat sore! Yuk review pengeluaran bulan ini.',
    action_prefix: 'Yang perlu kamu perhatikan:',
    label: 'Waspada',
    icon: '⚠️',
  },
  danger: {
    greeting_morning: 'Selamat pagi! Kondisi keuangan bulan ini butuh tindakan.',
    greeting_afternoon: 'Selamat siang! Yuk kita atur ulang pengeluaran.',
    greeting_evening: 'Selamat sore! Ada beberapa risiko yang perlu ditangani.',
    action_prefix: 'Langkah yang direkomendasikan:',
    label: 'Bahaya',
    icon: '🚨',
  },
  incomplete: {
    greeting_morning: 'Selamat pagi! Lengkapi data pemasukan dulu ya.',
    greeting_afternoon: 'Selamat siang! Data pemasukan belum lengkap.',
    greeting_evening: 'Selamat sore! Isi pemasukan bulan ini supaya prediksi akurat.',
    action_prefix: 'Langkah berikutnya:',
    label: 'Data Kurang',
    icon: '📋',
  },
};

/**
 * @param {'SAFE'|'WARNING'|'DANGER'|'INCOMPLETE'|string} level
 * @returns {'safe'|'warning'|'danger'|'incomplete'}
 */
export function levelToTemplateKey(level) {
  const map = {
    SAFE: 'safe',
    WARNING: 'warning',
    DANGER: 'danger',
    INCOMPLETE: 'incomplete',
    aman: 'safe',
    waspada: 'warning',
    bahaya: 'danger',
    incomplete: 'incomplete',
  };
  return map[level] || map[String(level || '').toUpperCase()] || 'warning';
}

/**
 * @param {'safe'|'warning'|'danger'|'incomplete'|string} statusKey
 * @returns {string}
 */
export function getGreeting(statusKey) {
  const key = levelToTemplateKey(statusKey);
  const hour = new Date().getHours();
  const timeOfDay = hour < 11 ? 'morning' : hour < 16 ? 'afternoon' : 'evening';
  return MESSAGES[key]?.[`greeting_${timeOfDay}`] || MESSAGES.warning.greeting_morning;
}

/**
 * @param {'safe'|'warning'|'danger'|'incomplete'|string} statusKey
 * @returns {string}
 */
export function getActionPrefix(statusKey) {
  const key = levelToTemplateKey(statusKey);
  return MESSAGES[key]?.action_prefix || MESSAGES.warning.action_prefix;
}

/**
 * @param {'safe'|'warning'|'danger'|'incomplete'|string} statusKey
 * @returns {{ label: string, icon: string }}
 */
export function getStatusDisplay(statusKey) {
  const key = levelToTemplateKey(statusKey);
  const tpl = MESSAGES[key] || MESSAGES.warning;
  return { label: tpl.label, icon: tpl.icon };
}

/**
 * @param {object} [state]
 * @returns {{ greeting: string, actionPrefix: string, statusKey: string, label: string, icon: string }}
 */
export function getMonevisorMessageBundle(state) {
  let finStatus = { level: 'WARNING' };
  try {
    // Lazy import avoided — consumer may pass level directly
    if (typeof window !== 'undefined' && window.monefyiFinancialStatus?.getFinancialStatus) {
      finStatus = window.monefyiFinancialStatus.getFinancialStatus(state);
    }
  } catch { /* ignore */ }

  const statusKey = levelToTemplateKey(finStatus.level);
  const display = getStatusDisplay(statusKey);
  return {
    greeting: getGreeting(statusKey),
    actionPrefix: getActionPrefix(statusKey),
    statusKey,
    label: display.label,
    icon: display.icon,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisorMessages = {
    getGreeting,
    getActionPrefix,
    getStatusDisplay,
    getMonevisorMessageBundle,
    levelToTemplateKey,
  };
}
