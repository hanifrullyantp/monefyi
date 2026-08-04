import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { xenditService } from '../services/xenditService';
import type { PaymentMethod } from '../types';

interface XenditState {
  loading: boolean;
  paymentUrl: string | null;
  externalId: string | null;
  paymentId: string | null;
  status: 'idle' | 'pending' | 'paid' | 'error';
  error: string | null;
}

const ONLINE_METHODS: PaymentMethod[] = ['virtual_account', 'ewallet', 'qris'];

export function isOnlinePaymentMethod(method: PaymentMethod): boolean {
  return ONLINE_METHODS.includes(method);
}

/**
 * Hook for creating and polling Xendit payment invoices.
 */
export function useXenditPayment(bookingId: string | null) {
  const { bookings, createXenditInvoice, settleXenditPayment } = useAppStore();
  const [state, setState] = useState<XenditState>({
    loading: false,
    paymentUrl: null,
    externalId: null,
    paymentId: null,
    status: 'idle',
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const booking = bookings.find((b) => b.id === bookingId) ?? null;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (externalId: string, paymentId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const result = await xenditService.checkStatus(externalId);
          if (result === 'PAID') {
            stopPolling();
            settleXenditPayment(paymentId);
            setState((s) => ({ ...s, status: 'paid' }));
          } else if (result === 'EXPIRED') {
            stopPolling();
            setState((s) => ({ ...s, status: 'error', error: 'Link pembayaran kedaluwarsa' }));
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    },
    [settleXenditPayment, stopPolling]
  );

  const createInvoice = useCallback(
    async (amount: number, method: PaymentMethod) => {
      if (!bookingId || amount <= 0) return;
      setState((s) => ({ ...s, loading: true, error: null, status: 'idle' }));

      try {
        const result = await createXenditInvoice(bookingId, amount, method);
        setState({
          loading: false,
          paymentUrl: result.paymentUrl,
          externalId: result.externalId,
          paymentId: result.paymentId,
          status: 'pending',
          error: null,
        });
        startPolling(result.externalId, result.paymentId);
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          status: 'error',
          error: err instanceof Error ? err.message : 'Gagal membuat invoice',
        }));
      }
    },
    [bookingId, createXenditInvoice, startPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      loading: false,
      paymentUrl: null,
      externalId: null,
      paymentId: null,
      status: 'idle',
      error: null,
    });
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    booking,
    ...state,
    createInvoice,
    reset,
    isOnlineAvailable: xenditService.isConfigured() || !import.meta.env.PROD,
  };
}
