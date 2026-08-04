import { SlidersHorizontal, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import QuickSearchInput, { type QuickSearchInputHandle } from './QuickSearchInput';
import type { RoomCardSizeValue } from './RoomCardSize';
import ViewModeDropdown from './ViewModeDropdown';
import RoomCardSizeDropdown from './RoomCardSizeDropdown';
import RoomStatusLegend from './RoomStatusLegend';
import type { ViewMode } from '../../types/frontdesk.types';

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
 * Toolbar Front Desk — satu baris ringkas: search + kontrol.
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
      <div className="flex items-center gap-1.5 p-2 sm:gap-2 sm:p-2.5">
        <QuickSearchInput
          ref={searchRef}
          value={search}
          onChange={onSearchChange}
          className="min-w-0 flex-1"
          compact
        />

        <div className="flex shrink-0 items-center gap-1 no-print">
          <button
            type="button"
            onClick={onToggleFilter}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border sm:w-auto sm:gap-1 sm:px-2',
              showFilterPanel || activeFilterCount > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800'
            )}
            aria-label="Filter kamar"
            data-testid="room-grid-filter-toggle"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="hidden rounded-full bg-emerald-600 px-1 text-[9px] text-white sm:inline">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleLegend}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border',
              showLegend
                ? 'border-slate-300 bg-slate-100 text-slate-700'
                : 'border-slate-200 text-slate-500'
            )}
            aria-label="Legenda status"
            title="Legenda status"
          >
            <Info className="h-3.5 w-3.5" />
          </button>

          <ViewModeDropdown value={viewMode} onChange={onViewModeChange} />
          <RoomCardSizeDropdown value={cardSize} onChange={onCardSizeChange} />
        </div>
      </div>

      {showLegend && (
        <div className="border-t border-slate-100 px-2.5 pb-2 pt-1 dark:border-slate-800 sm:px-3">
          <RoomStatusLegend viewMode={viewMode} className="border-t-0 pt-1" />
        </div>
      )}

      {showFilterContent && filterContent && (
        <div className="border-t border-slate-100 px-2.5 pb-3 pt-2 dark:border-slate-800 no-print sm:px-3">
          {filterContent}
        </div>
      )}
    </div>
  );
}
