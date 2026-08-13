import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Undo2, Redo2, RotateCcw, Loader2, Cloud } from 'lucide-react';
import { useLandingCms } from '../../context/LandingCmsContext';
import { useAdminMode } from '../../hooks/useAdminMode';
import { cn } from '../../lib/cn';

export function AdminDraftPanel() {
  const isAdmin = useAdminMode();
  const {
    hasDraftChanges,
    changeCount,
    saveToSupabase,
    discardDraft,
    undo,
    redo,
    resetDraft,
    canUndo,
    canRedo,
    isSaving,
    saveError,
  } = useLandingCms();
  const [status, setStatus] = useState<string | null>(null);

  if (!isAdmin || !hasDraftChanges) return null;

  const handleSave = async () => {
    setStatus(null);
    const result = await saveToSupabase();
    if (result.ok) {
      setStatus('Tersimpan ke Supabase');
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const handleDiscard = () => {
    if (confirm('Batalkan semua perubahan draft?')) {
      discardDraft();
      setStatus(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        exit={{ y: 100, opacity: 0, x: '-50%' }}
        className="fixed bottom-8 left-1/2 z-[10000] w-[95%] max-w-2xl"
      >
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-amber-500/30 rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-amber-950 font-black text-lg">
              {changeCount}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none flex items-center gap-1.5">
                <Cloud size={14} className="text-green-400" />
                Draft Lokal
              </p>
              <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">
                {status || saveError || 'Belum disimpan ke Supabase'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
            <ActionButton onClick={undo} disabled={!canUndo} icon={Undo2} label="Undo" />
            <ActionButton onClick={redo} disabled={!canRedo} icon={Redo2} label="Redo" />
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <ActionButton onClick={resetDraft} icon={RotateCcw} label="Reset" variant="danger" />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Simpan
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: typeof Undo2;
  label: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'p-2.5 rounded-xl transition-all',
        disabled ? 'opacity-20 grayscale' : 'hover:bg-white/10',
        variant === 'danger' ? 'text-red-400 hover:text-red-300' : 'text-slate-300 hover:text-white'
      )}
    >
      <Icon size={18} />
    </button>
  );
}
