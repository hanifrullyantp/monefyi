import { differenceInHours, parseISO } from 'date-fns';
import type { Booking, Payment, Room } from '../types';
import type { RoomCardData } from '../types/frontdesk.types';

export type LoyaltyTier = 'Regular' | 'Silver' | 'Gold' | 'Platinum';

export interface RoomDetailContext {
  room: RoomCardData;
  entity?: Room;
  booking?: Booking;
  payments: Payment[];
  photos: string[];
  capacity: number;
  loyaltyTier: LoyaltyTier;
  remainingLabel: string;
}

export function resolveLoyaltyTier(totalStays = 0): LoyaltyTier {
  if (totalStays >= 11) return 'Platinum';
  if (totalStays >= 6) return 'Gold';
  if (totalStays >= 3) return 'Silver';
  return 'Regular';
}

export function computeRemainingStayLabel(
  checkOut: string,
  now = new Date()
): string {
  const checkout = parseISO(checkOut);
  const hoursLeft = differenceInHours(checkout, now);
  if (hoursLeft <= 0) return 'Checkout sekarang';
  const days = Math.floor(hoursLeft / 24);
  const hrs = hoursLeft % 24;
  if (days > 0) return `Sisa ${days} hari ${hrs} jam`;
  return `Sisa ${hrs} jam`;
}

/**
 * Gabungkan RoomCardData dengan entity lengkap dari store.
 */
export function buildRoomDetailContext(
  card: RoomCardData,
  rooms: Room[],
  bookings: Booking[],
  payments: Payment[]
): RoomDetailContext {
  const entity = rooms.find((r) => r.id === card.id);
  const bookingId =
    card.activeBooking?.id ?? card.upcomingBooking?.id;
  const booking = bookingId
    ? bookings.find((b) => b.id === bookingId)
    : undefined;
  const bookingPayments = bookingId
    ? payments.filter((p) => p.bookingId === bookingId)
    : [];

  const photos = entity?.roomType?.photos?.length
    ? entity.roomType.photos
    : [];

  const checkOut =
    card.activeBooking?.checkOut ?? card.upcomingBooking?.checkOut;

  return {
    room: card,
    entity,
    booking,
    payments: bookingPayments,
    photos,
    capacity: entity?.roomType?.capacity ?? 2,
    loyaltyTier: resolveLoyaltyTier(booking?.guest?.totalStays),
    remainingLabel: checkOut
      ? computeRemainingStayLabel(checkOut)
      : '',
  };
}
