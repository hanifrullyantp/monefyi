import type { EstimationFormDraft } from '../types/estimator';

export type StoredEstimationDraft = {
  savedAt: number;
  promoteOnReturn: boolean;
  draft: EstimationFormDraft;
};

export function estimationDraftKey(orgId: string, userId: string, estimationId: string): string {
  return `monefyi-estimator-draft:${orgId}:${userId}:${estimationId}`;
}

function withoutPendingFiles(draft: EstimationFormDraft): EstimationFormDraft {
  return {
    ...draft,
    images: draft.images.map(image => ({ ...image, pendingFile: undefined })),
  };
}

export function writeEstimationDraft(
  key: string,
  draft: EstimationFormDraft,
  promoteOnReturn: boolean,
): void {
  const payload: StoredEstimationDraft = {
    savedAt: Date.now(),
    promoteOnReturn,
    draft: withoutPendingFiles(draft),
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function readEstimationDraft(key: string): StoredEstimationDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEstimationDraft;
    if (!parsed?.draft || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch (error) {
    console.error('Draft estimasi lokal gagal dibaca:', error);
    return null;
  }
}

export function clearEstimationDraft(key: string): void {
  localStorage.removeItem(key);
}

export function draftHasContent(draft: EstimationFormDraft): boolean {
  return Boolean(draft.title.trim() || draft.items.some(item => item.name.trim()));
}
