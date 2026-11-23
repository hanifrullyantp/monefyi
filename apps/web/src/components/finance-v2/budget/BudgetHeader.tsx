import { useState } from 'react';
import { ArrowLeft, Check, MoreHorizontal } from 'lucide-react';

const STEPS = ['Template', 'Kategori', 'Detail', 'Review'] as const;

type Props = {
  name: string;
  step: number;
  saved: boolean;
  onNameChange: (name: string) => void;
  onBack?: () => void;
  onMenuAction?: (action: 'save-template' | 'sync-opex') => void;
};

export default function BudgetHeader({
  name,
  step,
  saved,
  onNameChange,
  onBack,
  onMenuAction,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = Math.min(100, ((step + 1) / STEPS.length) * 100);

  return (
    <header className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-[#F9FAFB]/95 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              className="text-xl font-black text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 w-full max-w-xs"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xl font-black text-slate-900 truncate text-left hover:text-blue-600"
            >
              {name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
              saved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {saved && <Check className="w-3 h-3" />}
            {saved ? 'Tersimpan otomatis' : 'Menyimpan…'}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              aria-label="Menu"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-30">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => { onMenuAction?.('save-template'); setMenuOpen(false); }}
                >
                  Simpan sebagai Template
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => { onMenuAction?.('sync-opex'); setMenuOpen(false); }}
                >
                  Sinkron ke Operasional
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1 text-[11px] font-semibold text-slate-400 mb-2">
        {STEPS.map((label, i) => (
          <span key={label} className={i <= step ? 'text-blue-600' : ''}>
            {i > 0 && ' → '}
            {label}
          </span>
        ))}
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
