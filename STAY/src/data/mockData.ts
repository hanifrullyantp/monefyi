import type {
  Tenant, UserProfile, RoomType, Room, Guest, Booking,
  Payment, HousekeepingTask, DashboardStats, RevenueData,
  OccupancyData, Notification
} from '../types';

export const mockTenant: Tenant = {
  id: 'tenant-1',
  name: 'Villa Emerald Resort',
  slug: 'villa-emerald',
  primaryColor: '#10b981',
  address: 'Jl. Raya Puncak No. 123, Bogor, Jawa Barat',
  phone: '0251-1234567',
  email: 'hello@emeraldresort.com',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  taxPercent: 10,
  serviceChargePercent: 5,
  currency: 'IDR',
  subscriptionPlan: 'pro',
  subscriptionExpiry: '2025-12-31',
  createdAt: '2024-01-01',
};

export const mockUsers: UserProfile[] = [
  { id: 'user-1', tenantId: 'tenant-1', name: 'Budi Santoso', email: 'owner@stay.com', role: 'owner', phone: '081234567890', isActive: true, createdAt: '2024-01-01' },
  { id: 'user-2', tenantId: 'tenant-1', name: 'Sari Dewi', email: 'manager@stay.com', role: 'manager', phone: '081234567891', isActive: true, createdAt: '2024-01-05' },
  { id: 'user-3', tenantId: 'tenant-1', name: 'Ahmad Fauzi', email: 'receptionist@stay.com', role: 'receptionist', phone: '081234567892', isActive: true, createdAt: '2024-01-10' },
];

export const mockRoomTypes: RoomType[] = [
  {
    id: 'rt-1',
    tenantId: 'tenant-1',
    name: 'Standard Room',
    description: 'Kamar nyaman minimalis dengan fasilitas lengkap, cocok untuk staycation singkat atau perjalanan bisnis.',
    basePrice: 350000,
    capacity: 2,
    bedType: 'Queen Bed',
    size: 24,
    facilities: ['AC', 'WiFi', 'TV', 'Kamar Mandi Dalam', 'Air Panas', 'Lemari'],
    photos: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800'],
    isActive: true,
  },
  {
    id: 'rt-2',
    tenantId: 'tenant-1',
    name: 'Deluxe Room',
    description: 'Kamar luas dengan pemandangan taman asri. Dilengkapi dengan minibar dan sofa santai untuk kenyamanan ekstra.',
    basePrice: 550000,
    capacity: 2,
    bedType: 'King Bed',
    size: 32,
    facilities: ['AC', 'WiFi', 'TV', 'Kamar Mandi Dalam', 'Air Panas', 'Lemari', 'Mini Bar', 'Balkon'],
    photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800'],
    isActive: true,
  },
  {
    id: 'rt-3',
    tenantId: 'tenant-1',
    name: 'Executive Suite',
    description: 'Suite mewah dengan ruang tamu terpisah, mini kitchen, dan kamar mandi dengan bathtub. Pilihan terbaik untuk kenyamanan maksimal.',
    basePrice: 1250000,
    capacity: 4,
    bedType: 'King Bed + Sofa Bed',
    size: 56,
    facilities: ['AC', 'WiFi', 'TV', 'Kamar Mandi Dalam', 'Air Panas', 'Mini Bar', 'Balkon', 'Bathub', 'Ruang Tamu', 'Dapur Kecil'],
    photos: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800'],
    isActive: true,
  },
  {
    id: 'rt-4',
    tenantId: 'tenant-1',
    name: 'Family Executive',
    description: 'Kamar luas untuk keluarga besar dengan dua tempat tidur king. Area yang lapang untuk anak-anak bermain.',
    basePrice: 850000,
    capacity: 6,
    bedType: '2 Double King Bed',
    size: 45,
    facilities: ['AC', 'WiFi', 'TV', 'Kamar Mandi Dalam', 'Air Panas', 'Lemari', 'Kulkas'],
    photos: ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800'],
    isActive: true,
  },
];

export const mockRooms: Room[] = [
  { id: 'room-101', tenantId: 'tenant-1', roomTypeId: 'rt-1', number: '101', floor: 1, status: 'occupied', isActive: true, positionX: 50, positionY: 50 },
  { id: 'room-102', tenantId: 'tenant-1', roomTypeId: 'rt-1', number: '102', floor: 1, status: 'available', isActive: true, positionX: 200, positionY: 50 },
  { id: 'room-103', tenantId: 'tenant-1', roomTypeId: 'rt-1', number: '103', floor: 1, status: 'cleaning', isActive: true, positionX: 350, positionY: 50 },
  { id: 'room-104', tenantId: 'tenant-1', roomTypeId: 'rt-1', number: '104', floor: 1, status: 'available', isActive: true, positionX: 500, positionY: 50 },
  { id: 'room-105', tenantId: 'tenant-1', roomTypeId: 'rt-2', number: '105', floor: 1, status: 'maintenance', isActive: true, positionX: 50, positionY: 200 },
  { id: 'room-201', tenantId: 'tenant-1', roomTypeId: 'rt-2', number: '201', floor: 2, status: 'occupied', isActive: true, positionX: 200, positionY: 200 },
  { id: 'room-202', tenantId: 'tenant-1', roomTypeId: 'rt-2', number: '202', floor: 2, status: 'available', isActive: true, positionX: 350, positionY: 200 },
  { id: 'room-203', tenantId: 'tenant-1', roomTypeId: 'rt-2', number: '203', floor: 2, status: 'occupied', isActive: true, positionX: 500, positionY: 200 },
  { id: 'room-204', tenantId: 'tenant-1', roomTypeId: 'rt-3', number: '204', floor: 2, status: 'available', isActive: true },
  { id: 'room-301', tenantId: 'tenant-1', roomTypeId: 'rt-3', number: '301', floor: 3, status: 'occupied', isActive: true },
  { id: 'room-302', tenantId: 'tenant-1', roomTypeId: 'rt-4', number: '302', floor: 3, status: 'available', isActive: true },
  { id: 'room-303', tenantId: 'tenant-1', roomTypeId: 'rt-4', number: '303', floor: 3, status: 'occupied', isActive: true },
];

