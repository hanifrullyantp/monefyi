import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { mapRoomsToCardData } from '../../utils/mapRoomsToCardData';
import { computeFrontDeskStats } from '../../utils/urgentActions';
import { useRoomFilters } from '../../hooks/useRoomFilters';
import { useUrgentActions } from '../../hooks/useUrgentActions';
import { useFrontDeskToast } from '../../hooks/useFrontDeskToast';
import { RoomStatus, type RoomCardData, type ViewMode } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';
import RoomGridView from '../../components/frontdesk/RoomGridView';
import RoomCardSize, {
  persistRoomCardSize,
  readRoomCardSize,
  type RoomCardSizeValue,
} from '../../components/frontdesk/RoomCardSize';
import FrontDeskHeader from '../../components/frontdesk/FrontDeskHeader';
import UrgentActionBar from '../../components/frontdesk/UrgentActionBar';
import ViewModeToggle from '../../components/frontdesk/ViewModeToggle';
import QuickSearchInput from '../../components/frontdesk/QuickSearchInput';
import FrontDeskToast from '../../components/frontdesk/FrontDeskToast';
import { getAllStatusDefinitions } from '../../constants/roomStatus';

export interface ReceptionistDashboardProps {
  onRoomClick?: (room: RoomCardData) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  renderLegacyView?: () => ReactNode;
  loading?: boolean;
  /** Aktifkan tombol Denah & Timeline */
  enableLegacyViews?: boolean;
}

/**
 * Dashboard resepsionis — header personal, urgent bar, grid kamar per lantai.
 */
export default function ReceptionistDashboard({
  onRoomClick,
  viewMode = 'grid',
  onViewModeChange,
  renderLegacyView,
  loading = false,
  enableLegacyViews = false,
}: ReceptionistDashboardProps) {
  const { rooms, bookings } = useAppStore();
  const { user } = useAuthStore();
  const [cardSize, setCardSize] = useState<RoomCardSizeValue>(readRoomCardSize);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const { toasts, showToast, dismiss } = useFrontDeskToast();

  const roomCards = useMemo(
    () => mapRoomsToCardData(rooms, bookings),
    [rooms, bookings]
  );

  const {
    actions: urgentActions,
    showBar: showUrgentBar,
    dismissBar,
    runAction,
    loadingId: urgentLoadingId,
  } = useUrgentActions();

  const stats = useMemo(
    () => computeFrontDeskStats(roomCards, bookings, urgentActions.length),
    [roomCards, bookings, urgentActions.length]
  );

  const {
    filters,
    setSearch,
    toggleStatus,
    toggleFloor,
    toggleRoomType,
    toggleUrgentOnly,
    resetFilters,
    applyStatFilter,
    activeFilterCount,
    activeStatKey,
  } = useRoomFilters(roomCards);

  const availableFloors = useMemo(
    () => [...new Set(roomCards.map((r) => r.floor))].sort((a, b) => a - b),
    [roomCards]
  );

  const availableTypes = useMemo(
    () => [...new Set(roomCards.map((r) => r.roomTypeName))].sort(),
    [roomCards]
  );

  const handleCardSizeChange = useCallback((size: RoomCardSizeValue) => {
    setCardSize(size);
    persistRoomCardSize(size);
  }, []);

  const handleRoomClick = useCallback(
    (room: RoomCardData) => {
      onRoomClick?.(room);
    },
    [onRoomClick]
  );

  const handleUrgentAction = useCallback(
    async (action: Parameters<typeof runAction>[0]) => {
      const result = await runAction(action);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast('Gagal memproses aksi', 'error');
      }
      return result;
    },
    [runAction, showToast]
  );

  const handleViewAllUrgent = useCallback(() => {
    applyStatFilter('urgent');
    setShowFilterPanel(true);
  }, [applyStatFilter]);

  const userName = user?.name?.split(' ')[0] ?? 'Resepsionis';

  return (
    <div className="flex flex-col gap-4" data-testid="receptionist-dashboard">
      <FrontDeskHeader
        userName={userName}
        stats={stats}
        activeStatKey={activeStatKey}
        onStatClick={applyStatFilter}
      />

      {showUrgentBar && (
        <UrgentActionBar
          actions={urgentActions}
          loadingId={urgentLoadingId}
          onAction={handleUrgentAction}
          onDismiss={dismissBar}
          onViewAll={handleViewAllUrgent}
        />
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <QuickSearchInput
            value={filters.search}
            onChange={setSearch}
            className="max-w-none lg:max-w-md lg:flex-1"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterPanel((v) => !v)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide',
                showFilterPanel || activeFilterCount > 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
              data-testid="room-grid-filter-toggle"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <RoomCardSize value={cardSize} onChange={handleCardSizeChange} />
          </div>
        </div>

        <ViewModeToggle
          value={viewMode}
          onChange={(mode) => onViewModeChange?.(mode)}
          enableLegacyViews={enableLegacyViews}
        />

        {showFilterPanel && (
          <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {getAllStatusDefinitions().map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => toggleStatus(def.key as RoomStatus)}
                    className={cn(
                      'min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold',
                      filters.statuses.includes(def.key as RoomStatus)
                        ? cn(def.colors.borderClass, def.colors.bgClass, def.colors.textClass)
                        : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                    )}
                  >
                    {def.label}
                  </button>
                ))}
              </div>
            </div>

            {availableFloors.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Lantai
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableFloors.map((floor) => (
                    <button
                      key={floor}
                      type="button"
                      onClick={() => toggleFloor(floor)}
                      className={cn(
                        'min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold',
                        filters.floors.includes(floor)
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-500'
                      )}
                    >
                      {floor <= 0 ? 'Dasar' : `Lantai ${floor}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableTypes.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tipe Kamar
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((typeName) => (
                    <button
                      key={typeName}
                      type="button"
                      onClick={() => toggleRoomType(typeName)}
                      className={cn(
                        'min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold',
                        filters.roomTypeNames.includes(typeName)
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-slate-200 text-slate-500'
                      )}
                    >
                      {typeName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleUrgentOnly}
                className={cn(
                  'min-h-[44px] rounded-xl border px-4 py-2 text-xs font-bold',
                  filters.urgentOnly
                    ? 'border-coral-400 bg-coral-50 text-coral-900'
                    : 'border-slate-200 text-slate-500'
                )}
              >
                Hanya Urgent
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'grid' ? (
        <RoomGridView
          rooms={roomCards}
          onRoomClick={handleRoomClick}
          filterState={filters}
          cardSize={cardSize}
          loading={loading}
        />
      ) : (
        renderLegacyView?.() ?? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            Mode {viewMode} akan tersedia di phase berikutnya.
          </div>
        )
      )}

      <FrontDeskToast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
