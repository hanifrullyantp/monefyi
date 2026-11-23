import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { BudgetTemplate } from '../../../types/budgetUsaha';
import { resolveBudgetIcon } from './budgetIcons';

type Props = {
  open: boolean;
  templates: BudgetTemplate[];
  currentId: string | null;
  onClose: () => void;
  onSelect: (template: BudgetTemplate) => void;
};

export default function BudgetTemplateModal({
  open,
  templates,
  currentId,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all');

  if (!open) return null;

  const filtered = templates.filter(t => {
    if (filter === 'system' && !t.isSystem) return false;
    if (filter === 'custom' && t.isSystem) return false;
    if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900">Pilih Template Budget</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari template…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'system', 'custom'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'system' ? 'System' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto flex-1 p-4 grid gap-3">
          {filtered.map(t => {
            const Icon = resolveBudgetIcon(t.icon);
            const selected = t.id === currentId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className={`text-left p-4 rounded-2xl border transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {t.categories.length} kategori
                      {t.isSystem ? ' · System' : ' · Custom'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
