// ==================== ENUMS ====================

export type UserRole = 'owner' | 'manager' | 'receptionist';

export type OnboardingStatus = 'pending' | 'started' | 'completed' | 'skipped';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'blocked';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'transfer' | 'virtual_account' | 'ewallet' | 'qris' | 'credit_card';

export type HousekeepingStatus = 'pending' | 'in_progress' | 'done' | 'verified';

// ==================== ENTITIES ====================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  address: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  taxPercent: number;
  serviceChargePercent: number;
  currency: string;
  subscriptionPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionExpiry: string;
  setupCompleted?: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  onboardingCompleted?: boolean;
  onboardingStatus?: OnboardingStatus;
  marketingOptIn?: boolean;
}

export interface RoomType {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  basePrice: number;
  capacity: number;
  bedType: string;
  size: number;
  facilities: string[];
  photos: string[];
  isActive: boolean;
}

export interface Room {
  id: string;
  tenantId: string;
  roomTypeId: string;
  roomType?: RoomType;
  number: string;
  floor: number;
  status: RoomStatus;
  notes?: string;
  isActive: boolean;
  positionX?: number;
  positionY?: number;
}

export interface Guest {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone: string;
  idType: 'ktp' | 'paspor' | 'sim' | 'kitas';
  idNumber: string;
  address?: string;
  nationality: string;
  isBlacklisted: boolean;
  notes?: string;
  totalStays: number;
  discountCode?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  bookingCode: string;
  guestId: string;
  guest?: Guest;
  roomId: string;
  room?: Room;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  source: 'manual' | 'online' | 'ota';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  bookingId: string;
  booking?: Booking;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNumber?: string;
  externalId?: string; // Xendit External ID
  paymentUrl?: string; // Xendit Invoice URL
  expiryDate?: string;
  notes?: string;
  createdAt: string;
}

export interface HousekeepingTask {
  id: string;
  tenantId: string;
  roomId: string;
  room?: Room;
  assignedTo?: string;
  assignedUser?: UserProfile;
  status: HousekeepingStatus;
  type: 'checkout_cleaning' | 'daily_cleaning' | 'maintenance' | 'inspection';
  notes?: string;
  scheduledAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  revenueToday: number;
  revenueMonth: number;
  occupancyRate: number;
  checkInsToday: number;
  checkOutsToday: number;
  pendingBookings: number;
  availableRooms: number;
  totalRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

export interface OccupancyData {
  month: string;
  rate: number;
}

export interface Notification {
  id: string;
  type: 'booking' | 'payment' | 'checkin' | 'checkout' | 'housekeeping' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
