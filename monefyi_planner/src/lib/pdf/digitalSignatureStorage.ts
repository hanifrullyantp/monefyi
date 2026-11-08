import type { DocumentSignatures } from '../../types/estimator';

const STORAGE_PREFIX = 'monefyi:doc_sig:';

export function getEstimationSignatures(key: string): DocumentSignatures | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as DocumentSignatures;
  } catch {
    return null;
  }
}

export function saveEstimationSignatures(key: string, sigs: DocumentSignatures): void {
  if (!key || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(sigs));
  } catch (err) {
    console.warn('Gagal menyimpan tanda tangan digital ke localStorage:', err);
  }
}

export function clearEstimationSignatures(key: string): void {
  if (!key || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}

