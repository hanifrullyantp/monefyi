import { create } from 'zustand';
import type { Booking, Room, Guest, Notification } from '../types';
import { mockBookings, mockRooms, mockRoomTypes, mockGuests, mockNotifications } from '../data/mockData';

interface AppState {
  bookings: Booking[];
  rooms: Room[];
  guests: Guest[];
  notifications: Notification[];
  sidebarOpen: boolean;

  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  updateRoomPosition: (id: string, x: number, y: number) => void;
  addGuest: (guest: Guest) => void;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const roomsWithTypes = mockRooms.map((room) => ({
  ...room,
  roomType: mockRoomTypes.find((rt) => rt.id === room.roomTypeId),
}));

export const useAppStore = create<AppState>((set) => ({
  bookings: mockBookings,
  rooms: roomsWithTypes,
  guests: mockGuests,
  notifications: mockNotifications,
  sidebarOpen: false,

  setBookings: (bookings) => set({ bookings }),

  addBooking: (booking) =>
    set((state) => ({ bookings: [booking, ...state.bookings] })),

  updateBooking: (id, updates) =>
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  updateRoomStatus: (id, status) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  updateRoomPosition: (id, x, y) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, positionX: x, positionY: y } : r)),
    })),

  addGuest: (guest) =>
    set((state) => ({ guests: [guest, ...state.guests] })),

  updateGuest: (id, updates) =>
    set((state) => ({
      guests: state.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
