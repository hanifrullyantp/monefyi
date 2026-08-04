import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('xenditService - mock mode - Creates invoice URL', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_XENDIT_FN_URL', '');
  });

  it('returns mock invoice in demo mode', async () => {
    const { xenditService } = await import('../services/xenditService');
    const result = await xenditService.createInvoice(
      {
        id: 'b1',
        tenantId: 't1',
        bookingCode: 'BK-001',
        guestId: 'g1',
        roomId: 'r1',
        checkIn: '2026-08-10',
        checkOut: '2026-08-12',
        nights: 2,
        adults: 2,
        children: 0,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        totalAmount: 500000,
        paidAmount: 0,
        source: 'manual',
        createdBy: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      500000
    );

    expect(result.paymentUrl).toContain('checkout.xendit.co');
    expect(result.externalId).toContain('xnd-mock');
    expect(result.amount).toBe(500000);
  });
});
