import type { ReactNode } from 'react';
import { ArrowUpDown, ListFilter, Search, X } from 'lucide-react';

type Props = {
  title: string;
  count: number;
  search: string;
  searchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  activeFilterLabel?: string | null;
  onClearFilter?: () => void;
  staleArchiveCount?: number;
  onArchiveStale?: () => void;
  archiveStaleBusy?: boolean;
};

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white border border-[#E5EAE8] text-slate-600 active:scale-95 transition-transform shrink-0"
    >
      {children}
    </button>
  );
}

export default function EstimatorListToolbar({
  title,
  count,
  search,
  searchOpen,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  onOpenFilter,
  onOpenSort,
  activeFilterLabel,
  onClearFilter,
  staleArchiveCount = 0,
  onArchiveStale,
  archiveStaleBusy = false,
}: Props) {
  return (
    <div className="px-4 pt-4 pb-2 space-y-2">
      <div className="flex items-center gap-2 min-h-11">
        {searchOpen ? (
          <div className="flex-1 flex items-center min-h-11 bg-white border border-[#E5EAE8] rounded-full px-3 gap-2">
            <Search size={16} className="text-slate-400 shrink-0" aria-hidden />
            <input
              value={search}
              autoFocus
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Cari kode, judul, klien..."
              className="bg-transparent outline-none flex-1 text-sm text-slate-900 placeholder:text-slate-400 min-w-0"
              aria-label="Cari estimasi"
            />
            <button
              type="button"
              onClick={onSearchClose}
              className="inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 text-slate-500"
              aria-label="Tutup pencarian"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-800 truncate">
                {title}
                <span className="text-slate-400 font-medium"> · {count}</span>
              </h2>
              {activeFilterLabel && onClearFilter && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 -my-2 text-slate-500"
                  aria-label={`Hapus filter ${activeFilterLabel}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <IconBtn label="Cari estimasi" onClick={onSearchOpen}>
              <Search size={16} />
            </IconBtn>
            <IconBtn label="Filter estimasi" onClick={onOpenFilter}>
              <ListFilter size={16} />
            </IconBtn>
            <IconBtn label="Urutkan estimasi" onClick={onOpenSort}>
              <ArrowUpDown size={16} />
            </IconBtn>
          </>
        )}
      </div>

      {staleArchiveCount > 0 && onArchiveStale && (
        <button
          type="button"
          onClick={onArchiveStale}
          disabled={archiveStaleBusy}
          className="w-full min-h-11 rounded-full border border-rose-200 bg-rose-50 text-rose-800 text-sm font-bold active:scale-[0.99] disabled:opacity-60"
        >
          Arsipkan semua yang mandek ({staleArchiveCount})
        </button>
      )}
    </div>
  );
}
