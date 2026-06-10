import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { Project } from '../../store/appStore';
import { formatRupiah } from '../../utils/projectUi';

interface Props {
  project: Project;
  canArchive: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Project>) => Promise<void>;
  onArchive: () => Promise<void>;
}

export default function ProjectEditModal({ project, canArchive, onClose, onSave, onArchive }: Props) {
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name || '',
    location: project.location || '',
    type: project.type,
    start_date: project.start_date,
    end_date: project.end_date,
    description: project.description || '',
    total_budget_planned: project.total_budget_planned,
  });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState('');
  const [archiveAck, setArchiveAck] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Nama proyek wajib diisi');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: form.name.trim(),
        client_name: form.client_name.trim(),
        location: form.location.trim() || undefined,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        description: form.description.trim() || undefined,
        total_budget_planned: form.total_budget_planned,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (archiveConfirm !== project.name || !archiveAck) return;
    setArchiving(true);
    setError('');
    try {
      await onArchive();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengarsipkan');
    } finally {
      setArchiving(false);
    }
  };

  const archiveReady = archiveConfirm === project.name && archiveAck;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Edit Proyek</h3>
            <p className="text-xs text-slate-500 font-mono">{project.code}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nama proyek *"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <input
            value={form.client_name}
            onChange={e => setForm({ ...form, client_name: e.target.value })}
            placeholder="Nama klien"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <input
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            placeholder="Lokasi"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value as Project['type'] })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          >
            <option value="construction">Konstruksi</option>
            <option value="service">Jasa / Renovasi</option>
            <option value="it">IT</option>
            <option value="event">Event</option>
            <option value="manufacturing">Manufaktur</option>
            <option value="other">Lainnya</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Mulai</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Selesai</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <input
            type="number"
            min={0}
            value={form.total_budget_planned || ''}
            onChange={e => setForm({ ...form, total_budget_planned: Number(e.target.value) })}
            placeholder="Budget rencana (Rp)"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Deskripsi proyek"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none"
          />

          {canArchive && (
            <div className="pt-4 border-t border-slate-100">
              {!showArchive ? (
                <button
                  type="button"
                  onClick={() => setShowArchive(true)}
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus / arsipkan proyek...
                </button>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 space-y-3">
                  <div className="flex items-start gap-2 text-rose-800">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Arsipkan proyek ini?</p>
                      <p className="text-xs mt-1 text-rose-700 leading-relaxed">
                        Proyek disembunyikan dari daftar aktif. Data disimpan di arsip selama <strong>30 hari</strong>.
                        Hanya <strong>Super Admin</strong> yang dapat memulihkan proyek sebelum masa arsip habis.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-rose-800">
                    Budget tercatat: <strong>{formatRupiah(project.total_budget_planned)}</strong>
                  </p>
                  <label className="flex items-start gap-2 text-xs text-rose-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={archiveAck}
                      onChange={e => setArchiveAck(e.target.checked)}
                      className="mt-0.5"
                    />
                    Saya mengerti proyek akan diarsipkan dan tidak bisa dipulihkan sendiri setelah 30 hari.
                  </label>
                  <div>
                    <label className="text-xs text-rose-700 mb-1 block">
                      Ketik nama proyek untuk konfirmasi: <strong>{project.name}</strong>
                    </label>
                    <input
                      value={archiveConfirm}
                      onChange={e => setArchiveConfirm(e.target.value)}
                      placeholder={project.name}
                      className="w-full px-3 py-2 rounded-lg border border-rose-200 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowArchive(false); setArchiveConfirm(''); setArchiveAck(false); }}
                      className="flex-1 py-2 rounded-lg border border-rose-200 text-sm font-semibold text-rose-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={!archiveReady || archiving}
                      className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {archiving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Arsipkan proyek
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="p-5 border-t flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan perubahan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
