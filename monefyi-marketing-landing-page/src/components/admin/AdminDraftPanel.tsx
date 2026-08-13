import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Undo2, Redo2, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useEditDraft } from '../../hooks/useEditDraft';
import { cn } from '../../lib/cn';

export function AdminDraftPanel() {
  const { 
    hasChanges, 
    changeCount, 
    save, 
    discard, 
    undo, 
    redo, 
    resetToDefault,
    canUndo,
    canRedo
  } = useEditDraft();

  if (!hasChanges) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        exit={{ y: 100, opacity: 0, x: '-50%' }}
        className="fixed bottom-8 left-1/2 z-[10000] w-[95%] max-w-2xl"
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-amber-950 font-black text-lg">
              {changeCount}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Unsaved Changes</p>
              <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Sesi Edit Aktif</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
            <ActionButton 
              onClick={undo} 
              disabled={!canUndo} 
              icon={Undo2} 
              label="Undo" 
            />
            <ActionButton 
              onClick={redo} 
              disabled={!canRedo} 
              icon={Redo2} 
              label="Redo" 
            />
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <ActionButton 
              onClick={resetToDefault} 
              icon={RotateCcw} 
              label="Reset All" 
              variant="danger"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={discard}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
            >
              Batal
            </button>
            <button
              onClick={save}
              className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} /> Simpan
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({ onClick, disabled, icon: Icon, label, variant = 'default' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "p-2.5 rounded-xl transition-all",
        disabled ? "opacity-20 grayscale" : "hover:bg-white/10",
        variant === 'danger' ? "text-red-400 hover:text-red-300" : "text-slate-300 hover:text-white"
      )}
    >
      <Icon size={18} />
    </button>
  );
}
