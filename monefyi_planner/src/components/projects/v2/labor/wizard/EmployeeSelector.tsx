import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserPlus, Database, X, Check, Loader2 } from 'lucide-react';
import type { OrgMember } from '../../../../../types/onboarding';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';

type Props = {
  members: OrgMember[];
  selected: OrgMember | null;
  onSelect: (m: OrgMember) => void;
  onClear: () => void;
  onCreateHr: (name: string) => Promise<void>;
  creating?: boolean;
  canCreateHr: boolean;
  variant: WizardVariant;
};

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function EmployeeSelector({
  members, selected, onSelect, onClear, onCreateHr, creating = false, canCreateHr, variant,
}: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debounced) return members;
    return members.filter(m => {
      const name = m.profile?.name?.toLowerCase() || '';
      const pos = m.position?.toLowerCase() || '';
      const role = m.role?.toLowerCase() || '';
      return name.includes(debounced) || pos.includes(debounced) || role.includes(debounced);
    });
  }, [members, debounced]);

  const showCreate = debounced.length >= 2
    && !filtered.some(m => m.profile?.name?.toLowerCase() === debounced);

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return;
    await onCreateHr(query.trim());
    setQuery('');
  }, [query, onCreateHr]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const rows = filtered.length + (showCreate && canCreateHr ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, rows - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && rows > 0) {
      e.preventDefault();
      if (highlight < filtered.length) onSelect(filtered[highlight]);
      else if (showCreate && canCreateHr) void handleCreate();
    }
  };

  return (
    <div>
      <h2 className="wz-heading">Pilih Pekerja</h2>
      <p className="wz-subheading">Cari dari HR atau tambahkan nama baru</p>

      <div className="wz-search-wrap">
        <Search className="w-[18px] h-[18px]" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--wz-gray-400)' }} />
        <input
          className="wz-search"
          value={query}
          onChange={e => { setQuery(e.target.value); setHighlight(0); }}
          onKeyDown={onKeyDown}
          placeholder="Cari nama atau ketik baru..."
          aria-label="Cari pekerja"
        />
      </div>

      <div className="wz-emp-list" ref={listRef}>
        {filtered.map((m, i) => (
          <button
            key={m.id}
            type="button"
            className="wz-emp-row w-full text-left"
            style={highlight === i ? { background: 'var(--wz-primary-light)', paddingLeft: 20 } : undefined}
            onClick={() => onSelect(m)}
            onMouseEnter={() => setHighlight(i)}
          >
            <div className="wz-avatar">{initials(m.profile?.name || m.role)}</div>
            <div className="wz-emp-info">
              <div className="wz-emp-name">{m.profile?.name || m.role}</div>
              <div className="wz-emp-role">{m.position || m.role}</div>
            </div>
            <Database className="wz-db-badge w-4 h-4" />
          </button>
        ))}
        {showCreate && canCreateHr && (
          <button
            type="button"
            className="wz-emp-row w-full text-left"
            style={{ color: 'var(--wz-primary)' }}
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span className="font-bold">Tambah &quot;{query.trim()}&quot; ke HR</span>
          </button>
        )}
        {filtered.length === 0 && !showCreate && (
          <p className="text-sm text-slate-500 text-center py-6">Tidak ada hasil</p>
        )}
      </div>

      {selected && (
        <div className="wz-selected-card">
          <div className="wz-avatar">{initials(selected.profile?.name || '?')}</div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-base truncate">{selected.profile?.name}</div>
            <div className="text-sm text-slate-500">{selected.position || selected.role}</div>
            <span className="wz-badge-hr">
              <Check className="w-3 h-3" /> Terdaftar HR
            </span>
          </div>
          <button type="button" className="wz-icon-btn" onClick={onClear} aria-label="Hapus pilihan">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
