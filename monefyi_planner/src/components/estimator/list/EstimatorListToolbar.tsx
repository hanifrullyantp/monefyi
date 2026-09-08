import { Search, SlidersHorizontal, X } from 'lucide-react';

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenOptions: () => void;
  activeFilterLabel?: string | null;
  onClearFilter?: () => void;
};

export default function EstimatorListToolbar({
  search,
  onSearchChange,
  onOpenOptions,
  activeFilterLabel,
  onClearFilter,
}: Props) {
  return (
    <div className="px-4 py-3 space-y-2 lg:hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2.5 transition-all duration-200">
          <Search size={16} className="text-slate-400 shrink-0" aria-hidden />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari estimasi..."
            className="bg-transparent outline-none flex-1 text-sm text-slate-900 placeholder:text-slate-400 min-w-0"
            aria-label="Cari estimasi"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 active:scale-95"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenOptions}
          className="p-2.5 rounded-full hover:bg-slate-100 text-slate-600 transition-all duration-200 active:scale-95 shrink-0"
          aria-label="Opsi tampilan dan filter"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {activeFilterLabel && onClearFilter && (
        <button
          type="button"
          onClick={onClearFilter}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full active:scale-95 transition-all duration-200"
        >
          Filter: {activeFilterLabel}
          <X size={12} />
        </button>
      )}
    </div>
  );
}
