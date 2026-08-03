import type { Booking } from '../types';

function getXenditFnUrl(): string | undefined {
  const explicit = import.meta.env.VITE_XENDIT_FN_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/stay-xendit`;
  }
  return undefined;
}

export const xenditService = {
  isConfigured(): boolean {
    return Boolean(getXenditFnUrl());
  },

  /**
   * Create payment invoice via Edge Function (secrets server-side).
   */
  async createInvoice(
    booking: Booking,
    amount?: number
  ): Promise<{ paymentUrl: string; externalId: string; amount: number }> {
    const dueAmount = amount ?? booking.totalAmount - booking.paidAmount;
    const fnUrl = getXenditFnUrl();

    if (fnUrl) {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          amount: dueAmount,
          guestName: booking.guest?.name,
          payerEmail: booking.guest?.email,
        }),
      });
      if (!res.ok) throw new Error('Gagal membuat invoice Xendit');
      const data = await res.json();
      return {
        paymentUrl: data.invoice_url,
        externalId: data.external_id,
        amount: data.amount ?? dueAmount,
      };
    }

    await new Promise((r) => setTimeout(r, 800));
    const externalId = `xnd-mock-${booking.id}-${Date.now()}`;
    return {
      paymentUrl: `https://checkout.xendit.co/web/${externalId}`,
      externalId,
      amount: dueAmount,
    };
  },

  async checkStatus(externalId: string): Promise<'PAID' | 'PENDING' | 'EXPIRED'> {
    const fnUrl = getXenditFnUrl();

    if (fnUrl) {
      const url = new URL(fnUrl);
      url.searchParams.set('external_id', externalId);
      const res = await fetch(url.toString(), { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return data.status;
      }
    }

    await new Promise((r) => setTimeout(r, 500));
    return Math.random() > 0.6 ? 'PAID' : 'PENDING';
  },
};

export async function createPaymentLink(booking: Booking, amount?: number): Promise<string> {
  const { paymentUrl } = await xenditService.createInvoice(booking, amount);
  return paymentUrl;
}
