import type { GanttSnapshot } from '../lib/gantt/snapshot';

const DRAFT_KEY = 'monefyi_gantt_draft';

export interface GanttDraftMeta {
  orgId: string;
  savedAt: string;
  label: string;
}

export interface StoredGanttDraft extends GanttDraftMeta {
  snapshot: GanttSnapshot;
}

export function saveGanttDraft(orgId: string, snapshot: GanttSnapshot, label?: string): void {
  const draft: StoredGanttDraft = {
    orgId,
    savedAt: new Date().toISOString(),
    label: label || `Draft ${new Date().toLocaleString('id-ID')}`,
    snapshot,
  };
  try {
    localStorage.setItem(`${DRAFT_KEY}_${orgId}`, JSON.stringify(draft));
  } catch { /* ignore quota */ }
}

export function loadGanttDraft(orgId: string): StoredGanttDraft | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}_${orgId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGanttDraft;
  } catch {
    return null;
  }
}

export function clearGanttDraft(orgId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY}_${orgId}`);
  } catch { /* ignore */ }
}

export function hasGanttDraft(orgId: string): boolean {
  return loadGanttDraft(orgId) !== null;
}
