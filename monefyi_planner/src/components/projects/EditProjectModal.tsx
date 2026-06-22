import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { useAppStore, Project } from '../../store/appStore';
import { updateProject as updateProjectApi } from '../../services/projectService';
import { useUiStore } from '../../store/uiStore';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: EditProjectModalProps) {
  const { tenant } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name,
    location: project.location || '',
    start_date: project.start_date,
    end_date: project.end_date,
    total_budget_planned: project.total_budget_planned,
    status: project.status,
    description: project.description || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await updateProjectApi(project.id, form, tenant?.currency);
      onSaved(updated);
      showToast('Proyek diperbarui', 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Edit Proyek</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nama</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Klien</label>
            <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Lokasi</label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full pl-10 pr-3 py-2 border rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mulai</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Selesai</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Budget (BAC)</label>
            <input type="number" value={form.total_budget_planned || ''} onChange={e => setForm({ ...form, total_budget_planned: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
          </div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-slate-600">Batal</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
