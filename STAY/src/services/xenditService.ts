import type { Booking } from '../types';

const XENDIT_FN_URL = import.meta.env.VITE_XENDIT_FN_URL as string | undefined;

export const xenditService = {
  /**
   * Create payment invoice via Edge Function (secrets server-side).
   */
  async createInvoice(booking: Booking): Promise<{ paymentUrl: string; externalId: string }> {
    if (XENDIT_FN_URL) {
      const res = await fetch(XENDIT_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          amount: booking.totalAmount - booking.paidAmount,
          guestName: booking.guest?.name,
        }),
      });
      if (!res.ok) throw new Error('Gagal membuat invoice Xendit');
      const data = await res.json();
      return { paymentUrl: data.invoice_url, externalId: data.external_id };
    }

    await new Promise((r) => setTimeout(r, 800));
    const externalId = `xnd-mock-${booking.id}`;
    return {
      paymentUrl: `https://checkout.xendit.co/web/${externalId}`,
      externalId,
    };
  },

  async checkStatus(externalId: string): Promise<'PAID' | 'PENDING' | 'EXPIRED'> {
    if (XENDIT_FN_URL) {
      const res = await fetch(`${XENDIT_FN_URL}/status?external_id=${externalId}`);
      if (res.ok) {
        const data = await res.json();
        return data.status;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
    return Math.random() > 0.5 ? 'PAID' : 'PENDING';
  },
};

export async function createPaymentLink(booking: Booking): Promise<string> {
  const { paymentUrl } = await xenditService.createInvoice(booking);
  return paymentUrl;
}
