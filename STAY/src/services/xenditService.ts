import { generateId } from '../utils/format';
import type { Booking } from '../types';

export const xenditService = {
  /**
   * Mensimulasikan pembuatan invoice Xendit
   */
  createInvoice: async (booking: Booking): Promise<{ invoiceUrl: string; externalId: string }> => {
    console.log('Creating Xendit Invoice for:', booking.bookingCode);
    
    // Simulasi API Call
    await new Promise(r => setTimeout(r, 1500));
    
    const externalId = `INV-${booking.bookingCode}-${Date.now()}`;
    const invoiceUrl = `https://checkout.xendit.co/web/${generateId()}`;
    
    return { invoiceUrl, externalId };
  },

  /**
   * Mensimulasikan pengecekan status pembayaran
   */
  checkStatus: async (externalId: string): Promise<'PAID' | 'PENDING' | 'EXPIRED'> => {
    console.log('Checking status for:', externalId);
    await new Promise(r => setTimeout(r, 800));
    
    // Random status simulator
    const rand = Math.random();
    if (rand > 0.3) return 'PAID';
    return 'PENDING';
  }
};

export const createPaymentLink = (booking: Booking): string => {
  // Shortcut untuk UI
  return `https://checkout.xendit.co/web/mock-${booking.id}`;
};
