/**
 * Lightweight Q&A content moderation (Growth Sprint 18 polish).
 * @module services/community-forum-moderation
 */

const BLOCKED_PATTERNS = [
  /\b(casino|judi|slot gacor|binary option)\b/i,
  /\b(buy followers|jual followers)\b/i,
  /(https?:\/\/[^\s]+)/i,
  /\b\d{10,}\b/,
];

const WARN_WORDS = ['transfer ke rekening', 'pin atm', 'otp', 'kode verifikasi'];

/**
 * @param {string} text
 * @returns {{ ok: boolean, reason?: string }}
 */
export function moderateForumText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, reason: 'Teks tidak boleh kosong' };
  if (trimmed.length < 8) return { ok: false, reason: 'Tulis sedikit lebih detail (min. 8 karakter)' };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: 'Konten tidak diizinkan — hindari link, judi, atau data sensitif' };
    }
  }

  const lower = trimmed.toLowerCase();
  if (WARN_WORDS.some((w) => lower.includes(w))) {
    return { ok: false, reason: 'Jangan bagikan PIN/OTP/rekening — gunakan tips umum saja' };
  }

  return { ok: true };
}

/**
 * @param {object} payload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function moderateForumQuestion(payload) {
  const titleCheck = moderateForumText(payload.title);
  if (!titleCheck.ok) return titleCheck;
  if (payload.body) {
    const bodyCheck = moderateForumText(payload.body);
    if (!bodyCheck.ok) return bodyCheck;
  }
  return { ok: true };
}

/**
 * @param {object} payload
 * @returns {Promise<void>}
 */
export async function reportForumContent(payload) {
  if (typeof window !== 'undefined') {
    const { reportForumContent: syncReport } = await import('./community-store.js');
    await syncReport(payload);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiForumModeration = { moderateForumText, moderateForumQuestion, reportForumContent };
}
