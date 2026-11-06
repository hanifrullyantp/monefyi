import type { ReactNode } from 'react';
import { Search, X, ArrowUpDown, LayoutGrid } from 'lucide-react';

type Props = {
  title: string;
  count?: number;
  search: string;
  searchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Filter reset
  showResetFilter?: boolean;
  onResetFilter?: () => void;

  // Sort
  sortLabel?: string;
  onOpenSort?: () => void;

  // View toggle
  viewActive?: boolean;
  onToggleView?: () => void;
  viewContent?: ReactNode;

  // View all action (for Home)
  onViewAll?: () => void;
  viewAllLabel?: string;

  // Optional custom right action
  rightActions?: ReactNode;
};

export default function ToolRow({
  title,
  count,
  search,
  searchOpen,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  searchPlaceholder = 'Cari proyek...',
  showResetFilter = false,
  onResetFilter,
  sortLabel,
  onOpenSort,
  viewActive = false,
  onToggleView,
  viewContent,
  onViewAll,
  viewAllLabel = 'Lihat Semua →',
  rightActions,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 min-h-11">
        {searchOpen ? (
          <>
            <div className="flex-1 h-11 rounded-xl bg-white border-2 border-[#059669] flex items-center gap-2 px-3 text-[#047857]">
              <Search className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={search}
                autoFocus
                onChange={e => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-sm text-[#0F172A] placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={onSearchClose}
              aria-label="Tutup pencarian"
              className="w-11 h-11 rounded-xl bg-white border border-[#E5EAE8] flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            {/* Title & Count */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-[#0F172A] whitespace-nowrap truncate">
                {title}
              </span>
              {count != null && (
                <span className="text-sm font-semibold text-[#5B6B7A] shrink-0">
                  · {count}
                </span>
              )}
              {showResetFilter && (
                <button
                  type="button"
                  onClick={onResetFilter}
                  aria-label="Hapus filter"
                  className="w-7 h-7 rounded-full border-0 bg-[#E2E8E5] text-slate-700 flex items-center justify-center p-0 shrink-0 hover:bg-slate-300 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={onSearchOpen}
              aria-label="Cari proyek"
              className="w-11 h-11 rounded-xl bg-white border border-[#E5EAE8] flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform shrink-0"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Sort Button */}
            {onOpenSort && (
              <button
                type="button"
                onClick={onOpenSort}
                aria-label={`Urutkan: ${sortLabel || 'Terbaru'}`}
                className="h-11 px-2.5 rounded-xl bg-white border border-[#E5EAE8] flex items-center gap-1 text-slate-700 font-bold text-xs active:scale-95 transition-transform shrink-0"
              >
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{sortLabel || 'Terbaru'}</span>
              </button>
            )}

            {/* View Toggle Button */}
            {onToggleView && (
              <button
                type="button"
                onClick={onToggleView}
                aria-label="Ganti tampilan"
                aria-expanded={viewActive}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center p-0 text-slate-700 active:scale-95 transition-transform shrink-0 ${
                  viewActive
                    ? 'bg-[#E9EFEC] border-[#A7F3D0]'
                    : 'bg-white border-[#E5EAE8]'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            )}

            {/* View All (Home) */}
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="h-11 px-2 sm:px-3 rounded-xl border-0 bg-transparent text-[#047857] font-extrabold text-xs sm:text-[13px] active:scale-95 transition-transform shrink-0 whitespace-nowrap"
              >
                {viewAllLabel}
              </button>
            )}

            {rightActions}
          </>
        )}
      </div>

      {/* Expandable View Content (if open) */}
      {viewActive && viewContent && <div>{viewContent}</div>}
    </div>
  );
}
