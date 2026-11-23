import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

const CREATE_VALUE = '__create_new__';

export interface SelectOption {
  value: string;
  label: string;
}

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  onCreateOption?: (label: string) => Promise<SelectOption | null>;
  placeholder?: string;
  createLabel?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export default function CreatableSelect({
  value,
  onChange,
  options,
  onCreateOption,
  placeholder,
  createLabel = '+ Tambah baru...',
  className = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white',
  disabled = false,
  allowEmpty = false,
  emptyLabel = '— pilih —',
}: CreatableSelectProps) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creating) return;
    setNewLabel('');
  }, [creating]);

  const displayOptions = useMemo(() => {
    if (!value || options.some(o => o.value === value)) return options;
    return [{ value, label: value.replace(/_/g, ' ') }, ...options];
  }, [options, value]);

  const knownValue = displayOptions.some(o => o.value === value)
    ? value
    : (allowEmpty ? '' : (displayOptions[0]?.value || ''));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === CREATE_VALUE) {
      setCreating(true);
      return;
    }
    setCreating(false);
    onChange(next);
  };

  const handleCreate = async () => {
    if (!onCreateOption || !newLabel.trim()) return;
    setSaving(true);
    try {
      const created = await onCreateOption(newLabel.trim());
      if (created) {
        onChange(created.value);
        setCreating(false);
        setNewLabel('');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={creating ? CREATE_VALUE : knownValue}
        onChange={handleSelectChange}
        disabled={disabled}
        className={className}
        aria-label={placeholder}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {displayOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {onCreateOption && !disabled && (
          <option value={CREATE_VALUE}>{createLabel}</option>
        )}
      </select>

      {creating && onCreateOption && (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Nama kategori baru..."
            className="flex-1 min-w-[8rem] px-3 py-2 rounded-xl border border-slate-200 text-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving || !newLabel.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Simpan
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
