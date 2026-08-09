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
    reflection: data.reflection || '',
    intention: data.intention || '',
    allocation_note: data.allocation_note || '',
    mood: data.mood || null,
    saved_at: new Date().toISOString(),
  };
  entries.unshift(entry);
  localStorage.setItem(LS_JOURNAL, JSON.stringify(entries.slice(0, 24)));
  return entry;
}

/** Default reflection prompts for guided review */
export const REVIEW_PROMPTS = [
  { id: 'summary', label: 'Apa highlight finansial bulan ini?', placeholder: 'Contoh: berhasil nabung 2 juta...' },
  { id: 'reflection', label: 'Apa yang bisa diperbaiki?', placeholder: 'Contoh: pengeluaran makan terlalu sering...' },
  { id: 'intention', label: 'Intention untuk bulan depan?', placeholder: 'Contoh: batasi delivery max 2x/minggu...' },
];

if (typeof window !== 'undefined') {
  window.monefyiMonthlyJournal = { loadJournalEntries, loadJournalEntry, saveJournalEntry, REVIEW_PROMPTS };
}
