import { useCallback, useMemo, useState } from 'react';
import type { MappedRapItem } from '../lib/migration/planner-mapper';
import type { RapFieldPatch } from '../lib/rapItemGrouping';
import { setRapItemRealization } from '../services/costService';
import { updateRapItem, type RapItem } from '../services/rapService';

type DraftAction = {
  rapId: string;
  prev: boolean | undefined;
  next: boolean;
};

type Options = {
  projectId: string;
  userId: string;
  rapByPlannerId: Map<string, RapItem>;
  onRefresh: () => Promise<void>;
  onError?: (msg: string) => void;
  onSaved?: () => void;
};

/**
 * Local draft for checklist realization toggles — save only on explicit Simpan.
 */
export function useRapChecklistDraft({
  projectId,
  userId,
  rapByPlannerId,
  onRefresh,
  onError,
  onSaved,
}: Options) {
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [fieldDraft, setFieldDraft] = useState<Record<string, RapFieldPatch>>({});
  const [undoStack, setUndoStack] = useState<DraftAction[]>([]);
  const [redoStack, setRedoStack] = useState<DraftAction[]>([]);
  const [saving, setSaving] = useState(false);

  const realizationCount = Object.keys(draft).length;
  const fieldCount = Object.keys(fieldDraft).length;
  const changeCount = realizationCount + fieldCount;
  const hasChanges = changeCount > 0;

  const getEffectiveRealized = useCallback((item: MappedRapItem): boolean => {
    const rapId = item.plannerId;
    if (!rapId) return item.qtyActual > 0 || item.checked;
    if (draft[rapId] !== undefined) return draft[rapId];
    return item.qtyActual > 0 || item.checked;
  }, [draft]);

  const toggle = useCallback((item: MappedRapItem) => {
    const rapId = item.plannerId;
    if (!rapId) return;
    const current = getEffectiveRealized(item);
    const next = !current;
    const prev = draft[rapId];

    setDraft(d => {
      const base = item.qtyActual > 0 || item.checked;
      if (next === base) {
        const { [rapId]: _, ...rest } = d;
        return rest;
      }
      return { ...d, [rapId]: next };
    });
    setUndoStack(s => [...s, { rapId, prev, next }]);
    setRedoStack([]);
  }, [draft, getEffectiveRealized]);

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack;
      const action = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      setRedoStack(r => [...r, action]);
      setDraft(d => {
        if (action.prev === undefined) {
          const { [action.rapId]: _, ...rest } = d;
          return rest;
        }
        return { ...d, [action.rapId]: action.prev };
      });
      return newStack;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack;
      const action = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      setUndoStack(u => [...u, action]);
      setDraft(d => ({ ...d, [action.rapId]: action.next }));
      return newStack;
    });
  }, []);

  const patchField = useCallback((rapId: string, patch: RapFieldPatch) => {
    const row = rapByPlannerId.get(rapId);
    if (!row) return;
    setFieldDraft(prev => {
      const merged = { ...prev[rapId], ...patch };
      const baseName = row.name;
      const baseQty = Number(row.quantity) || 0;
      const basePrice = Number(row.unit_price) || 0;
      const same =
        (merged.name === undefined || merged.name === baseName)
        && (merged.qtyPlan === undefined || merged.qtyPlan === baseQty)
        && (merged.unitPrice === undefined || merged.unitPrice === basePrice);
      if (same) {
        const { [rapId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [rapId]: merged };
    });
  }, [rapByPlannerId]);

  const discard = useCallback(() => {
    setDraft({});
    setFieldDraft({});
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const save = useCallback(async () => {
    if (!hasChanges || !userId) return;
    setSaving(true);
    try {
      for (const [rapId, patch] of Object.entries(fieldDraft)) {
        const row = rapByPlannerId.get(rapId);
        if (!row) continue;
        await updateRapItem(rapId, {
          name: patch.name ?? row.name,
          quantity: patch.qtyPlan ?? (Number(row.quantity) || 0),
          unit_price: patch.unitPrice ?? (Number(row.unit_price) || 0),
          updated_by: userId,
        });
      }
      for (const [rapId, realized] of Object.entries(draft)) {
        const row = rapByPlannerId.get(rapId);
        if (!row) continue;
        const qty = fieldDraft[rapId]?.qtyPlan ?? (Number(row.quantity) || 0);
        const price = fieldDraft[rapId]?.unitPrice ?? (Number(row.unit_price) || 0);
        await setRapItemRealization({
          projectId,
          rapItemId: rapId,
          rapItemName: fieldDraft[rapId]?.name ?? row.name,
          plannedQty: qty,
          plannedUnitPrice: price,
          realized,
          recordedBy: userId,
        });
      }
      discard();
      await onRefresh();
      onSaved?.();
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }, [hasChanges, userId, draft, fieldDraft, rapByPlannerId, projectId, discard, onRefresh, onError, onSaved]);

  const state = useMemo(() => ({
    draft,
    fieldDraft,
    changeCount,
    hasChanges,
    saving,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }), [draft, fieldDraft, changeCount, hasChanges, saving, undoStack.length, redoStack.length]);

  return {
    ...state,
    getEffectiveRealized,
    toggle,
    patchField,
    undo,
    redo,
    discard,
    save,
  };
}
