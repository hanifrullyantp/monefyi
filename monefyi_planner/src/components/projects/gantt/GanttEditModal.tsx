import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Percent } from 'lucide-react';
import { useAppStore, type Project } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { updateProject as updateProjectApi } from '../../../services/projectService';
import { updateWorkItem, updateProjectProgressFromWorkItems } from '../../../services/workItemService';
import { useUiStore } from '../../../store/uiStore';
import type { GanttTask } from '../../../lib/gantt/types';
import { STATUS_LABEL } from '../../../utils/projectUi';
import { WORK_ITEM_STATUS_LABEL } from '../../../lib/gantt/constants';

interface GanttEditModalProps {
  task: GanttTask;
  project?: Project;
  onClose: () => void;
  onSaved: () => void;
}

export default function GanttEditModal({ task, project, onClose, onSaved }: GanttEditModalProps) {
  const { tenant, updateProject } = useAppStore();
  const { updateTask } = useGanttStore();
  const showToast = useUiStore(s => s.showToast);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: task.name,
    start_date: task.startDate,
    end_date: task.endDate,
    progress: task.progress,
    status: task.status,
    description: '',
  });

  const isProject = task.type === 'project';

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isProject) {
        const updated = await updateProjectApi(task.id, {
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
          status: form.status as Project['status'],
        }, tenant?.currency);
        updateProject(task.id, updated);
        updateTask(task.id, {
          name: updated.name,
          startDate: updated.start_date,
          endDate: updated.end_date,
          progress: updated.progress_percentage,
          status: updated.status,
        });
      } else {
        const wiStatus = form.progress >= 100 ? 'completed'
          : form.progress > 0 ? 'in_progress' : form.status;

        await updateWorkItem(task.id, {
          name: form.name.trim(),
          planned_start: form.start_date,
          planned_end: form.end_date,
          progress_pct: form.progress,
          status: wiStatus,
        });

        updateTask(task.id, {
          name: form.name.trim(),
          startDate: form.start_date,
          endDate: form.end_date,
          progress: form.progress,
          status: wiStatus,
        });

        const avg = await updateProjectProgressFromWorkItems(task.projectId);
        if (avg != null) {
          updateProject(task.projectId, { progress_percentage: avg });
          updateTask(task.projectId, { progress: avg });
        }
      }

      showToast('Task diperbarui', 'success');
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = isProject
    ? (['planning', 'active', 'on_hold', 'completed'] as const)
    : (['pending', 'in_progress', 'completed'] as const);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gantt-edit-title"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 id="gantt-edit-title" className="font-black text-slate-900">
              Edit {isProject ? 'Proyek' : 'Sub Tugas'}
            </h3>
            {project && isProject && (
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{project.code}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Mulai
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Selesai
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {!isProject && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> Progress
              </label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-black text-slate-700 w-10 text-right">{form.progress}%</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>
                  {isProject
                    ? (STATUS_LABEL[s as keyof typeof STATUS_LABEL] || s)
                    : (WORK_ITEM_STATUS_LABEL[s] || s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 border-t flex gap-3 bg-slate-50/80">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black disabled:opacity-60 hover:bg-emerald-700"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
