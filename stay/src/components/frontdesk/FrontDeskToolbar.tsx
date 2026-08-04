import { SlidersHorizontal, X, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import QuickSearchInput, { type QuickSearchInputHandle } from './QuickSearchInput';
import RoomCardSize, { type RoomCardSizeValue } from './RoomCardSize';
import ViewModeToggle from './ViewModeToggle';
import RoomStatusLegend from './RoomStatusLegend';
import type { ViewMode } from '../../types/frontdesk.types';
import FrontDeskToolbar from './FrontDeskToolbar';
import RoomStatusLegend from './RoomStatusLegend';

export interface FrontDeskToolbarProps {
  searchRef: React.RefObject<QuickSearchInputHandle | null>;
  search: string;
  onSearchChange: (q: string) => void;
  showFilterPanel: boolean;
  onToggleFilter: () => void;
  activeFilterCount: number;
  cardSize: RoomCardSizeValue;
  onCardSizeChange: (size: RoomCardSizeValue) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  showFilterContent?: boolean;
  filterContent?: React.ReactNode;
}

/**
 * Toolbar ringkas Front Desk — search, filter, view mode dalam satu baris.
 */
export default function FrontDeskToolbar({
  searchRef,
  search,
  onSearchChange,
  showFilterPanel,
  onToggleFilter,
  activeFilterCount,
  cardSize,
  onCardSizeChange,
  viewMode,
  onViewModeChange,
  showLegend,
  onToggleLegend,
  showFilterContent,
  filterContent,
}: FrontDeskToolbarProps) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="front-desk-toolbar"
    >
      <div className="flex flex-wrap items-center gap-2 p-2 sm:p-2.5">
        <QuickSearchInput
          ref={searchRef}
          value={search}
          onChange={onSearchChange}
          className="min-w-[120px] flex-1 sm:max-w-xs"
        />

        <div className="flex items-center gap-1.5 no-print">
          <button
            type="button"
            onClick={onToggleFilter}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-wide',
              showFilterPanel || activeFilterCount > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800'
            )}
            data-testid="room-grid-filter-toggle"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-1 text-[9px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleLegend}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
              showLegend
                ? 'border-slate-300 bg-slate-100 text-slate-700'
                : 'border-slate-200 text-slate-500'
            )}
            aria-label="Legenda status"
            title="Legenda status"
          >
            <Info className="h-3.5 w-3.5" />
          </button>

          <RoomCardSize value={cardSize} onChange={onCardSizeChange} className="hidden sm:inline-flex" />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 px-2 py-1.5 dark:border-slate-800 sm:px-2.5">
        <ViewModeToggle value={viewMode} onChange={onViewModeChange} enableLegacyViews />
        <RoomCardSize value={cardSize} onChange={onCardSizeChange} className="sm:hidden" />
      </div>

      {showLegend && (
        <div className="border-t border-slate-100 px-2.5 pb-2 dark:border-slate-800">
          <RoomStatusLegend viewMode={viewMode} className="border-t-0 pt-2" />
        </div>
      )}

      {showFilterContent && filterContent && (
        <div className="border-t border-slate-100 px-2.5 pb-3 pt-2 dark:border-slate-800 no-print">
          {filterContent}
        </div>
      )}
    </div>
  );
}
