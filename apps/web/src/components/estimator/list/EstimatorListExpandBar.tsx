import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  totalCount: number;
  visibleCount: number;
  /** Daftar disembunyikan — tap untuk buka. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onShowAll?: () => void;
  onShowLess?: () => void;
  pageSize: number;
};

export default function EstimatorListExpandBar({
  totalCount,
  visibleCount,
  collapsed = false,
  onToggleCollapsed,
  onShowAll,
  onShowLess,
  pageSize,
}: Props) {
  if (totalCount === 0) return null;

  const remaining = Math.max(0, totalCount - visibleCount);
  const canLoadMore = !collapsed && remaining > 0;
  const canShowLess = !collapsed && visibleCount >= totalCount && totalCount > pageSize;

  if (collapsed && onToggleCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={false}
        className="mx-4 w-[calc(100%-2rem)] flex items-center justify-center gap-2 min-h-12 rounded-[14px] border border-[#E5EAE8] bg-white text-slate-800 shadow-sm active:scale-[0.99]"
      >
        <ChevronDown className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden />
        <span className="text-sm font-bold tabular-nums whitespace-nowrap">
          Total {totalCount} estimasi
        </span>
      </button>
    );
  }

  if (canLoadMore && onShowAll) {
    return (
      <button
        type="button"
        onClick={onShowAll}
        aria-expanded={false}
        className="w-full flex items-center justify-center gap-2 min-h-12 rounded-[14px] border border-emerald-200 bg-emerald-50/80 text-emerald-900 active:scale-[0.99]"
      >
        <ChevronDown className="w-5 h-5 shrink-0" aria-hidden />
        <span className="text-sm font-bold tabular-nums whitespace-nowrap">
          Total {totalCount} estimasi
        </span>
        <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
          +{remaining}
        </span>
      </button>
    );
  }

  if (canShowLess && onShowLess) {
    return (
      <button
        type="button"
        onClick={onShowLess}
        aria-expanded
        className="w-full flex items-center justify-center gap-2 min-h-12 rounded-[14px] border border-[#E5EAE8] bg-white text-slate-700 active:scale-[0.99]"
      >
        <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
        <span className="text-sm font-bold tabular-nums whitespace-nowrap">
          Total {totalCount} estimasi
        </span>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Ringkas</span>
      </button>
    );
  }

  return null;
}
