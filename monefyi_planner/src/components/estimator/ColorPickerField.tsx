interface Props {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#059669', '#10b981', '#34d399', '#047857',
  '#1e293b', '#0f172a', '#64748b', '#f59e0b',
  '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899',
];

export default function ColorPickerField({ label, value, onChange, presets = DEFAULT_PRESETS }: Props) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#059669';

  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map(hex => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => onChange(hex)}
            className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-105 ${
              normalized.toLowerCase() === hex.toLowerCase()
                ? 'border-slate-900 ring-2 ring-offset-1 ring-slate-400'
                : 'border-white shadow-sm'
            }`}
            style={{ backgroundColor: hex }}
            aria-label={`Pilih warna ${hex}`}
          />
        ))}
        <label
          className="relative w-8 h-8 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 overflow-hidden"
          title="Warna kustom"
        >
          <input
            type="color"
            value={normalized}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`${label} kustom`}
          />
          <span className="text-[10px] text-slate-600 font-bold pointer-events-none">+</span>
        </label>
      </div>
      <div
        className="mt-2 h-10 rounded-xl border border-slate-200 shadow-inner"
        style={{ backgroundColor: normalized }}
        aria-hidden
      />
    </div>
  );
}
