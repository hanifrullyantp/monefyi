import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { isToday, parseISO } from 'date-fns';
import {
  DEFAULT_ROOM_FILTER,
  RoomStatus,
  type FrontDeskStatKey,
  type RoomCardData,
  type RoomFilter,
} from '../types/frontdesk.types';

export type RoomFilterState = RoomFilter & {
  roomTypeNames: string[];
  checkInToday?: boolean;
  checkOutToday?: boolean;
};

export const DEFAULT_FILTER_STATE: RoomFilterState = {
  ...DEFAULT_ROOM_FILTER,
  roomTypeNames: [],
};

/**
 * Cek apakah kamar match filter aktif.
 */
export function matchesFilter(room: RoomCardData, filters: RoomFilterState): boolean {
  if (!filters.showInactive && !room.isActive) return false;

  if (filters.floors.length > 0 && !filters.floors.includes(room.floor)) {
    return false;
  }

  if (filters.statuses.length > 0 && !filters.statuses.includes(room.status)) {
    return false;
  }

  if (filters.roomTypeNames.length > 0 && !filters.roomTypeNames.includes(room.roomTypeName)) {
    return false;
  }

  if (filters.urgentOnly && room.urgencyLevel < 2) {
    return false;
  }

  if (filters.checkInToday) {
    const checkIn =
      room.upcomingBooking?.checkIn ?? room.activeBooking?.checkIn;
    if (!checkIn || !isToday(parseISO(checkIn))) return false;
  }

  if (filters.checkOutToday) {
    const checkOut = room.activeBooking?.checkOut;
    if (!checkOut || !isToday(parseISO(checkOut))) return false;
  }

  const query = filters.search.trim().toLowerCase();
  if (query) {
    const guestName =
      room.activeBooking?.guest?.name ?? room.upcomingBooking?.guest?.name ?? '';
    const bookingCode =
      room.activeBooking?.bookingCode ?? room.upcomingBooking?.bookingCode ?? '';
    const haystack = [room.number, room.roomTypeName, guestName, bookingCode]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}

export function applyRoomFilters(
  rooms: RoomCardData[],
  filters: RoomFilterState
): RoomCardData[] {
  return rooms.filter((room) => matchesFilter(room, filters));
}

export function isSearchMatch(room: RoomCardData, searchQuery: string): boolean {
  if (!searchQuery.trim()) return false;
  const query = searchQuery.trim().toLowerCase();
  const guestName =
    room.activeBooking?.guest?.name ?? room.upcomingBooking?.guest?.name ?? '';
  const bookingCode =
    room.activeBooking?.bookingCode ?? room.upcomingBooking?.bookingCode ?? '';
  return [room.number, room.roomTypeName, guestName, bookingCode]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export interface UseRoomFiltersResult {
  filters: RoomFilterState;
  setFilters: Dispatch<SetStateAction<RoomFilterState>>;
  setSearch: (search: string) => void;
  toggleStatus: (status: RoomStatus) => void;
  toggleFloor: (floor: number) => void;
  toggleRoomType: (typeName: string) => void;
  toggleUrgentOnly: () => void;
  resetFilters: () => void;
  applyStatFilter: (key: FrontDeskStatKey) => void;
  filteredRooms: RoomCardData[];
  activeFilterCount: number;
  activeStatKey: FrontDeskStatKey | null;
}

export function useRoomFilters(rooms: RoomCardData[]): UseRoomFiltersResult {
  const [filters, setFilters] = useState<RoomFilterState>(DEFAULT_FILTER_STATE);
  const [activeStatKey, setActiveStatKey] = useState<FrontDeskStatKey | null>(null);

  const filteredRooms = useMemo(
    () => applyRoomFilters(rooms, filters),
    [rooms, filters]
  );

  const setSearch = useCallback((search: string) => {
    setActiveStatKey(null);
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const toggleStatus = useCallback((status: RoomStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const toggleFloor = useCallback((floor: number) => {
    setFilters((prev) => ({
      ...prev,
      floors: prev.floors.includes(floor)
        ? prev.floors.filter((f) => f !== floor)
        : [...prev.floors, floor],
    }));
  }, []);

  const toggleRoomType = useCallback((typeName: string) => {
    setFilters((prev) => ({
      ...prev,
      roomTypeNames: prev.roomTypeNames.includes(typeName)
        ? prev.roomTypeNames.filter((t) => t !== typeName)
        : [...prev.roomTypeNames, typeName],
    }));
  }, []);

  const toggleUrgentOnly = useCallback(() => {
    setFilters((prev) => ({ ...prev, urgentOnly: !prev.urgentOnly }));
  }, []);

  const resetFilters = useCallback(() => {
    setActiveStatKey(null);
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  const applyStatFilter = useCallback((key: FrontDeskStatKey) => {
    setActiveStatKey(key);
    const base = { ...DEFAULT_FILTER_STATE };
    switch (key) {
      case 'total':
        setFilters(base);
        break;
      case 'occupied':
        setFilters({
          ...base,
          statuses: [RoomStatus.OCCUPIED, RoomStatus.UNPAID],
        });
        break;
      case 'available':
        setFilters({ ...base, statuses: [RoomStatus.AVAILABLE] });
        break;
      case 'checkInToday':
        setFilters({ ...base, checkInToday: true });
        break;
      case 'checkOutToday':
        setFilters({ ...base, checkOutToday: true });
        break;
      case 'urgent':
        setFilters({ ...base, urgentOnly: true });
        break;
      default:
        setFilters(base);
    }
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses.length > 0) count += 1;
    if (filters.floors.length > 0) count += 1;
    if (filters.roomTypeNames.length > 0) count += 1;
    if (filters.urgentOnly) count += 1;
    if (filters.checkInToday) count += 1;
    if (filters.checkOutToday) count += 1;
    if (filters.search.trim()) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    setSearch,
    toggleStatus,
    toggleFloor,
    toggleRoomType,
    toggleUrgentOnly,
    resetFilters,
    applyStatFilter,
    filteredRooms,
    activeFilterCount,
    activeStatKey,
  };
}
