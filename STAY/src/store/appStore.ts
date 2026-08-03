import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Booking,
  Guest,
  HousekeepingTask,
  Notification,
  Payment,
  PaymentMethod,
  Room,
  RoomType,
  Tenant,
  UserProfile,
} from '../types';
import {
  mockBookings,
  mockGuests,
  mockHousekeepingTasks,
  mockNotifications,
  mockPayments,
  mockRoomTypes,
  mockRooms,
  mockTenant,
  mockUsers,
} from '../data/mockData';
import { useOfflineStore } from './offlineStore';
import { generateId } from '../utils/id';

export interface PricingRule {
  id: string;
  tenantId: string;
  name: string;
  type: 'weekend' | 'seasonal' | 'occupancy' | 'early_bird';
  adjustment: number;
  isActive: boolean;
}

export interface AccountingEntry {
  id: string;
  tenantId: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  reference?: string;
}

interface CheckoutOptions {
  sendSurvey?: boolean;
  guestPhone?: string;
  guestName?: string;
  bookingCode?: string;
}

interface AppState {
  tenant: Tenant;
  users: UserProfile[];
  roomTypes: RoomType[];
  bookings: Booking[];
  rooms: Room[];
  guests: Guest[];
  payments: Payment[];
  housekeepingTasks: HousekeepingTask[];
  notifications: Notification[];
  pricingRules: PricingRule[];
  accountingEntries: AccountingEntry[];
  sidebarOpen: boolean;

  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  updateRoomStatus: (id: string, status: Room['status']) => void;
  updateRoomPosition: (id: string, x: number | null, y: number | null) => void;
  addRoom: (room: Omit<Room, 'id'>) => void;
  addGuest: (guest: Guest) => void;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  createXenditInvoice: (
    bookingId: string,
    amount: number,
    method: PaymentMethod
  ) => Promise<{ paymentUrl: string; externalId: string; paymentId: string }>;
  settleXenditPayment: (paymentId: string) => Payment | null;
  recordBookingPayment: (
    bookingId: string,
    amount: number,
    method: PaymentMethod,
    referenceNumber?: string,
    notes?: string
  ) => Payment | null;
  recordSplitPayments: (
    bookingId: string,
    splits: { amount: number; method: PaymentMethod; referenceNumber?: string }[]
  ) => Payment[];
  processBookingRefund: (
    bookingId: string,
    amount: number,
    viaXendit: boolean,
    reason: string
  ) => boolean;
  addHousekeepingTask: (task: Omit<HousekeepingTask, 'id' | 'createdAt'>) => HousekeepingTask;
  updateHousekeepingTask: (id: string, updates: Partial<HousekeepingTask>) => void;
  checkoutBooking: (bookingId: string, roomId: string, options?: CheckoutOptions) => void;
  checkInBooking: (bookingId: string, roomId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  updateTenant: (updates: Partial<Tenant>) => void;
  updatePricingRule: (id: string, updates: Partial<PricingRule>) => void;
  addPricingRule: (rule: Omit<PricingRule, 'id'>) => void;
  addAccountingEntry: (entry: Omit<AccountingEntry, 'id'>) => void;
  hydrateFromRemote: (data: Partial<Pick<AppState, 'bookings' | 'rooms' | 'guests' | 'payments' | 'housekeepingTasks' | 'notifications' | 'roomTypes' | 'pricingRules' | 'accountingEntries'>>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const roomsWithTypes = mockRooms.map((room) => ({
  ...room,
  roomType: mockRoomTypes.find((rt) => rt.id === room.roomTypeId),
}));

const defaultPricingRules: PricingRule[] = [
  { id: 'pr-1', tenantId: 'tenant-1', name: 'Weekend Premium', type: 'weekend', adjustment: 15, isActive: true },
  { id: 'pr-2', tenantId: 'tenant-1', name: 'High Season', type: 'seasonal', adjustment: 25, isActive: true },
  { id: 'pr-3', tenantId: 'tenant-1', name: 'Low Occupancy Discount', type: 'occupancy', adjustment: -10, isActive: false },
  { id: 'pr-4', tenantId: 'tenant-1', name: 'Early Bird 14 hari', type: 'early_bird', adjustment: -8, isActive: true },
];

const defaultAccounting: AccountingEntry[] = [
  { id: 'acc-1', tenantId: 'tenant-1', date: new Date().toISOString().split('T')[0], description: 'Pendapatan kamar', category: 'Room Revenue', type: 'income', amount: 770000, reference: 'pay-1' },
  { id: 'acc-2', tenantId: 'tenant-1', date: new Date().toISOString().split('T')[0], description: 'Listrik & air', category: 'Utilities', type: 'expense', amount: 450000 },
  { id: 'acc-3', tenantId: 'tenant-1', date: new Date().toISOString().split('T')[0], description: 'Gaji housekeeping', category: 'Payroll', type: 'expense', amount: 3200000 },
];

async function queueMutation(type: string, payload: unknown) {
  try {
    await useOfflineStore.getState().addToQueue(type, payload);
  } catch (err) {
    console.error('Failed to queue offline action:', err);
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tenant: mockTenant,
      users: mockUsers,
      roomTypes: mockRoomTypes,
      bookings: mockBookings,
      rooms: roomsWithTypes,
      guests: mockGuests,
      payments: mockPayments,
      housekeepingTasks: mockHousekeepingTasks.map((t) => ({
        ...t,
        room: roomsWithTypes.find((r) => r.id === t.roomId),
      })),
      notifications: mockNotifications,
      pricingRules: defaultPricingRules,
      accountingEntries: defaultAccounting,
      sidebarOpen: false,

      setBookings: (bookings) => set({ bookings }),

      addBooking: (booking) => {
        set((state) => ({ bookings: [booking, ...state.bookings] }));
        void queueMutation('addBooking', booking);
        import('../services/finance/financeIntegration').then(({ postBookingJournal }) => {
          postBookingJournal(booking.tenantId, booking);
        });
      },

      updateBooking: (id, updates) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        }));
        void queueMutation('updateBooking', { id, updates });
      },

