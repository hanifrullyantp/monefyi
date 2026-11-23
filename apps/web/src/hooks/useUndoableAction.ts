import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { undoReversibleAction } from '../services/undoService';

export function useUndoableAction() {
  const user = useAppStore(s => s.user);
  const showUndoToast = useUiStore(s => s.showUndoToast);

  const notifyUndoable = useCallback((message: string, actionId?: string | null) => {
    if (actionId) showUndoToast(message, actionId);
  }, [showUndoToast]);

  const undo = useCallback(async (actionId: string) => {
    if (!user?.id || !user.role) throw new Error('Tidak terautentikasi');
    await undoReversibleAction(actionId, user.id, user.role);
  }, [user?.id, user?.role]);

  return { notifyUndoable, undo };
}
