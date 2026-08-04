import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRoomsGrouped } from '../../hooks/useRoomsGrouped';
import {
  applyRoomFilters,
  type RoomFilterState,
} from '../../hooks/useRoomFilters';
import type { RoomCardData, RoomFilter } from '../../types/frontdesk.types';
import FloorGroup from './FloorGroup';
import RoomCardSkeleton from './RoomCardSkeleton';
import EmptyState from '../common/EmptyStates';
import type { RoomCardSizeValue } from './RoomCardSize';

export interface RoomGridViewProps {
  rooms: RoomCardData[];
  onRoomClick: (room: RoomCardData) => void;
  onRoomSaved?: (message: string) => void;
  filters?: RoomFilter;
  searchQuery?: string;
  cardSize?: RoomCardSizeValue;
  loading?: boolean;
  filterState?: RoomFilterState;
}

function toFilterState(
  filters?: RoomFilter,
  filterState?: RoomFilterState,
  searchQuery?: string
): RoomFilterState | undefined {
  if (filterState) {
    return searchQuery !== undefined
      ? { ...filterState, search: searchQuery }
      : filterState;
  }
  if (!filters && searchQuery === undefined) return undefined;
  return {
    search: searchQuery ?? filters?.search ?? '',
    floors: filters?.floors ?? [],
    statuses: filters?.statuses ?? [],
    showInactive: filters?.showInactive ?? false,
    urgentOnly: filters?.urgentOnly ?? false,
    viewMode: filters?.viewMode ?? 'grid',
    roomTypeNames: [],
  };
}

/**
 * Grid view utama — group kamar per lantai dengan filter & search.
 */
export default function RoomGridView({
  rooms,
  onRoomClick,
  onRoomSaved,
  filters,
  searchQuery,
  cardSize = 'md',
  loading = false,
  filterState,
}: RoomGridViewProps) {
  const navigate = useNavigate();

  const effectiveFilters = toFilterState(filters, filterState, searchQuery);

  const visibleRooms = useMemo(() => {
    if (!effectiveFilters) return rooms;
    return applyRoomFilters(rooms, effectiveFilters);
  }, [rooms, effectiveFilters]);

  const { floorList } = useRoomsGrouped(visibleRooms);
  const highlightQuery = effectiveFilters?.search ?? searchQuery ?? '';

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <RoomCardSkeleton key={i} size={cardSize} />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <EmptyState
        variant="no-rooms"
        actionLabel="Tambah Kamar Pertama"
        onAction={() => navigate('/rooms')}
        data-testid="room-grid-empty-all"
      />
    );
  }

  if (visibleRooms.length === 0) {
    return (
      <EmptyState
        variant="no-search-results"
        className="border-solid"
        data-testid="room-grid-empty-filter"
      />
    );
  }

  return (
    <div className="space-y-5" data-testid="room-grid-view">
      {floorList.map((floor, index) => (
        <FloorGroup
          key={floor.floorName}
          floorName={floor.floorName}
          rooms={floor.rooms}
          summary={floor.summary}
          onRoomClick={onRoomClick}
          onRoomSaved={onRoomSaved}
          cardSize={cardSize}
          searchQuery={highlightQuery}
          staggerIndex={index}
          defaultExpanded
        />
      ))}
    </div>
  );
}
