import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import { showToast } from '../../store/uiStore';

const UNDO_MS = 8000;

export default function UndoToast() {
  const { undoToast, clearUndoToast } = useUiStore();
  const { undo } = useUndoableAction();

  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(clearUndoToast, UNDO_MS);
    return () => clearTimeout(t);
  }, [undoToast, clearUndoToast]);

  const handleUndo = async () => {
    if (!undoToast) return;
    clearUndoToast();
    try {
      await undo(undoToast.actionId);
      showToast('Aksi dibatalkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal undo', 'error');
    }
  };

  return (
    <AnimatePresence>
      {undoToast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-36 lg:bottom-20 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl bg-slate-900 max-w-sm"
        >
          <span className="flex-1">{undoToast.message}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 font-bold text-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Batalkan
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
