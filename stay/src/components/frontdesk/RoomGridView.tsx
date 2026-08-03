import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Plus, SearchX } from 'lucide-react';

import { useRoomsGrouped } from '../../hooks/useRoomsGrouped';
import {
  applyRoomFilters,
  type RoomFilterState,
} from '../../hooks/useRoomFilters';
import type { RoomCardData, RoomFilter } from '../../types/frontdesk.types';
import Button from '../ui/Button';
import FloorGroup from './FloorGroup';
import RoomCardSkeleton from './RoomCardSkeleton';
import type { RoomCardSizeValue } from './RoomCardSize';

export interface RoomGridViewProps {
  rooms: RoomCardData[];
  onRoomClick: (room: RoomCardData) => void;
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
      <div
        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900"
        data-testid="room-grid-empty-all"
      >
        <BedDouble className="mb-4 h-14 w-14 text-slate-300" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">
          Belum Ada Kamar Terdaftar
        </h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Mulai dengan menambahkan kamar pertama agar front desk siap menerima tamu.
        </p>
        <Button
          className="mt-6 min-h-[44px] rounded-2xl"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/rooms')}
        >
          Tambah Kamar Pertama
        </Button>
      </div>
    );
  }

  if (visibleRooms.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900"
        data-testid="room-grid-empty-filter"
      >
        <SearchX className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">
          Tidak Ada Kamar Cocok
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Coba ubah filter atau kata kunci pencarian Anda.
        </p>
      </div>
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
          cardSize={cardSize}
          searchQuery={highlightQuery}
          staggerIndex={index}
          defaultExpanded
        />
      ))}
    </div>
  );
}
