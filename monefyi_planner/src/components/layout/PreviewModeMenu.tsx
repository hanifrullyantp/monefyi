import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export default function PreviewModeMenu() {
  const { uiViewMode, setUiViewMode } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`p-2 rounded-xl transition-colors ${open ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-600'}`}
        aria-label="Preview mode"
        title="Preview mode"
      >
        <Eye className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 py-1 bg-white rounded-xl shadow-lg border border-slate-100 z-50">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Preview mode</div>
          {([
            { id: 'auto' as const, label: 'Auto' },
            { id: 'owner' as const, label: 'Owner' },
            { id: 'worker' as const, label: 'Worker' },
          ]).map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setUiViewMode(m.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${uiViewMode === m.id ? 'font-bold text-emerald-600 bg-emerald-50' : 'text-slate-700'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
