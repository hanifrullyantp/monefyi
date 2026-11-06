import type { ReactNode } from 'react';
import { Search, X, ArrowUpDown, ListChecks, ListFilter, ChevronDown } from 'lucide-react';

type Props = {
  title: string;
  count?: number;
  search: string;
  searchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // List collapse section (like Estimator Image 2)
  listSectionOpen?: boolean;
  onToggleListSection?: () => void;

  // Filter reset
  showResetFilter?: boolean;
  onResetFilter?: () => void;

  // Filter sheet action
  onOpenFilter?: () => void;
  filterActive?: boolean;

  // View toggle (ListChecks like Estimator Image 2)
  viewActive?: boolean;
  onToggleView?: () => void;
  viewContent?: ReactNode;

  // Sort
  sortLabel?: string;
  onOpenSort?: () => void;

  // View all action (for Home)
  onViewAll?: () => void;
  viewAllLabel?: string;

  // Optional custom right action
  rightActions?: ReactNode;
};

function CircleBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-full border active:scale-95 transition-transform shrink-0 ${
        active
          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
          : 'bg-white border-[#E5EAE8] text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function ToolRow({
  title,
  count,
  search,
  searchOpen,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  listSectionOpen = true,
  onToggleListSection,
  showResetFilter = false,
  onResetFilter,
  onOpenFilter,
  filterActive = false,
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
          <div className="flex-1 flex items-center min-h-11 bg-white border border-[#E5EAE8] rounded-full px-3 gap-2">
            <Search size={16} className="text-slate-400 shrink-0" aria-hidden />
            <input
              type="text"
              value={search}
              autoFocus
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="bg-transparent outline-none flex-1 text-sm text-[#0F172A] placeholder:text-slate-400 min-w-0"
            />
            <button
              type="button"
              onClick={onSearchClose}
              className="inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 text-slate-500 hover:text-slate-800"
              aria-label="Tutup pencarian"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            {/* Title & Count + optional Chevron */}
            <div className="flex-1 min-w-0 flex items-center gap-1">
              {onToggleListSection && (
                <button
                  type="button"
                  onClick={onToggleListSection}
                  aria-expanded={listSectionOpen}
                  aria-label={listSectionOpen ? 'Sembunyikan daftar' : 'Tampilkan daftar'}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 shrink-0 rounded-full text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-transform -ml-2"
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-200 ${
                      listSectionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
              <h2 className="text-sm font-extrabold text-[#0F172A] truncate min-w-0 flex items-center gap-1">
                <span className="truncate">{title}</span>
                {count != null && (
                  <span className="text-slate-400 font-semibold shrink-0">· {count}</span>
                )}
              </h2>
              {showResetFilter && onResetFilter && (
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

            {/* Circular Buttons Group matching Gambar 2 (Estimator) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 1. Search Button */}
              <CircleBtn label="Cari" onClick={onSearchOpen}>
                <Search size={16} />
              </CircleBtn>

              {/* 2. View Switcher / Checklist Button */}
              {onToggleView && (
                <CircleBtn
                  label="Ganti tampilan"
                  onClick={onToggleView}
                  active={viewActive}
                >
                  <ListChecks size={16} />
                </CircleBtn>
              )}

              {/* 3. Filter Button */}
              {onOpenFilter && (
                <CircleBtn
                  label="Filter"
                  onClick={onOpenFilter}
                  active={filterActive}
                >
                  <ListFilter size={16} />
                </CircleBtn>
              )}

              {/* 4. Sort Button */}
              {onOpenSort && (
                <CircleBtn
                  label={`Urutkan: ${sortLabel || 'Default'}`}
                  onClick={onOpenSort}
                >
                  <ArrowUpDown size={16} />
                </CircleBtn>
              )}

              {/* View All (for Home screen) */}
              {onViewAll && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="h-11 px-2 sm:px-3 rounded-full border-0 bg-transparent text-[#047857] font-extrabold text-xs sm:text-[13px] active:scale-95 transition-transform shrink-0 whitespace-nowrap"
                >
                  {viewAllLabel}
                </button>
              )}

              {rightActions}
            </div>
          </>
        )}
      </div>

      {/* Expandable View Content (if open) */}
      {viewActive && viewContent && <div>{viewContent}</div>}
    </div>
  );
}