export const mockGuests: Guest[] = [
  { id: 'guest-1', tenantId: 'tenant-1', name: 'Agus Permana', email: 'agus@email.com', phone: '08111222333', idType: 'ktp', idNumber: '3271234567890001', address: 'Bandung', nationality: 'Indonesia', isBlacklisted: false, totalStays: 3, createdAt: '2024-03-15' },
  { id: 'guest-2', tenantId: 'tenant-1', name: 'Dewi Rahayu', email: 'dewi@email.com', phone: '08222333444', idType: 'ktp', idNumber: '3271234567890002', address: 'Jakarta', nationality: 'Indonesia', isBlacklisted: false, totalStays: 7, createdAt: '2024-01-20' },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

export const mockBookings: Booking[] = [
  { id: 'bk-001', tenantId: 'tenant-1', bookingCode: 'STY-2024-001', guestId: 'guest-1', guest: mockGuests[0], roomId: 'room-101', room: { ...mockRooms[0], roomType: mockRoomTypes[0] }, checkIn: yesterday, checkOut: tomorrow, nights: 2, adults: 2, children: 0, status: 'checked_in', paymentStatus: 'paid', totalAmount: 770000, paidAmount: 770000, source: 'manual', createdBy: 'user-3', createdAt: yesterday + 'T10:00:00', updatedAt: yesterday + 'T14:00:00' },
  { id: 'bk-002', tenantId: 'tenant-1', bookingCode: 'STY-2024-002', guestId: 'guest-2', guest: mockGuests[1], roomId: 'room-201', room: { ...mockRooms[5], roomType: mockRoomTypes[1] }, checkIn: today, checkOut: dayAfter, nights: 2, adults: 2, children: 1, status: 'checked_in', paymentStatus: 'partial', totalAmount: 1265000, paidAmount: 500000, source: 'online', createdBy: 'user-3', createdAt: today + 'T08:00:00', updatedAt: today + 'T14:00:00' },
];

export const mockPayments: Payment[] = [
  { id: 'pay-1', tenantId: 'tenant-1', bookingId: 'bk-001', amount: 770000, method: 'transfer', status: 'paid', referenceNumber: 'TRF20240101001', createdAt: yesterday + 'T14:00:00' },
];

export const mockHousekeepingTasks: HousekeepingTask[] = [
  { id: 'hk-1', tenantId: 'tenant-1', roomId: 'room-103', assignedTo: 'user-3', assignedUser: mockUsers[2], status: 'in_progress', type: 'checkout_cleaning', notes: 'Cleaning after checkout', scheduledAt: today + 'T11:00:00', createdAt: today + 'T10:00:00' },
];

export const mockDashboardStats: DashboardStats = {
  revenueToday: 4809500, revenueMonth: 87650000, occupancyRate: 66.7, checkInsToday: 3, checkOutsToday: 1, pendingBookings: 1, availableRooms: 5, totalRooms: 12, occupiedRooms: 5, maintenanceRooms: 1
};

export const mockRevenueData: RevenueData[] = [
  { date: '1 Jun', revenue: 2800000, bookings: 4 }, { date: '2 Jun', revenue: 3500000, bookings: 6 }, { date: '3 Jun', revenue: 2200000, bookings: 3 }, { date: '4 Jun', revenue: 4100000, bookings: 7 }, { date: '5 Jun', revenue: 3800000, bookings: 5 }, { date: '6 Jun', revenue: 5200000, bookings: 8 }, { date: '7 Jun', revenue: 4600000, bookings: 7 }
];

export const mockOccupancyData: OccupancyData[] = [
  { month: 'Jan', rate: 72 }, { month: 'Feb', rate: 65 }, { month: 'Mar', rate: 78 }, { month: 'Apr', rate: 82 }, { month: 'Mei', rate: 88 }, { month: 'Jun', rate: 67 }
];

export const mockNotifications: Notification[] = [
  { id: 'notif-1', type: 'booking', title: 'Booking Baru!', message: 'Agus Permana baru saja memesan Kamar 102', isRead: false, createdAt: today + 'T16:00:00' }
];