      updateRoomStatus: (id, status) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
        }));
        void queueMutation('updateRoomStatus', { id, status });
      },

      updateRoomPosition: (id, x, y) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === id
              ? {
                  ...r,
                  positionX: x ?? undefined,
                  positionY: y ?? undefined,
                }
              : r
          ),
        }));
        void queueMutation('updateRoomPosition', { id, x, y });
      },

      addRoom: (room) => {
        const id = generateId('room');
        const roomType = get().roomTypes.find((rt) => rt.id === room.roomTypeId);
        const newRoom: Room = { ...room, id, roomType };
        set((state) => ({ rooms: [...state.rooms, newRoom] }));
        void queueMutation('addRoom', newRoom);
      },

      addGuest: (guest) => {
        set((state) => ({ guests: [guest, ...state.guests] }));
        void queueMutation('addGuest', guest);
      },

      updateGuest: (id, updates) => {
        set((state) => ({
          guests: state.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
          bookings: state.bookings.map((b) =>
            b.guestId === id && b.guest ? { ...b, guest: { ...b.guest, ...updates } } : b
          ),
        }));
        void queueMutation('updateGuest', { id, updates });
      },

      addPayment: (payment) => {
        const newPayment: Payment = {
          ...payment,
          id: generateId('pay'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ payments: [newPayment, ...state.payments] }));
        void queueMutation('addPayment', newPayment);
        return newPayment;
      },

      updatePayment: (id, updates) => {
        set((state) => ({
          payments: state.payments.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        void queueMutation('updatePayment', { id, updates });
      },

      createXenditInvoice: async (bookingId, amount, method) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking || amount <= 0) {
          throw new Error('Booking tidak valid');
        }

        const { xenditService } = await import('../services/xenditService');
        const { paymentUrl, externalId } = await xenditService.createInvoice(booking, amount);

        const payment = get().addPayment({
          tenantId: booking.tenantId,
          bookingId,
          amount,
          method,
          status: 'unpaid',
          externalId,
          paymentUrl,
          notes: 'Invoice Xendit — menunggu pembayaran',
        });

        return { paymentUrl, externalId, paymentId: payment.id };
      },

      settleXenditPayment: (paymentId) => {
        const payment = get().payments.find((p) => p.id === paymentId);
        if (!payment || payment.status === 'paid') return null;

        get().updatePayment(paymentId, { status: 'paid' });

        const booking = get().bookings.find((b) => b.id === payment.bookingId);
        if (!booking) return payment;

        const newPaid = booking.paidAmount + payment.amount;
        const paymentStatus =
          newPaid >= booking.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        get().updateBooking(booking.id, { paidAmount: newPaid, paymentStatus });

        get().addAccountingEntry({
          tenantId: booking.tenantId,
          date: new Date().toISOString().split('T')[0],
          description: `Pembayaran Xendit ${booking.bookingCode}`,
          category: 'Room Revenue',
          type: 'income',
          amount: payment.amount,
          reference: payment.id,
        });

        import('../services/finance/financeIntegration').then(({ postXenditSettledJournal }) => {
          postXenditSettledJournal(booking.tenantId, paymentId, booking.bookingCode, payment.amount);
        });

        return payment;
      },

      recordBookingPayment: (bookingId, amount, method, referenceNumber, notes) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking || amount <= 0) return null;

        const newPaid = booking.paidAmount + amount;
        const paymentStatus =
          newPaid >= booking.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        get().updateBooking(bookingId, { paidAmount: newPaid, paymentStatus });

        const payment = get().addPayment({
          tenantId: booking.tenantId,
          bookingId,
          amount,
          method,
          status: 'paid',
          referenceNumber,
          notes,
        });

        get().addAccountingEntry({
          tenantId: booking.tenantId,
          date: new Date().toISOString().split('T')[0],
          description: `Pembayaran ${booking.bookingCode}`,
          category: 'Room Revenue',
          type: 'income',
          amount,
          reference: payment.id,
        });

        import('../services/finance/financeIntegration').then(({ postPaymentJournal }) => {
          postPaymentJournal(booking.tenantId, payment, booking.bookingCode);
        });

        import('../store/posStore').then(({ usePosStore }) => {
          if (method === 'cash') usePosStore.getState().recordCashIn(amount);
        });

        return payment;
      },

      recordSplitPayments: (bookingId, splits) => {
        const results: Payment[] = [];
        for (const split of splits) {
          const p = get().recordBookingPayment(
            bookingId,
            split.amount,
            split.method,
            split.referenceNumber,
            'Split payment'
          );
          if (p) results.push(p);
        }
        return results;
      },

      processBookingRefund: (bookingId, amount, viaXendit, reason) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking || amount <= 0 || amount > booking.paidAmount) return false;

        const newPaid = Math.max(0, booking.paidAmount - amount);
        const paymentStatus = newPaid <= 0 ? 'refunded' : newPaid >= booking.totalAmount ? 'paid' : 'partial';

        get().updateBooking(bookingId, { paidAmount: newPaid, paymentStatus });

        get().addAccountingEntry({
          tenantId: booking.tenantId,
          date: new Date().toISOString().split('T')[0],
          description: `Refund ${booking.bookingCode}: ${reason}`,
          category: 'Refund',
          type: 'expense',
          amount,
          reference: bookingId,
        });

        import('../services/finance/financeIntegration').then(({ postRefundJournal }) => {
          postRefundJournal(booking.tenantId, booking, amount, viaXendit, reason);
        });

        import('../store/posStore').then(({ usePosStore }) => {
          if (!viaXendit) usePosStore.getState().recordCashOut(amount);
        });

        get().addNotification({
          type: 'payment',
          title: 'Refund diproses',
          message: `Refund ${booking.bookingCode} sebesar Rp ${amount.toLocaleString('id-ID')}`,
        });

        return true;
      },

      addHousekeepingTask: (task) => {
        const room = get().rooms.find((r) => r.id === task.roomId);
        const assignedUser = task.assignedTo
          ? get().users.find((u) => u.id === task.assignedTo)
          : undefined;
        const newTask: HousekeepingTask = {
          ...task,
          id: generateId('hk'),
          createdAt: new Date().toISOString(),
          room,
          assignedUser,
        };
        set((state) => ({ housekeepingTasks: [newTask, ...state.housekeepingTasks] }));
        void queueMutation('addHousekeepingTask', newTask);
        return newTask;
      },

      updateHousekeepingTask: (id, updates) => {
        set((state) => ({
          housekeepingTasks: state.housekeepingTasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
        void queueMutation('updateHousekeepingTask', { id, updates });
      },

      checkoutBooking: (bookingId, roomId, options) => {
        get().updateBooking(bookingId, { status: 'checked_out' });
        get().updateRoomStatus(roomId, 'cleaning');
        get().addHousekeepingTask({
          tenantId: get().tenant.id,
          roomId,
          status: 'pending',
          type: 'checkout_cleaning',
          notes: 'Auto-created after checkout',
          scheduledAt: new Date().toISOString(),
        });
        get().addNotification({
          type: 'checkout',
          title: 'Check-out selesai',
          message: `Kamar ${get().rooms.find((r) => r.id === roomId)?.number} perlu dibersihkan`,
        });

        if (options?.sendSurvey && options.guestPhone) {
          const surveyUrl = `${window.location.origin}/stay/survey/${bookingId}`;
          import('../utils/whatsapp').then(({ openWhatsAppMessage, buildSurveyMessage }) => {
            openWhatsAppMessage(
              options.guestPhone!,
              buildSurveyMessage(options.guestName || 'Tamu', options.bookingCode || bookingId, surveyUrl)
            );
          });
        }
      },

      checkInBooking: (bookingId, roomId) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        get().updateBooking(bookingId, { status: 'checked_in' });
        get().updateRoomStatus(roomId, 'occupied');
        get().addNotification({
          type: 'checkin',
          title: 'Check-in berhasil',
          message: `Tamu check-in kamar ${get().rooms.find((r) => r.id === roomId)?.number}`,
        });
        if (booking) {
          import('../services/finance/financeIntegration').then(({ postCheckInJournal }) => {
            postCheckInJournal(booking.tenantId, booking);
          });
        }
      },

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

      addNotification: (notification) => {
        const newNotif: Notification = {
          ...notification,
          id: generateId('notif'),
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ notifications: [newNotif, ...state.notifications] }));
      },

      updateTenant: (updates) => {
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));
        void queueMutation('updateTenant', updates);
      },

      updatePricingRule: (id, updates) => {
        set((state) => ({
          pricingRules: state.pricingRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
        void queueMutation('updatePricingRule', { id, updates });
      },

      addPricingRule: (rule) => {
        const newRule = { ...rule, id: generateId('pr') };
        set((state) => ({ pricingRules: [...state.pricingRules, newRule] }));
        void queueMutation('addPricingRule', newRule);
      },

      addAccountingEntry: (entry) => {
        const newEntry = { ...entry, id: generateId('acc') };
        set((state) => ({ accountingEntries: [newEntry, ...state.accountingEntries] }));
        void queueMutation('addAccountingEntry', newEntry);
        if (entry.type === 'expense') {
          import('../services/finance/financeIntegration').then(({ postExpenseJournal }) => {
            postExpenseJournal(entry.tenantId, newEntry);
          });
        }
      },

      hydrateFromRemote: (data) => {
        set((state) => ({
          bookings: data.bookings ?? state.bookings,
          rooms: data.rooms ?? state.rooms,
          guests: data.guests ?? state.guests,
          payments: data.payments ?? state.payments,
          housekeepingTasks: data.housekeepingTasks ?? state.housekeepingTasks,
          notifications: data.notifications ?? state.notifications,
          roomTypes: data.roomTypes ?? state.roomTypes,
          pricingRules: data.pricingRules ?? state.pricingRules,
          accountingEntries: data.accountingEntries ?? state.accountingEntries,
        }));
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'stay-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tenant: state.tenant,
        users: state.users,
        roomTypes: state.roomTypes,
        bookings: state.bookings,
        rooms: state.rooms,
        guests: state.guests,
        payments: state.payments,
        housekeepingTasks: state.housekeepingTasks,
        notifications: state.notifications,
        pricingRules: state.pricingRules,
        accountingEntries: state.accountingEntries,
      }),
    }
  )
);

export function getRoomTypeById(roomTypeId: string): RoomType | undefined {
  return useAppStore.getState().roomTypes.find((rt) => rt.id === roomTypeId);
}
