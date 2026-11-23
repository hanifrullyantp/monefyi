import type { DocumentSignatures } from '../../types/estimator';

const STORAGE_PREFIX = 'froyek:doc_sig:';
const LEGACY_STORAGE_PREFIX = 'monefyi:doc_sig:';

export function getEstimationSignatures(key: string): DocumentSignatures | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    let raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) {
      raw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${key}`);
      if (raw) localStorage.setItem(`${STORAGE_PREFIX}${key}`, raw);
    }
    if (!raw) return null;
    return JSON.parse(raw) as DocumentSignatures;
  } catch {
    return null;
  }
}

export function saveEstimationSignatures(key: string, sigs: DocumentSignatures): void {
  if (!key || typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(sigs);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
    localStorage.setItem(`${LEGACY_STORAGE_PREFIX}${key}`, serialized);
  } catch (err) {
    console.warn('Gagal menyimpan tanda tangan digital ke localStorage:', err);
  }
}

export function clearEstimationSignatures(key: string): void {
  if (!key || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}

