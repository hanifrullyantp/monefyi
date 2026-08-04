import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/appStore';
import { mapRoomsToCardData } from '../utils/mapRoomsToCardData';
import type { RoomCardData } from '../types/frontdesk.types';

const ROOM_CARDS_KEY = ['frontdesk', 'room-cards'] as const;

/**
 * Cached room card data dengan react-query — smart refetch on store change.
 */
export function useFrontDeskRoomCards() {
  const rooms = useAppStore((s) => s.rooms);
  const bookings = useAppStore((s) => s.bookings);

  return useQuery({
    queryKey: [...ROOM_CARDS_KEY, rooms.length, bookings.length],
    queryFn: (): RoomCardData[] => mapRoomsToCardData(rooms, bookings),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/** Invalidate cache setelah optimistic update */
export function useInvalidateRoomCards() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ROOM_CARDS_KEY });
}
