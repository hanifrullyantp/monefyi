/**
 * Bridges existing STAY operational data (bookings, payments, expenses)
 * into the double-entry finance system via auto-journal engine.
 */
import { useFinanceStore, runBalanceCheck } from '../../store/financeStore';
import {
  journalBookingCreated,
  journalCashPayment,
  journalXenditPaymentPending,
  journalXenditSettled,
  journalCheckIn,
  journalExpense,
  journalPayrollAccrual,
  journalPayrollPaid,
  expenseCodeForCategory,
  paymentMethodToJournal,
} from './autoJournalEngine';
import type { AccountingEntry } from '../../store/appStore';
import type { Booking, Payment } from '../../types';

interface SeedContext {
  tenantId: string;
  bookings: Booking[];
  payments: Payment[];
  accountingEntries: AccountingEntry[];
  createdBy?: string;
}

export function seedFinanceFromExistingData(ctx: SeedContext): void {
  const store = useFinanceStore.getState();
  const accounts = store.accounts;
  if (!accounts.length) return;

  const autoCtx = { accounts, tenantId: ctx.tenantId, createdBy: ctx.createdBy };

  for (const booking of ctx.bookings) {
    if (booking.totalAmount <= 0) continue;

    if (!store.hasJournalForReference('booking', booking.id, 'booking')) {
      if (booking.status !== 'cancelled') {
        store.createJournal(journalBookingCreated(autoCtx, booking.id, booking.bookingCode, booking.totalAmount));
      }
    }

    if (booking.status === 'checked_in' || booking.status === 'checked_out') {
      if (!store.hasJournalForReference('booking', booking.id + '-checkin')) {
        store.createJournal({
          ...journalCheckIn(autoCtx, booking.id, booking.bookingCode, booking.totalAmount),
          referenceId: booking.id + '-checkin',
        });
      }
    }
  }

  for (const payment of ctx.payments) {
    if (payment.status !== 'paid' && payment.status !== 'unpaid') continue;
    const booking = ctx.bookings.find((b) => b.id === payment.bookingId);
    if (!booking) continue;

    const isXendit = payment.externalId || payment.paymentUrl;
    const method = paymentMethodToJournal(payment.method);

    if (payment.status === 'paid') {
      if (isXendit) {
        if (!store.hasJournalForReference('payment', payment.id, 'xendit')) {
          store.createJournal(journalXenditPaymentPending(autoCtx, payment.id, booking.bookingCode, payment.amount));
          store.createJournal(journalXenditSettled(autoCtx, payment.id, booking.bookingCode, payment.amount));
        }
      } else if (!store.hasJournalForReference('payment', payment.id, 'payment')) {
        if (method === 'cash') {
          store.createJournal(journalCashPayment(autoCtx, payment.id, booking.bookingCode, payment.amount));
        } else {
          store.createJournal({
            ...journalCashPayment(autoCtx, payment.id, booking.bookingCode, payment.amount),
            description: `Pembayaran transfer ${booking.bookingCode}`,
            lines: journalCashPayment(autoCtx, payment.id, booking.bookingCode, payment.amount).lines.map((l, i) =>
              i === 0 ? { ...l, notes: 'Kas Bank' } : l
            ),
          });
        }
      }
    }
  }

  for (const entry of ctx.accountingEntries) {
    if (entry.type !== 'expense') continue;
    if (store.hasJournalForReference('expense', entry.id)) continue;

    const code = expenseCodeForCategory(entry.category);
    store.createJournal({
      ...journalExpense(autoCtx, entry.description, entry.amount, code, 'cash'),
      referenceType: 'expense',
      referenceId: entry.id,
    });
  }
}

/** Hook called after booking payment — posts auto journal */
export function postPaymentJournal(
  tenantId: string,
  payment: Payment,
  bookingCode: string,
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  const autoCtx = { accounts: store.accounts, tenantId, createdBy };

  const isXendit = !!payment.externalId;
  if (isXendit) {
    if (!store.hasJournalForReference('payment', payment.id, 'xendit')) {
      store.createJournal(journalXenditPaymentPending(autoCtx, payment.id, bookingCode, payment.amount));
    }
  } else {
    const method = paymentMethodToJournal(payment.method);
    if (method === 'cash') {
      store.createJournal(journalCashPayment(autoCtx, payment.id, bookingCode, payment.amount));
    } else {
      store.createJournal(journalCashPayment(autoCtx, payment.id, bookingCode, payment.amount));
    }
  }
  runBalanceCheckAfterJournal();
}

export function postXenditSettledJournal(
  tenantId: string,
  paymentId: string,
  bookingCode: string,
  amount: number,
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  if (store.hasJournalForReference('payment', paymentId, 'xendit')) {
    const entries = store.journalEntries.filter((j) => j.referenceId === paymentId && j.source === 'xendit');
    if (entries.length >= 2) return;
  }
  store.createJournal(
    journalXenditSettled(
      { accounts: store.accounts, tenantId, createdBy },
      paymentId,
      bookingCode,
      amount
    )
  );
  runBalanceCheckAfterJournal();
}

export function postBookingJournal(
  tenantId: string,
  booking: Booking,
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  if (store.hasJournalForReference('booking', booking.id)) return;
  store.createJournal(
    journalBookingCreated(
      { accounts: store.accounts, tenantId, createdBy },
      booking.id,
      booking.bookingCode,
      booking.totalAmount
    )
  );
}

export function postCheckInJournal(
  tenantId: string,
  booking: Booking,
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  const refId = booking.id + '-checkin';
  if (store.hasJournalForReference('booking', refId)) return;
  store.createJournal({
    ...journalCheckIn(
      { accounts: store.accounts, tenantId, createdBy },
      booking.id,
      booking.bookingCode,
      booking.totalAmount
    ),
    referenceId: refId,
  });
  runBalanceCheckAfterJournal();
}

export function postExpenseJournal(
  tenantId: string,
  entry: AccountingEntry,
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  if (store.hasJournalForReference('expense', entry.id)) return;
  const code = expenseCodeForCategory(entry.category);
  store.createJournal({
    ...journalExpense(
      { accounts: store.accounts, tenantId, createdBy },
      entry.description,
      entry.amount,
      code,
      'cash'
    ),
    referenceType: 'expense',
    referenceId: entry.id,
  });
  runBalanceCheckAfterJournal();
}

function runBalanceCheckAfterJournal(): void {
  const { ok, variance } = runBalanceCheck();
  if (!ok) {
    console.error(`[STAY Finance] Neraca tidak seimbang — selisih: ${variance}`);
  }
}

/** Post payroll payment journal */
export function postPayrollJournal(
  tenantId: string,
  entry: { id: string; netPay: number; userId: string },
  createdBy?: string
): void {
  const store = useFinanceStore.getState();
  const autoCtx = { accounts: store.accounts, tenantId, createdBy };

  if (!store.hasJournalForReference('payroll', entry.id + '-accrual')) {
    store.createJournal({
      ...journalPayrollAccrual(autoCtx, entry.id, `Staff ${entry.userId}`, entry.netPay),
      referenceId: entry.id + '-accrual',
    });
  }

  if (!store.hasJournalForReference('payroll', entry.id)) {
    store.createJournal(
      journalPayrollPaid(autoCtx, entry.id, `Staff ${entry.userId}`, entry.netPay, 'transfer')
    );
  }
  runBalanceCheckAfterJournal();
}
