import { useMemo, useState } from 'react';
import type { RppMaterial } from '../../types/rpp';

type Props = {
  value: string;
  onChange: (value: string) => void;
  materials: RppMaterial[];
  placeholder?: string;
  className?: string;
  onSelectMaterial?: (material: RppMaterial) => void;
};

export default function MaterialAutosuggest({
  value,
  onChange,
  materials,
  placeholder = 'Nama material...',
  className = '',
  onSelectMaterial,
}: Props) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return materials.slice(0, 8);
    return materials
      .filter(m => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [materials, value]);

  const pick = (m: RppMaterial) => {
    onChange(m.name);
    onSelectMaterial?.(m);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(m => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(m)}
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-slate-500 ml-2">{m.unit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
