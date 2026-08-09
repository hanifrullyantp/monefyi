/**
 * Monthly review journal — reflection entries (Fase 4.2).
 * @module services/monthly-review-journal
 */

const LS_JOURNAL = 'monefyi_monthly_journal';

/**
 * @returns {object[]}
 */
export function loadJournalEntries() {
  try {
    return JSON.parse(localStorage.getItem(LS_JOURNAL) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {string} period YYYY-MM
 * @returns {object|null}
 */
export function loadJournalEntry(period) {
  return loadJournalEntries().find((e) => e.period === period) || null;
}

/**
 * @param {string} period
 * @param {object} data
 * @returns {object}
 */
export function saveJournalEntry(period, data) {
  const entries = loadJournalEntries().filter((e) => e.period !== period);
  const entry = {
    period,
    proud: data.proud || data.reflection || '',
    improve: data.improve || data.intention || '',
    surprise: data.surprise || '',
    reflection: data.reflection || data.proud || '',
    intention: data.intention || data.improve || '',
    allocation_note: data.allocation_note || '',
    allocation_choice: data.allocation_choice || null,
    intentions: data.intentions || [],
    patterns: data.patterns || [],
    pattern_ack: data.pattern_ack || null,
    mood: data.mood || null,
    saved_at: new Date().toISOString(),
  };
  entries.unshift(entry);
  localStorage.setItem(LS_JOURNAL, JSON.stringify(entries.slice(0, 24)));
  return entry;
}

/** Default reflection prompts for guided review */
export const REVIEW_PROMPTS = [
  { id: 'proud', label: 'Apa 1 hal keuangan yang bikin kamu bangga bulan ini?', placeholder: 'Contoh: berhasil nabung 2 juta...' },
  { id: 'improve', label: 'Apa 1 hal yang ingin diperbaiki bulan depan?', placeholder: 'Contoh: kurangi delivery...' },
  { id: 'surprise', label: 'Apa surprise expense yang tidak terduga?', placeholder: 'Contoh: biaya servis motor...' },
];

if (typeof window !== 'undefined') {
  window.monefyiMonthlyJournal = { loadJournalEntries, loadJournalEntry, saveJournalEntry, REVIEW_PROMPTS };
}
