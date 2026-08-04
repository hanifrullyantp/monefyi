import { useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { computeFrontDeskStats } from '../../utils/urgentActions';
import { applyRoomFilters, useRoomFilters } from '../../hooks/useRoomFilters';
import { useUrgentActions } from '../../hooks/useUrgentActions';
import { useFrontDeskToast } from '../../hooks/useFrontDeskToast';
import { useFrontDeskRoomCards } from '../../hooks/useFrontDeskData';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { RoomStatus, type RoomCardData, type ViewMode } from '../../types/frontdesk.types';
import { cn } from '../../utils/cn';
import { trackFrontDeskEvent } from '../../utils/frontDeskAnalytics';
import { useAnimationsEnabled } from '../../stores/frontDeskPreferencesStore';
import RoomGridView from '../../components/frontdesk/RoomGridView';
import FloorPlanView from '../../components/frontdesk/floorplan/FloorPlanView';
import FrontDeskTimelineView from '../../components/frontdesk/timeline/TimelineView';
import {
  persistRoomCardSize,
  readRoomCardSize,
  type RoomCardSizeValue,
} from '../../components/frontdesk/RoomCardSize';
import FrontDeskHeader, {
  readDashboardHeaderMode,
  persistDashboardHeaderMode,
  type DashboardHeaderMode,
} from '../../components/frontdesk/FrontDeskHeader';
import UrgentActionBar from '../../components/frontdesk/UrgentActionBar';
import {
  persistViewMode,
  readViewModePreference,
} from '../../components/frontdesk/ViewModeToggle';
import type { QuickSearchInputHandle } from '../../components/frontdesk/QuickSearchInput';
import FrontDeskToolbar from '../../components/frontdesk/FrontDeskToolbar';
import FrontDeskToast from '../../components/frontdesk/FrontDeskToast';
import { getAllStatusDefinitions } from '../../constants/roomStatus';
import { useFrontDeskStore } from '../../stores/frontDeskStore';
import RoomDetailPanel from '../../components/frontdesk/RoomDetailPanel';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import KeyboardShortcutsDialog from '../../components/common/KeyboardShortcutsDialog';
import CommandPalette from '../../components/common/CommandPalette';
import EmptyState from '../../components/common/EmptyStates';

export interface ReceptionistDashboardProps {
  onRoomClick?: (room: RoomCardData) => void;
  onBookingClick?: (bookingId: string, roomId: string) => void;
  onCreateBooking?: (roomId: string, date: Date) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  loading?: boolean;
}

/**
 * Dashboard resepsionis — header personal, urgent bar, grid kamar per lantai.
 */
export default function ReceptionistDashboard({
  onRoomClick,
  onBookingClick,
  onCreateBooking,
  viewMode: controlledViewMode,
  onViewModeChange,
  loading = false,
}: ReceptionistDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { bookings } = useAppStore();
  const { data: roomCards = [], isLoading: cardsLoading } = useFrontDeskRoomCards();
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(readViewModePreference);
  const viewMode = controlledViewMode ?? internalViewMode;
  const [cardSize, setCardSize] = useState<RoomCardSizeValue>(readRoomCardSize);
  const [headerMode, setHeaderMode] = useState<DashboardHeaderMode>(readDashboardHeaderMode);
  const [showLegend, setShowLegend] = useState(false);
  const selectRoom = useFrontDeskStore((s) => s.selectRoom);
  const closeDetailPanel = useFrontDeskStore((s) => s.closeDetailPanel);
  const isDetailPanelOpen = useFrontDeskStore((s) => s.isDetailPanelOpen);
  const setActiveViewStore = useFrontDeskStore((s) => s.setActiveView);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const searchRef = useRef<QuickSearchInputHandle>(null);
  const { toasts, showToast, dismiss } = useFrontDeskToast();
  const animationsEnabled = useAnimationsEnabled();
  const isLoading = loading || cardsLoading;

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

  const handleHeaderModeChange = useCallback((mode: DashboardHeaderMode) => {
    setHeaderMode(mode);
    persistDashboardHeaderMode(mode);
  }, []);

  const handleRoomClick = useCallback(
    (room: RoomCardData) => {
      selectRoom(room);
      onRoomClick?.(room);
    },
    [onRoomClick, selectRoom]
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

  const filteredRooms = useMemo(
    () => applyRoomFilters(roomCards, filters),
    [roomCards, filters]
  );

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      persistViewMode(mode);
      setInternalViewMode(mode);
      setActiveViewStore(mode);
      trackFrontDeskEvent('view_mode_change', { mode });
      onViewModeChange?.(mode);
    },
    [onViewModeChange, setActiveViewStore]
  );

  const handleCreateBooking = useCallback(
    (roomId?: string) => {
      if (roomId && onCreateBooking) {
        onCreateBooking(roomId, new Date());
        return;
      }
      navigate('/bookings', {
        state: { openNew: true, roomId },
      });
    },
    [navigate, onCreateBooking]
  );

  const handleBookingClick = useCallback(
    (bookingId: string, roomId: string) => {
      const card = roomCards.find((r) => r.id === roomId);
      if (card) selectRoom(card);
      onBookingClick?.(bookingId, roomId);
    },
    [roomCards, selectRoom, onBookingClick]
  );

  const handleCloseOverlays = useCallback(() => {
    if (commandOpen) setCommandOpen(false);
    else if (showShortcuts) setShowShortcuts(false);
    else if (isDetailPanelOpen) closeDetailPanel();
  }, [commandOpen, showShortcuts, isDetailPanelOpen, closeDetailPanel]);

  useKeyboardShortcuts(
    {
      onNewBooking: () => handleCreateBooking(),
      onFocusSearch: () => searchRef.current?.focus(),
      onToggleFilter: () => setShowFilterPanel((v) => !v),
      onViewGrid: () => handleViewModeChange('grid'),
      onViewFloorplan: () => handleViewModeChange('floorplan'),
      onViewTimeline: () => handleViewModeChange('timeline'),
      onCloseOverlay: handleCloseOverlays,
      onShowShortcuts: () => setShowShortcuts(true),
      onOpenCommandPalette: () => setCommandOpen(true),
    },
    true
  );

  const renderActiveView = () => {
    const content = (() => {
      switch (viewMode) {
        case 'floorplan':
          return (
            <FloorPlanView
              rooms={filteredRooms}
              loading={isLoading}
              onRoomClick={handleRoomClick}
            />
          );
        case 'timeline':
          return (
            <FrontDeskTimelineView
              rooms={filteredRooms}
              loading={isLoading}
              onBookingClick={handleBookingClick}
              onCreateBooking={(roomId, date) => {
                if (onCreateBooking) onCreateBooking(roomId, date);
                else navigate('/bookings', { state: { openNew: true, roomId } });
              }}
            />
          );
        default:
          return (
            <RoomGridView
              rooms={roomCards}
              onRoomClick={handleRoomClick}
              onRoomSaved={(msg) => showToast(msg, 'success')}
              filterState={filters}
              cardSize={cardSize}
              loading={isLoading}
            />
          );
      }
    })();

    if (!animationsEnabled) return content;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  const allOccupied =
    roomCards.length > 0 &&
    roomCards.every(
      (r) =>
        r.status === RoomStatus.OCCUPIED ||
        r.status === RoomStatus.UNPAID ||
        r.status === RoomStatus.RESERVED
    );

  const filterPanelContent = (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {getAllStatusDefinitions().map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => toggleStatus(def.key as RoomStatus)}
              className={cn(
                'min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-bold',
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
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Lantai</p>
          <div className="flex flex-wrap gap-1.5">
            {availableFloors.map((floor) => (
              <button
                key={floor}
                type="button"
                onClick={() => toggleFloor(floor)}
                className={cn(
                  'min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-bold',
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
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipe Kamar</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTypes.map((typeName) => (
              <button
                key={typeName}
                type="button"
                onClick={() => toggleRoomType(typeName)}
                className={cn(
                  'min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-bold',
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
            'min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-bold',
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
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-0 flex-col gap-2 lg:gap-3 lg:h-full"
      data-testid="receptionist-dashboard"
    >
      <div className="sticky top-0 z-10 shrink-0 space-y-2 bg-slate-50/95 pb-1 backdrop-blur-sm dark:bg-slate-950/95 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <FrontDeskHeader
          userName={userName}
          stats={stats}
          activeStatKey={activeStatKey}
          onStatClick={applyStatFilter}
          mode={headerMode}
          onModeChange={handleHeaderModeChange}
        />

        {showUrgentBar && (
          <UrgentActionBar
            actions={urgentActions}
            loadingId={urgentLoadingId}
            onAction={handleUrgentAction}
            onDismiss={dismissBar}
            onViewAll={handleViewAllUrgent}
            compact={headerMode === 'compact'}
          />
        )}

        <FrontDeskToolbar
          searchRef={searchRef}
          search={filters.search}
          onSearchChange={(q) => {
            setSearch(q);
            trackFrontDeskEvent('search_query', { length: q.length });
          }}
          showFilterPanel={showFilterPanel}
          onToggleFilter={() => setShowFilterPanel((v) => !v)}
          activeFilterCount={activeFilterCount}
          cardSize={cardSize}
          onCardSizeChange={handleCardSizeChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          showLegend={showLegend}
          onToggleLegend={() => setShowLegend((v) => !v)}
          showFilterContent={showFilterPanel}
          filterContent={filterPanelContent}
        />
      </div>

      <div className="min-h-0 flex-1 lg:overflow-auto">
        {allOccupied && viewMode === 'grid' && (
          <EmptyState variant="all-occupied" className="mb-2 py-4" />
        )}

        <ErrorBoundary area="Front Desk View">{renderActiveView()}</ErrorBoundary>
      </div>

      <ErrorBoundary area="Detail Panel">
        <RoomDetailPanel onToast={showToast} />
      </ErrorBoundary>

      <FrontDeskToast toasts={toasts} onDismiss={dismiss} />

      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNewBooking={() => handleCreateBooking()}
        onToggleFilter={() => setShowFilterPanel((v) => !v)}
        onViewChange={handleViewModeChange}
      />
    </div>
  );
}
