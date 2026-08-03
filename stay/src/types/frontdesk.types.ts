/**
 * TypeScript types untuk redesign Front Desk STAY.
 * Layer UI terpisah dari entity Room/Booking di types/index.ts.
 */

/** Status kamar pada tampilan Front Desk (6 status redesign) */
export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  MAINTENANCE = 'MAINTENANCE',
  UNPAID = 'UNPAID',
}

/** Mode tampilan utama Front Desk */
export type ViewMode = 'grid' | 'floorplan' | 'timeline';

/** Ringkasan tamu untuk kartu kamar */
export interface RoomCardGuestSummary {
  id: string;
  name: string;
  phone?: string;
  photoUrl?: string;
}

/** Ringkasan booking aktif / mendatang */
export interface RoomCardBookingSummary {
  id: string;
  bookingCode: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  guest?: RoomCardGuestSummary;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
}

/** Ikon indikator mini di footer kartu */
export interface RoomCardIndicators {
  unpaid?: boolean;
  needsCleaning?: boolean;
  breakfast?: boolean;
  vip?: boolean;
  kids?: boolean;
  extended?: boolean;
}

/** Data ter-normalisasi untuk render kartu kamar di grid / denah */
export interface RoomCardData {
  id: string;
  number: string;
  floor: number;
  roomTypeName: string;
  basePrice: number;
  status: RoomStatus;
  /** Status operasional dari database (available, occupied, cleaning, dll.) */
  rawStatus: string;
  isActive: boolean;
  positionX?: number;
  positionY?: number;
  activeBooking?: RoomCardBookingSummary;
  upcomingBooking?: RoomCardBookingSummary;
  /** 0–3, dihitung dari status + konteks booking */
  urgencyLevel: 0 | 1 | 2 | 3;
  /** Progress menginap 0–100 (hanya jika checked_in) */
  stayProgress?: number;
  /** Label durasi, mis. "2 malam · 1 hari tersisa" */
  stayDurationLabel?: string;
  /** Label countdown checkout, mis. "Checkout 2 jam lagi" */
  checkoutLabel?: string;
  shouldPulse: boolean;
  facilities: string[];
  /** Ribbon sudut kartu */
  ribbon?: 'VIP' | 'BARU' | 'URGENT';
  /** Catatan singkat maintenance */
  maintenanceNote?: string;
  /** Waktu checkout terakhir (untuk status DIRTY) */
  lastCheckoutAt?: string;
  /** Indikator layanan / kebutuhan tamu */
  indicators?: RoomCardIndicators;
}

/** Aksi mendesak yang perlu ditampilkan di banner Front Desk */
export interface UrgentAction {
  id: string;
  roomId: string;
  roomNumber: string;
  type: 'unpaid' | 'checkout_soon' | 'dirty_backlog' | 'maintenance_overdue';
  title: string;
  description: string;
  urgencyLevel: 2 | 3;
  createdAt: string;
  /** Deep-link action, mis. buka modal checkout atau POS */
  actionLabel: string;
  actionTarget?: 'checkout' | 'pos' | 'housekeeping' | 'room_detail';
  bookingId?: string;
}

/** Filter sidebar / toolbar Front Desk */
export interface RoomFilter {
  search: string;
  floors: number[];
  statuses: RoomStatus[];
  showInactive: boolean;
  /** Hanya kamar dengan aksi urgent */
  urgentOnly: boolean;
  viewMode: ViewMode;
}

/** Nilai default filter */
export const DEFAULT_ROOM_FILTER: RoomFilter = {
  search: '',
  floors: [],
  statuses: [],
  showInactive: false,
  urgentOnly: false,
  viewMode: 'grid',
};

/** Stat ringkas untuk header dashboard resepsionis */
export interface FrontDeskStatSummary {
  totalRooms: number;
  occupied: number;
  available: number;
  reserved: number;
  dirty: number;
  maintenance: number;
  unpaid: number;
  occupancyRate: number;
  revenueToday: number;
}
