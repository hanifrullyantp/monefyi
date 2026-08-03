/**
 * POS store — cart, sessions, transactions, checkout flows.
 * Integrates with financeStore for double-entry journals.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../utils/id';
import { useOfflineStore } from './offlineStore';
import { useAppStore } from './appStore';
import { useFinanceStore } from './financeStore';
import {
  journalCashPayment,
  journalTransferVerified,
  journalDepositReceived,
  journalSplitPayment,
  journalExpense,
  journalRefund,
  expenseCodeForCategory,
} from '../services/finance/autoJournalEngine';
import { postPaymentJournal, postXenditSettledJournal, postPayrollJournal } from '../services/finance/financeIntegration';
import { calculateXenditFee } from '../services/xenditFeeCalculator';
import type {
  PosSession,
  PosTransaction,
  PosTransactionItem,
  PosTransactionPayment,
  PaymentMethodConfig,
  BankAccount,
  BookingCharge,
  RefundRecord,
  ReceiptRecord,
  CartItem,
  PosCartState,
} from '../types/pos';
import type { Payment, PaymentMethod } from '../types';

const DEFAULT_METHODS: PaymentMethodConfig[] = [
  { id: 'pm-cash', tenantId: '', code: 'cash', name: 'Tunai', category: 'cash', isActive: true, feeType: 'none', feeAmount: 0, feePercent: 0, feeBearer: 'hotel', sortOrder: 1 },
  { id: 'pm-transfer', tenantId: '', code: 'transfer', name: 'Transfer Bank', category: 'transfer', isActive: true, feeType: 'none', feeAmount: 0, feePercent: 0, feeBearer: 'hotel', sortOrder: 2 },
  { id: 'pm-qris', tenantId: '', code: 'qris', name: 'QRIS', category: 'xendit_qris', isActive: true, feeType: 'percent', feeAmount: 0, feePercent: 0.007, feeBearer: 'hotel', sortOrder: 3 },
  { id: 'pm-va', tenantId: '', code: 'virtual_account', name: 'Virtual Account', category: 'xendit_va', isActive: true, feeType: 'fixed', feeAmount: 4000, feePercent: 0, feeBearer: 'hotel', sortOrder: 4 },
  { id: 'pm-ewallet', tenantId: '', code: 'ewallet', name: 'E-Wallet', category: 'xendit_ewallet', isActive: true, feeType: 'percent', feeAmount: 0, feePercent: 0.015, feeBearer: 'hotel', sortOrder: 5 },
  { id: 'pm-card', tenantId: '', code: 'credit_card', name: 'Kartu', category: 'xendit_card', isActive: true, feeType: 'mixed', feeAmount: 2000, feePercent: 0.029, feeBearer: 'hotel', sortOrder: 6 },
];

async function queuePos(type: string, payload: unknown) {
  try {
    await useOfflineStore.getState().addToQueue(type, payload);
  } catch (err) {
    console.error('POS queue failed:', err);
  }
}

function nextTxNumber(existing: PosTransaction[]): string {
  const year = new Date().getFullYear();
  const count = existing.filter((t) => t.transactionNumber.startsWith(`TRX-${year}`)).length + 1;
  return `TRX-${year}-${String(count).padStart(6, '0')}`;
}

export interface PosTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
}

interface PosState {
  sessions: PosSession[];
  transactions: PosTransaction[];
  paymentMethods: PaymentMethodConfig[];
  bankAccounts: BankAccount[];
  bookingCharges: BookingCharge[];
  refunds: RefundRecord[];
  receipts: ReceiptRecord[];
  activeSessionId: string | null;
  cart: PosCartState;
  posMode: 'sale' | 'expense';
  lastTransaction: PosTransaction | null;

  initializePos: (tenantId: string) => void;
  getActiveSession: () => PosSession | null;
  openSession: (openingBalance: number, userId: string, tenantId: string) => PosSession;
  closeSession: (actualBalance: number, userId: string, notes?: string, denomination?: Record<string, number>) => PosSession | null;

  setCartBooking: (bookingId: string, guestId?: string, guestName?: string) => void;
  addCartItem: (item: Omit<CartItem, 'id'>) => void;
  updateCartItemQty: (id: string, quantity: number) => void;
  removeCartItem: (id: string) => void;
  setCartDiscount: (amount: number, percent: number) => void;
  clearCart: () => void;
  setPosMode: (mode: 'sale' | 'expense') => void;

  calculateTotals: (taxPercent: number, servicePercent: number) => PosTotals;
  loadBookingToCart: (bookingId: string) => void;
  addBookingCharge: (bookingId: string, description: string, amount: number, category: BookingCharge['category']) => BookingCharge;

  checkoutCash: (cashReceived: number, cashierId: string, tenantId: string) => PosTransaction | null;
  checkoutTransfer: (referenceNumber: string, proofUrl: string | undefined, cashierId: string, tenantId: string) => PosTransaction | null;
  verifyTransferPayment: (paymentId: string, transactionId: string, verifiedBy: string, tenantId: string) => void;
  checkoutSplit: (splits: { methodCode: string; amount: number; cashReceived?: number; referenceNumber?: string }[], cashierId: string, tenantId: string) => PosTransaction | null;
  checkoutDeposit: (percent: number, methodCode: string, cashierId: string, tenantId: string) => PosTransaction | null;
  createPendingXenditTransaction: (methodCode: string, amount: number, externalId: string, paymentUrl: string, cashierId: string, tenantId: string) => PosTransaction;
  settleXenditTransaction: (transactionId: string, paymentId: string, tenantId: string, bookingCode: string) => void;

  createExpense: (description: string, amount: number, category: string, method: 'cash' | 'transfer', cashierId: string, tenantId: string, proofUrl?: string) => PosTransaction;
  createRefund: (transactionId: string, amount: number, reason: string, viaXendit: boolean, approvedBy: string, tenantId: string, bookingId?: string, bookingCode?: string) => RefundRecord | null;
  createReceipt: (transaction: PosTransaction, tenantName: string, format?: 'thermal' | 'pdf') => ReceiptRecord;

  hydrateFromRemote: (data: Partial<Pick<PosState, 'sessions' | 'transactions' | 'paymentMethods' | 'bankAccounts' | 'bookingCharges' | 'refunds' | 'receipts'>>) => void;
}

const emptyCart = (): PosCartState => ({
  items: [],
  discountAmount: 0,
  discountPercent: 0,
});

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      sessions: [],
      transactions: [],
      paymentMethods: DEFAULT_METHODS,
      bankAccounts: [
        { id: 'bank-1', tenantId: 'tenant-1', bankCode: 'BCA', bankName: 'Bank Central Asia', accountNumber: '1234567890', accountHolder: 'Demo Villa STAY', isPrimary: true, purpose: 'general' },
      ],
      bookingCharges: [],
      refunds: [],
      receipts: [],
      activeSessionId: null,
      cart: emptyCart(),
      posMode: 'sale',
      lastTransaction: null,

      initializePos: (tenantId) => {
        useFinanceStore.getState().initializeFinance(tenantId);
        set((s) => ({
          paymentMethods: s.paymentMethods.map((m) => ({ ...m, tenantId })),
          bankAccounts: s.bankAccounts.map((b) => ({ ...b, tenantId })),
        }));
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId && s.status === 'open') ?? null;
      },

      openSession: (openingBalance, userId, tenantId) => {
        const session: PosSession = {
          id: generateId('sess'),
          tenantId,
          openedBy: userId,
          openedAt: new Date().toISOString(),
          openingBalance,
          status: 'open',
        };
        set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: session.id }));
        void queuePos('openPosSession', session);
        return session;
      },

      closeSession: (actualBalance, userId, notes, denomination) => {
        const session = get().getActiveSession();
        if (!session) return null;

        const cashTx = get().transactions.filter(
          (t) => t.sessionId === session.id && t.status === 'paid' && t.payments.some((p) => p.paymentMethod?.code === 'cash')
        );
        const cashIn = cashTx.reduce((s, t) => s + t.grandTotal, 0);
        const expected = session.openingBalance + cashIn;
        const variance = actualBalance - expected;

        const closed: PosSession = {
          ...session,
          closedBy: userId,
          closedAt: new Date().toISOString(),
          expectedBalance: expected,
          actualBalance,
          variance,
          notes,
          status: 'closed',
        };

        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === session.id ? closed : x)),
          activeSessionId: null,
        }));
        void queuePos('closePosSession', { session: closed, denomination });
        return closed;
      },

      setCartBooking: (bookingId, guestId, guestName) => {
        set((s) => ({ cart: { ...s.cart, bookingId, guestId, guestName } }));
      },

      addCartItem: (item) => {
        const id = generateId('item');
        set((s) => ({ cart: { ...s.cart, items: [...s.cart.items, { ...item, id }] } }));
      },

      updateCartItemQty: (id, quantity) => {
        if (quantity <= 0) {
          get().removeCartItem(id);
          return;
        }
        set((s) => ({
          cart: {
            ...s.cart,
            items: s.cart.items.map((i) =>
              i.id === id ? { ...i, quantity, unitPrice: i.unitPrice } : i
            ),
          },
        }));
      },

      removeCartItem: (id) => {
        set((s) => ({ cart: { ...s.cart, items: s.cart.items.filter((i) => i.id !== id) } }));
      },

      setCartDiscount: (amount, percent) => {
        set((s) => ({ cart: { ...s.cart, discountAmount: amount, discountPercent: percent } }));
      },

      clearCart: () => set({ cart: emptyCart() }),

      setPosMode: (mode) => set({ posMode: mode }),

      calculateTotals: (taxPercent, servicePercent) => {
        const { cart } = get();
        const subtotal = cart.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const discountAmount =
          cart.discountAmount > 0
            ? cart.discountAmount
            : cart.discountPercent > 0
              ? Math.round(subtotal * (cart.discountPercent / 100))
              : 0;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = Math.round(afterDiscount * (taxPercent / 100));
        const serviceChargeAmount = Math.round(afterDiscount * (servicePercent / 100));
        const grandTotal = afterDiscount + taxAmount + serviceChargeAmount;
        return { subtotal, discountAmount, taxAmount, serviceChargeAmount, grandTotal };
      },

      loadBookingToCart: (bookingId) => {
        const booking = useAppStore.getState().bookings.find((b) => b.id === bookingId);
        if (!booking) return;

        const charges = get().bookingCharges.filter((c) => c.bookingId === bookingId);
        const items: CartItem[] = [
          {
            id: generateId('item'),
            itemType: 'room',
            description: `${booking.room?.roomType?.name ?? 'Kamar'} ${booking.room?.number ?? ''} x${booking.nights} malam`,
            quantity: booking.nights,
            unitPrice: booking.totalAmount / booking.nights,
          },
          ...charges.map((c) => ({
            id: generateId('item'),
            itemType: 'extra' as const,
            description: c.description,
            quantity: 1,
            unitPrice: c.amount,
            bookingChargeId: c.id,
          })),
        ];

        const remaining = booking.totalAmount + charges.reduce((s, c) => s + c.amount, 0) - booking.paidAmount;

        set({
          cart: {
            bookingId,
            guestId: booking.guestId,
            guestName: booking.guest?.name,
            items,
            discountAmount: 0,
            discountPercent: 0,
          },
        });

        if (remaining <= 0 && items.length === 1) {
          // fully paid — still show cart for reference
        }
      },

      addBookingCharge: (bookingId, description, amount, category) => {
        const charge: BookingCharge = {
          id: generateId('chg'),
          tenantId: useAppStore.getState().tenant.id,
          bookingId,
          description,
          amount,
          category,
          postedAt: new Date().toISOString(),
        };
        set((s) => ({ bookingCharges: [charge, ...s.bookingCharges] }));
        void queuePos('addBookingCharge', charge);
        return charge;
      },

      checkoutCash: (cashReceived, cashierId, tenantId) => {
        const session = get().getActiveSession();
        if (!session) {
          console.error('Buka kas terlebih dahulu');
          return null;
        }

        const tenant = useAppStore.getState().tenant;
        const totals = get().calculateTotals(tenant.taxPercent, tenant.serviceChargePercent);
        if (totals.grandTotal <= 0) return null;

        const change = cashReceived - totals.grandTotal;
        const pm = get().paymentMethods.find((m) => m.code === 'cash')!;

        const payment: PosTransactionPayment = {
          id: generateId('pay'),
          transactionId: '',
          paymentMethodId: pm.id,
          paymentMethod: pm,
          amount: totals.grandTotal,
          status: 'paid',
          cashReceived,
          changeAmount: change,
          createdAt: new Date().toISOString(),
        };

        const tx = buildTransaction(getPosState(), totals, 'sale', 'paid', [payment], cashierId, tenantId, session.id);
        finalizeCheckout(tx, tenantId, 'cash');
        return tx;
      },

      checkoutTransfer: (referenceNumber, proofUrl, cashierId, tenantId) => {
        const tenant = useAppStore.getState().tenant;
        const totals = get().calculateTotals(tenant.taxPercent, tenant.serviceChargePercent);
        const pm = get().paymentMethods.find((m) => m.code === 'transfer')!;

        const payment: PosTransactionPayment = {
          id: generateId('pay'),
          transactionId: '',
          paymentMethodId: pm.id,
          paymentMethod: pm,
          amount: totals.grandTotal,
          status: proofUrl ? 'pending' : 'paid',
          referenceNumber,
          proofUrl,
          createdAt: new Date().toISOString(),
        };

        const session = get().getActiveSession();
        const tx = buildTransaction(
          getPosState(),
          totals,
          'sale',
          proofUrl ? 'pending' : 'paid',
          [payment],
          cashierId,
          tenantId,
          session?.id
        );
        finalizeCheckout(tx, tenantId, 'transfer', !proofUrl);
        return tx;
      },

      verifyTransferPayment: (paymentId, transactionId, verifiedBy, tenantId) => {
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.id !== transactionId) return t;
            return {
              ...t,
              status: 'paid' as const,
              payments: t.payments.map((p) =>
                p.id === paymentId ? { ...p, status: 'verified' as const, verifiedBy, verifiedAt: new Date().toISOString() } : p
              ),
            };
          }),
        }));

        const finance = useFinanceStore.getState();
        const booking = useAppStore.getState().bookings.find((b) => b.id === get().cart.bookingId);
        finance.createJournal(
          journalTransferVerified(
            { accounts: finance.accounts, tenantId },
            paymentId,
            booking?.bookingCode ?? transactionId,
            get().transactions.find((t) => t.id === transactionId)?.grandTotal ?? 0
          )
        );
        void queuePos('verifyTransfer', { paymentId, transactionId, verifiedBy });
      },

      checkoutSplit: (splits, cashierId, tenantId) => {
        const tenant = useAppStore.getState().tenant;
        const totals = get().calculateTotals(tenant.taxPercent, tenant.serviceChargePercent);
        const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
        if (Math.abs(splitTotal - totals.grandTotal) > 1) {
          console.error('Split total tidak sama dengan grand total');
          return null;
        }

        const payments: PosTransactionPayment[] = splits.map((s) => {
          const pm = get().paymentMethods.find((m) => m.code === s.methodCode) ?? get().paymentMethods[0];
          return {
            id: generateId('pay'),
            transactionId: '',
            paymentMethodId: pm.id,
            paymentMethod: pm,
            amount: s.amount,
            status: 'paid' as const,
            cashReceived: s.cashReceived,
            changeAmount: s.cashReceived ? s.cashReceived - s.amount : undefined,
            referenceNumber: s.referenceNumber,
            createdAt: new Date().toISOString(),
          };
        });

        const session = get().getActiveSession();
        const tx = buildTransaction(getPosState(), totals, 'sale', 'paid', payments, cashierId, tenantId, session?.id);

        const finance = useFinanceStore.getState();
        const booking = useAppStore.getState().bookings.find((b) => b.id === get().cart.bookingId);
        const journalSplits = splits.map((s) => ({
          code: s.methodCode === 'cash' ? '1101' : s.methodCode === 'transfer' ? '1102' : '1104',
          amount: s.amount,
          label: s.methodCode,
        }));
        finance.createJournal(
          journalSplitPayment(
            { accounts: finance.accounts, tenantId },
            tx.payments[0]?.id ?? tx.id,
            booking?.bookingCode ?? tx.transactionNumber,
            journalSplits
          )
        );

        finalizeCheckout(tx, tenantId, 'split');
        return tx;
      },

      checkoutDeposit: (percent, methodCode, cashierId, tenantId) => {
        const tenant = useAppStore.getState().tenant;
        const totals = get().calculateTotals(tenant.taxPercent, tenant.serviceChargePercent);
        const depositAmount = Math.round(totals.grandTotal * (percent / 100));
        const pm = get().paymentMethods.find((m) => m.code === methodCode) ?? get().paymentMethods[0];

        const payment: PosTransactionPayment = {
          id: generateId('pay'),
          transactionId: '',
          paymentMethodId: pm.id,
          paymentMethod: pm,
          amount: depositAmount,
          status: 'paid',
          createdAt: new Date().toISOString(),
        };

        const partialTotals = { ...totals, grandTotal: depositAmount };
        const session = get().getActiveSession();
        const tx = buildTransaction(getPosState(), partialTotals, 'deposit', 'partial', [payment], cashierId, tenantId, session?.id);

        const finance = useFinanceStore.getState();
        const booking = useAppStore.getState().bookings.find((b) => b.id === get().cart.bookingId);
        const method = methodCode === 'transfer' ? 'transfer' : methodCode.includes('xendit') || ['qris', 'virtual_account', 'ewallet', 'credit_card'].includes(methodCode) ? 'xendit' : 'cash';
        finance.createJournal(
          journalDepositReceived(
            { accounts: finance.accounts, tenantId },
            payment.id,
            booking?.bookingCode ?? tx.transactionNumber,
            depositAmount,
            method
          )
        );

        finalizeCheckout(tx, tenantId, methodCode, true, depositAmount);
        return tx;
      },

      createPendingXenditTransaction: (methodCode, amount, externalId, paymentUrl, cashierId, tenantId) => {
        const pm = get().paymentMethods.find((m) => m.code === methodCode)!;
        const payment: PosTransactionPayment = {
          id: generateId('pay'),
          transactionId: '',
          paymentMethodId: pm.id,
          paymentMethod: pm,
          amount,
          status: 'pending',
          externalId,
          paymentUrl,
          expiryAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };

        const totals: PosTotals = {
          subtotal: amount,
          discountAmount: 0,
          taxAmount: 0,
          serviceChargeAmount: 0,
          grandTotal: amount,
        };

        const tx = buildTransaction(getPosState(), totals, 'sale', 'pending', [payment], cashierId, tenantId, getPosState().getActiveSession()?.id);
        set((s) => ({ transactions: [tx, ...s.transactions], lastTransaction: tx }));
        void queuePos('createPosTransaction', tx);
        return tx;
      },

      settleXenditTransaction: (transactionId, paymentId, tenantId, bookingCode) => {
        const tx = get().transactions.find((t) => t.id === transactionId);
        if (!tx) return;

        const payment = tx.payments.find((p) => p.id === paymentId);
        const fee = payment?.paymentMethod ? calculateXenditFee(payment.amount, payment.paymentMethod).fee : 0;

        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === transactionId
              ? {
                  ...t,
                  status: 'paid' as const,
                  payments: t.payments.map((p) =>
                    p.id === paymentId ? { ...p, status: 'paid' as const, xenditFee: fee } : p
                  ),
                }
              : t
          ),
        }));

        postXenditSettledJournal(tenantId, paymentId, bookingCode, payment?.amount ?? tx.grandTotal);

        if (tx.bookingId) {
          const booking = useAppStore.getState().bookings.find((b) => b.id === tx.bookingId);
          if (booking) {
            const newPaid = booking.paidAmount + (payment?.amount ?? 0);
            useAppStore.getState().updateBooking(tx.bookingId, {
              paidAmount: newPaid,
              paymentStatus: newPaid >= booking.totalAmount ? 'paid' : 'partial',
            });
          }
        }
      },

      createExpense: (description, amount, category, method, cashierId, tenantId, proofUrl) => {
        const totals: PosTotals = {
          subtotal: amount,
          discountAmount: 0,
          taxAmount: 0,
          serviceChargeAmount: 0,
          grandTotal: amount,
        };

        const tx = buildTransaction(getPosState(), totals, 'expense', 'paid', [], cashierId, tenantId, getPosState().getActiveSession()?.id);
        tx.notes = proofUrl ? `Bukti: ${proofUrl}` : description;

        const finance = useFinanceStore.getState();
        finance.createJournal({
          ...journalExpense(
            { accounts: finance.accounts, tenantId, createdBy: cashierId },
            description,
            amount,
            expenseCodeForCategory(category),
            method
          ),
          referenceType: 'expense',
          referenceId: tx.id,
        });

        set((s) => ({ transactions: [tx, ...s.transactions], lastTransaction: tx }));
        useAppStore.getState().addAccountingEntry({
          tenantId,
          date: new Date().toISOString().split('T')[0],
          description,
          category,
          type: 'expense',
          amount,
          reference: tx.id,
        });
        void queuePos('createPosTransaction', tx);
        get().clearCart();
        return tx;
      },

      createRefund: (transactionId, amount, reason, viaXendit, approvedBy, tenantId, bookingId, bookingCode) => {
        const original = get().transactions.find((t) => t.id === transactionId);
        if (!original || amount <= 0) return null;

        const refund: RefundRecord = {
          id: generateId('ref'),
          tenantId,
          originalTransactionId: transactionId,
          amount,
          reason,
          status: 'approved',
          approvedBy,
          createdAt: new Date().toISOString(),
        };

        const finance = useFinanceStore.getState();
        if (bookingId && bookingCode) {
          finance.createJournal(
            journalRefund({ accounts: finance.accounts, tenantId, createdBy: approvedBy }, bookingId, bookingCode, amount, viaXendit)
          );
        }

        set((s) => ({
          refunds: [refund, ...s.refunds],
          transactions: s.transactions.map((t) =>
            t.id === transactionId ? { ...t, status: 'refunded' as const } : t
          ),
        }));
        void queuePos('createRefund', refund);
        return refund;
      },

      createReceipt: (transaction, tenantName, format = 'thermal') => {
        const booking = transaction.bookingId
          ? useAppStore.getState().bookings.find((b) => b.id === transaction.bookingId)
          : undefined;

        const receiptNumber = `RCP-${transaction.transactionNumber.replace('TRX-', '')}`;
        const content = {
          tenantName,
          transactionNumber: transaction.transactionNumber,
          date: transaction.createdAt,
          guestName: booking?.guest?.name ?? getPosState().cart.guestName,
          room: booking?.room ? `${booking.room.number} - ${booking.room.roomType?.name}` : undefined,
          items: transaction.items,
          subtotal: transaction.subtotal,
          tax: transaction.taxAmount,
          service: transaction.serviceChargeAmount,
          discount: transaction.discountAmount,
          grandTotal: transaction.grandTotal,
          payments: transaction.payments.map((p) => ({
            method: p.paymentMethod?.name ?? 'Unknown',
            amount: p.amount,
            change: p.changeAmount,
          })),
        };

        const receipt: ReceiptRecord = {
          id: generateId('rcp'),
          tenantId: transaction.tenantId,
          transactionId: transaction.id,
          receiptNumber,
          format,
          contentJson: content,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({ receipts: [receipt, ...s.receipts] }));
        void queuePos('createReceipt', receipt);
        return receipt;
      },

      hydrateFromRemote: (data) => {
        set((s) => ({
          sessions: data.sessions ?? s.sessions,
          transactions: data.transactions ?? s.transactions,
          paymentMethods: data.paymentMethods?.length ? data.paymentMethods : s.paymentMethods,
          bankAccounts: data.bankAccounts?.length ? data.bankAccounts : s.bankAccounts,
          bookingCharges: data.bookingCharges ?? s.bookingCharges,
          refunds: data.refunds ?? s.refunds,
          receipts: data.receipts ?? s.receipts,
        }));
      },
    }),
    {
      name: 'stay-pos',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        transactions: s.transactions,
        paymentMethods: s.paymentMethods,
        bankAccounts: s.bankAccounts,
        bookingCharges: s.bookingCharges,
        refunds: s.refunds,
        receipts: s.receipts,
        activeSessionId: s.activeSessionId,
      }),
    }
  )
);

function buildTransaction(
  state: PosState,
  totals: PosTotals,
  transactionType: PosTransaction['transactionType'],
  status: PosTransaction['status'],
  payments: PosTransactionPayment[],
  cashierId: string,
  tenantId: string,
  sessionId?: string
): PosTransaction {
  const txId = generateId('tx');
  const items: PosTransactionItem[] = state.cart.items.map((i) => ({
    id: generateId('txi'),
    transactionId: txId,
    itemType: i.itemType,
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.quantity * i.unitPrice,
    bookingChargeId: i.bookingChargeId,
  }));

  const tx: PosTransaction = {
    id: txId,
    tenantId,
    sessionId,
    transactionNumber: nextTxNumber(state.transactions),
    bookingId: state.cart.bookingId,
    guestId: state.cart.guestId,
    cashierId,
    transactionType,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    discountPercent: state.cart.discountPercent,
    taxAmount: totals.taxAmount,
    serviceChargeAmount: totals.serviceChargeAmount,
    grandTotal: totals.grandTotal,
    status,
    items,
    payments: payments.map((p) => ({ ...p, transactionId: txId })),
    createdAt: new Date().toISOString(),
  };

  return tx;
}

function finalizeCheckout(
  tx: PosTransaction,
  tenantId: string,
  methodCode: string,
  postJournal = true,
  paidAmount?: number
) {
  const store = getPosState();
  usePosStore.setState((s) => ({ transactions: [tx, ...s.transactions], lastTransaction: tx }));

  if (tx.bookingId) {
    const booking = useAppStore.getState().bookings.find((b) => b.id === tx.bookingId);
    if (booking) {
      const amount = paidAmount ?? tx.grandTotal;
      const newPaid = booking.paidAmount + amount;
      useAppStore.getState().updateBooking(tx.bookingId, {
        paidAmount: newPaid,
        paymentStatus: newPaid >= booking.totalAmount ? 'paid' : 'partial',
      });

      const paymentRecord: Payment = {
        id: tx.payments[0]?.id ?? generateId('pay'),
        tenantId,
        bookingId: tx.bookingId,
        amount,
        method: methodCode as PaymentMethod,
        status: tx.status === 'paid' ? 'paid' : 'partial',
        referenceNumber: tx.payments[0]?.referenceNumber,
        createdAt: new Date().toISOString(),
      };
      useAppStore.getState().addPayment(paymentRecord);

      if (postJournal && methodCode === 'cash') {
        postPaymentJournal(tenantId, paymentRecord, booking.bookingCode);
      } else if (postJournal && methodCode === 'transfer') {
        const finance = useFinanceStore.getState();
        finance.createJournal(
          journalTransferVerified(
            { accounts: finance.accounts, tenantId },
            paymentRecord.id,
            booking.bookingCode,
            amount
          )
        );
      }
    }
  }

  void queuePos('createPosTransaction', tx);
  store.clearCart();
}

function getPosState() {
  return usePosStore.getState();
}

export function payPayrollFromPos(
  payrollId: string,
  netPay: number,
  userId: string,
  tenantId: string,
  createdBy: string
) {
  postPayrollJournal(tenantId, { id: payrollId, netPay, userId }, createdBy);
  usePosStore.getState().createExpense(
    `Gaji karyawan ${userId}`,
    netPay,
    'Payroll',
    'transfer',
    createdBy,
    tenantId
  );
}
