/** src/components/admin/SaveButton.tsx */
import React from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

interface SaveButtonProps {
  onSave: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
}

export function SaveButton({ onSave, isSaving, hasChanges }: SaveButtonProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-slate-900/80 backdrop-blur-md py-4 mb-8 border-b border-slate-700">
      <div className="flex items-center gap-2">
        {hasChanges && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-widest">
            <AlertCircle size={12} /> Belum disimpan
          </div>
        )}
      </div>
      <Button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          "px-8 py-2.5 gap-2 font-black uppercase text-xs tracking-widest shadow-xl transition-all",
          !hasChanges && "opacity-50 grayscale cursor-not-allowed"
        )}
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Perubahan
      </Button>
    </div>
  );
}
