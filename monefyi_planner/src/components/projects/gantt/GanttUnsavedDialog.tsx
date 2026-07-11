import { motion } from 'framer-motion';
import { AlertTriangle, Save, Trash2, FileClock } from 'lucide-react';

export type UnsavedChoice = 'save' | 'discard' | 'draft' | 'cancel';

interface GanttUnsavedDialogProps {
  open: boolean;
  hasDraft?: boolean;
  onChoice: (choice: UnsavedChoice) => void;
}

export default function GanttUnsavedDialog({ open, hasDraft, onChoice }: GanttUnsavedDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="font-black text-lg text-slate-900">Perubahan belum disimpan</h3>
          <p className="text-sm text-slate-500 mt-2">
            Ada perubahan di Gantt chart yang belum disimpan. Simpan sebelum keluar?
          </p>
          {hasDraft && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">Draft tersimpan tersedia untuk dipulihkan nanti.</p>
          )}
        </div>

        <div className="p-4 border-t grid grid-cols-2 gap-2 bg-slate-50/80">
          <button
            type="button"
            onClick={() => onChoice('cancel')}
            className="col-span-2 py-2.5 border rounded-xl text-sm font-bold text-slate-600 hover:bg-white"
          >
            Batal — tetap di halaman
          </button>
          <button
            type="button"
            onClick={() => onChoice('save')}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700"
          >
            <Save className="w-4 h-4" /> Simpan
          </button>
          <button
            type="button"
            onClick={() => onChoice('draft')}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700"
          >
            <FileClock className="w-4 h-4" /> Simpan Draft
          </button>
          <button
            type="button"
            onClick={() => onChoice('discard')}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 border-2 border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" /> Buang perubahan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
