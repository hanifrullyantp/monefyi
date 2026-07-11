import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Percent, Palette } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { useUiStore } from '../../../store/uiStore';
import type { GanttTask } from '../../../lib/gantt/types';
import { STATUS_LABEL } from '../../../utils/projectUi';
import { BAR_COLOR_PRESETS, WORK_ITEM_STATUS_LABEL } from '../../../lib/gantt/constants';
import { daysBetween } from '../../../lib/gantt/utils';

interface GanttEditModalProps {
  task: GanttTask;
  project?: Project;
  onClose: () => void;
  onSaved: () => void;
}

export default function GanttEditModal({ task, project, onClose, onSaved }: GanttEditModalProps) {
  const { pushHistory, updateTask, setBarColor } = useGanttStore();
  const showToast = useUiStore(s => s.showToast);

  const [form, setForm] = useState({
    name: task.name,
    start_date: task.startDate,
    end_date: task.endDate,
    progress: task.progress,
    status: task.status,
    barColor: task.barColor || '',
  });

  const isProject = task.type === 'project';
  const dayCount = daysBetween(form.start_date, form.end_date);

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
      return;
    }

    pushHistory();

    const wiStatus = !isProject
      ? (form.progress >= 100 ? 'completed' : form.progress > 0 ? 'in_progress' : form.status)
      : form.status;

    updateTask(task.id, {
      name: form.name.trim(),
      startDate: form.start_date,
      endDate: form.end_date,
      progress: form.progress,
      status: wiStatus,
    }, false);

    setBarColor(task.id, form.barColor || null);

    useGanttStore.setState({ isDirty: true });
    showToast('Perubahan diterapkan — klik Simpan untuk persist', 'info');
    onSaved();
    onClose();
  };

  const statusOptions = isProject
    ? (['planning', 'active', 'on_hold', 'completed'] as const)
    : (['pending', 'in_progress', 'completed'] as const);

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
            <h3 className="font-black text-slate-900">Edit {isProject ? 'Proyek' : 'Sub Tugas'}</h3>
            {project && isProject && <p className="text-[10px] text-slate-400 font-mono">{project.code}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Mulai</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Selesai</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">Durasi: <strong>{dayCount} hari</strong></p>

          {!isProject && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Percent className="w-3 h-3" /> Progress</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="flex-1 accent-emerald-500" />
                <span className="text-sm font-black w-10 text-right">{form.progress}%</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm">
              {statusOptions.map(s => (
                <option key={s} value={s}>{isProject ? (STATUS_LABEL[s as keyof typeof STATUS_LABEL] || s) : (WORK_ITEM_STATUS_LABEL[s] || s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> Warna Bar</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {BAR_COLOR_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setForm({ ...form, barColor: p.color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                    form.barColor === p.color ? 'border-slate-800 ring-2 ring-offset-1 ring-slate-400' : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: p.color || '#E2E8F0' }}
                />
              ))}
            </div>
            <input
              type="color"
              value={form.barColor || '#10B981'}
              onChange={e => setForm({ ...form, barColor: e.target.value })}
              className="mt-2 w-full h-9 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="p-5 border-t flex gap-3 bg-slate-50/80">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-slate-600">Batal</button>
          <button type="button" onClick={handleSave} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700">Terapkan</button>
        </div>
      </motion.div>
    </div>
  );
}
