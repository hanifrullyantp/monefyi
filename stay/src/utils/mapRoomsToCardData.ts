import type { Booking, Room } from '../types';
import { RoomStatus, type RoomCardBookingSummary, type RoomCardData } from '../types/frontdesk.types';
import {
  formatStayDuration,
  getStayProgress,
  getTimeUntilCheckout,
  getUrgencyLevel,
  resolveFrontDeskStatus,
  shouldPulse,
} from './roomStatus';

/**
 * Map entity Room + bookings ke RoomCardData untuk UI Front Desk.
 */
export function mapRoomsToCardData(
  rooms: Room[],
  bookings: Booking[]
): RoomCardData[] {
  return rooms.map((room) => mapRoomToCardData(room, bookings));
}

function mapRoomToCardData(room: Room, bookings: Booking[]): RoomCardData {
  const activeBooking = bookings.find(
    (b) => b.roomId === room.id && b.status === 'checked_in'
  );
  const upcomingBooking = bookings.find(
    (b) =>
      b.roomId === room.id &&
      (b.status === 'confirmed' || b.status === 'pending')
  );

  const status = resolveFrontDeskStatus(room, activeBooking, upcomingBooking);
  const activeSummary = activeBooking ? mapBookingSummary(activeBooking) : undefined;
  const upcomingSummary = upcomingBooking ? mapBookingSummary(upcomingBooking) : undefined;

  const card: RoomCardData = {
    id: room.id,
    number: room.number,
    floor: room.floor,
    roomTypeName: room.roomType?.name ?? 'Kamar',
    basePrice: room.roomType?.basePrice ?? 0,
    status,
    rawStatus: room.status,
    isActive: room.isActive,
    positionX: room.positionX,
    positionY: room.positionY,
    activeBooking: activeSummary,
    upcomingBooking: upcomingSummary,
    urgencyLevel: 0,
    shouldPulse: false,
    facilities: room.roomType?.facilities ?? [],
    maintenanceNote: room.status === 'maintenance' ? room.notes : undefined,
    indicators: buildIndicators(status, activeSummary),
    ribbon: buildRibbon(status, upcomingSummary),
  };

  if (activeSummary) {
    card.stayProgress = getStayProgress(activeSummary.checkIn, activeSummary.checkOut);
    card.stayDurationLabel = formatStayDuration(activeSummary.checkIn, activeSummary.checkOut);
    card.checkoutLabel = getTimeUntilCheckout(activeSummary.checkOut);
  }

  card.urgencyLevel = getUrgencyLevel(card);
  card.shouldPulse = shouldPulse(card);

  return card;
}

function mapBookingSummary(booking: Booking): RoomCardBookingSummary {
  const balanceDue = Math.max(0, booking.totalAmount - booking.paidAmount);
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: booking.nights,
    paymentStatus: booking.paymentStatus,
    status: booking.status,
    guest: booking.guest
      ? { id: booking.guest.id, name: booking.guest.name, phone: booking.guest.phone }
      : undefined,
    totalAmount: booking.totalAmount,
    paidAmount: booking.paidAmount,
    balanceDue,
  };
}

function buildIndicators(status: RoomStatus, active?: RoomCardBookingSummary) {
  const indicators: NonNullable<RoomCardData['indicators']> = {};
  if (status === RoomStatus.UNPAID || (active?.balanceDue ?? 0) > 0) {
    indicators.unpaid = true;
  }
  if (status === RoomStatus.DIRTY) {
    indicators.needsCleaning = true;
  }
  return Object.keys(indicators).length > 0 ? indicators : undefined;
}

function buildRibbon(
  status: RoomStatus,
  upcoming?: RoomCardBookingSummary
): RoomCardData['ribbon'] {
  if (status === RoomStatus.UNPAID) return 'URGENT';
  if (upcoming?.status === 'confirmed') return 'BARU';
  return undefined;
}

/** Label lantai natural sort */
export function formatFloorName(floor: number): string {
  if (floor <= 0) return 'Lantai Dasar';
  return `Lantai ${floor}`;
}

/** Parse floor key back to number for sorting */
export function parseFloorKey(floorName: string): number {
  if (floorName === 'Lantai Dasar') return 0;
  const match = floorName.match(/Lantai (\d+)/);
  return match ? Number(match[1]) : 999;
}
