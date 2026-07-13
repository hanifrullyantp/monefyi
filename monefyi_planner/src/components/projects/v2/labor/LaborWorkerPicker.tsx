import { useMemo, useState } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import type { OrgMember } from '../../../../types/onboarding';

type Props = {
  members: OrgMember[];
  selectedId: string | null;
  onSelect: (member: OrgMember) => void;
  onCreateManual: (name: string, phone?: string) => Promise<void>;
  creating?: boolean;
  canCreateHr: boolean;
};

export default function LaborWorkerPicker({
  members, selectedId, onSelect, onCreateManual, creating = false, canCreateHr,
}: Props) {
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const name = m.profile?.name?.toLowerCase() || '';
      const pos = m.position?.toLowerCase() || '';
      return name.includes(q) || pos.includes(q);
    });
  }, [members, query]);

  const selected = members.find(m => m.id === selectedId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateManual(newName.trim(), newPhone.trim() || undefined);
    setNewName('');
    setNewPhone('');
    setShowNew(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari karyawan HR..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white"
          />
        </div>
        {canCreateHr && (
          <button
            type="button"
            onClick={() => setShowNew(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100"
          >
            <UserPlus className="w-4 h-4" /> Tambah ke HR
          </button>
        )}
      </div>

      {showNew && canCreateHr && (
        <div className="surface-inset p-3 rounded-xl space-y-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nama karyawan"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
          <input
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            placeholder="No. HP (opsional)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
          <button
            type="button"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
            className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan ke HR
          </button>
        </div>
      )}

      {selected && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm">
            {(selected.profile?.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 truncate">{selected.profile?.name}</div>
            <div className="text-xs text-slate-500">{selected.position || 'Karyawan'}</div>
          </div>
        </div>
      )}

      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Tidak ada karyawan cocok.</p>
        ) : (
          filtered.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50/60 transition-colors ${
                m.id === selectedId ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                {(m.profile?.name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800 truncate">{m.profile?.name}</div>
                <div className="text-xs text-slate-500 truncate">{m.position || m.role}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
