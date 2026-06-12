import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { createProject } from '../../services/projectService';
import type { Project } from '../../store/appStore';

interface CreateProjectQuickFormProps {
  suggestedName: string;
  orgId: string;
  userId: string;
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export default function CreateProjectQuickForm({
  suggestedName,
  orgId,
  userId,
  onCreated,
  onCancel,
}: CreateProjectQuickFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(suggestedName);
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    setError('');
    try {
      const project = await createProject({
        org_id: orgId,
        created_by: userId,
        name: name.trim(),
        client_name: clientName.trim() || undefined,
        start_date: startDate,
        end_date: startDate,
        status: 'planning',
        type: 'construction',
      });
      onCreated(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">Buat Project Baru</h4>
        <p className="text-xs text-slate-500">"{suggestedName}" akan dibuat sebagai project baru</p>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Nama Project *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          placeholder="Nama project"
        />
        <label className="text-xs text-slate-500">Nama Client</label>
        <input
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          placeholder="Opsional"
        />
        <label className="text-xs text-slate-500">Tgl Mulai</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <p className="text-[11px] text-slate-400">Detail lengkap bisa diisi nanti di halaman Project</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-white"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Buat & Lanjutkan
        </button>
      </div>
    </div>
  );
}
