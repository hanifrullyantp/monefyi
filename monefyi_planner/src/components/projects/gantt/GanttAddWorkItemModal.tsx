import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { useUiStore } from '../../../store/uiStore';

interface GanttAddWorkItemModalProps {
  project: Project;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    planned_start: string;
    planned_end: string;
    progress_pct: number;
  }) => Promise<boolean>;
}

/**
 * Quick form to add a work item from Gantt context menu.
 */
export default function GanttAddWorkItemModal({ project, onClose, onSubmit }: GanttAddWorkItemModalProps) {
  const showToast = useUiStore(s => s.showToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    planned_start: project.start_date,
    planned_end: project.end_date,
    progress_pct: 0,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama pekerjaan wajib diisi', 'error');
      return;
    }
    if (new Date(form.planned_end) < new Date(form.planned_start)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
      return;
    }

    setLoading(true);
    try {
      const ok = await onSubmit({
        name: form.name.trim(),
        planned_start: form.planned_start,
        planned_end: form.planned_end,
        progress_pct: form.progress_pct,
      });
      if (ok) onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900">Tambah Pekerjaan</h3>
            <p className="text-xs text-slate-500 truncate">{project.name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama Pekerjaan</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mulai</label>
              <input
                type="date"
                value={form.planned_start}
                onChange={e => setForm({ ...form, planned_start: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Selesai</label>
              <input
                type="date"
                value={form.planned_end}
                onChange={e => setForm({ ...form, planned_end: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-slate-600">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
