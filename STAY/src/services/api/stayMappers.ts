import type {
  Booking,
  Guest,
  HousekeepingTask,
  Notification,
  Payment,
  Room,
  RoomType,
} from '../../types';
import type { AccountingEntry, PricingRule } from '../../store/appStore';

type DbRow = Record<string, unknown>;

export function mapRoomTypeFromDb(row: DbRow): RoomType {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    basePrice: Number(row.base_price),
    capacity: Number(row.capacity) || 2,
    bedType: (row.bed_type as string) || '',
    size: Number(row.size) || 0,
    facilities: (row.facilities as string[]) || [],
    photos: (row.photos as string[]) || [],
    isActive: row.is_active !== false,
  };
}

export function mapRoomFromDb(row: DbRow, roomTypes: RoomType[]): Room {
  const roomTypeId = row.room_type_id as string;
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    roomTypeId,
    roomType: roomTypes.find((rt) => rt.id === roomTypeId),
    number: row.number as string,
    floor: Number(row.floor) || 1,
    status: row.status as Room['status'],
    notes: row.notes as string | undefined,
    isActive: row.is_active !== false,
    positionX: row.position_x != null ? Number(row.position_x) : undefined,
    positionY: row.position_y != null ? Number(row.position_y) : undefined,
  };
}

export function mapGuestFromDb(row: DbRow): Guest {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    email: row.email as string | undefined,
    phone: row.phone as string,
    idType: (row.id_type as Guest['idType']) || 'ktp',
    idNumber: (row.id_number as string) || '',
    address: row.address as string | undefined,
    nationality: (row.nationality as string) || 'Indonesia',
    isBlacklisted: Boolean(row.is_blacklisted),
    notes: row.notes as string | undefined,
    totalStays: Number(row.total_stays) || 0,
    discountCode: row.discount_code as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapBookingFromDb(
  row: DbRow,
  guests: Guest[],
  rooms: Room[]
): Booking {
  const guestId = row.guest_id as string;
  const roomId = row.room_id as string;
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    bookingCode: row.booking_code as string,
    guestId,
    guest: guests.find((g) => g.id === guestId),
    roomId,
    room: rooms.find((r) => r.id === roomId),
    checkIn: row.check_in as string,
    checkOut: row.check_out as string,
    nights: Number(row.nights),
    adults: Number(row.adults) || 1,
    children: Number(row.children) || 0,
    status: row.status as Booking['status'],
    paymentStatus: row.payment_status as Booking['paymentStatus'],
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount) || 0,
    notes: row.notes as string | undefined,
    source: (row.source as Booking['source']) || 'manual',
    createdBy: (row.created_by as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

export function mapPaymentFromDb(row: DbRow): Payment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    bookingId: row.booking_id as string,
    amount: Number(row.amount),
    method: row.method as Payment['method'],
    status: row.status as Payment['status'],
    referenceNumber: row.reference_number as string | undefined,
    externalId: row.external_id as string | undefined,
    paymentUrl: row.payment_url as string | undefined,
    expiryDate: row.expiry_date as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapHousekeepingFromDb(row: DbRow, rooms: Room[]): HousekeepingTask {
  const roomId = row.room_id as string;
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    roomId,
    room: rooms.find((r) => r.id === roomId),
    assignedTo: row.assigned_to as string | undefined,
    status: row.status as HousekeepingTask['status'],
    type: row.type as HousekeepingTask['type'],
    notes: row.notes as string | undefined,
    scheduledAt: (row.scheduled_at as string) || new Date().toISOString(),
    completedAt: row.completed_at as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapNotificationFromDb(row: DbRow): Notification {
  return {
    id: row.id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    message: row.message as string,
    isRead: Boolean(row.is_read),
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapPricingRuleFromDb(row: DbRow): PricingRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    type: row.rule_type as PricingRule['type'],
    adjustment: Number(row.adjustment),
    isActive: row.is_active !== false,
  };
}

export function mapAccountingFromDb(row: DbRow): AccountingEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    date: row.entry_date as string,
    description: row.description as string,
    category: row.category as string,
    type: row.entry_type as AccountingEntry['type'],
    amount: Number(row.amount),
    reference: row.reference as string | undefined,
  };
}

export function mapRemoteTenantData(raw: {
  roomTypes: DbRow[];
  rooms: DbRow[];
  guests: DbRow[];
  bookings: DbRow[];
  payments: DbRow[];
  hk: DbRow[];
  notifications: DbRow[];
  pricingRules: DbRow[];
  accounting: DbRow[];
}) {
  const roomTypes = raw.roomTypes.map(mapRoomTypeFromDb);
  const rooms = raw.rooms.map((r) => mapRoomFromDb(r, roomTypes));
  const guests = raw.guests.map(mapGuestFromDb);
  const bookings = raw.bookings.map((b) => mapBookingFromDb(b, guests, rooms));
  const payments = raw.payments.map(mapPaymentFromDb);
  const housekeepingTasks = raw.hk.map((t) => mapHousekeepingFromDb(t, rooms));
  const notifications = raw.notifications.map(mapNotificationFromDb);
  const pricingRules = raw.pricingRules.map(mapPricingRuleFromDb);
  const accountingEntries = raw.accounting.map(mapAccountingFromDb);

  return {
    roomTypes,
    rooms,
    guests,
    bookings,
    payments,
    housekeepingTasks,
    notifications,
    pricingRules,
    accountingEntries,
  };
}
