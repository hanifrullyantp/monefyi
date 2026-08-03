/** Valid promo codes and their fixed discount amounts (IDR). */
const FIXED_CODES: Record<string, number> = {
  MEMBER50: 50_000,
  MEMBER25: 25_000,
  WELCOME50: 50_000,
};

/**
 * Resolve discount amount from a promo code and optional guest-specific code.
 */
export function resolveDiscountAmount(
  code: string,
  guestDiscountCode?: string,
  subtotalBeforeTax = 0
): { amount: number; label: string } | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (FIXED_CODES[normalized]) {
    return { amount: FIXED_CODES[normalized], label: normalized };
  }

  if (normalized.startsWith('STAY10-') || normalized.startsWith('STAY10')) {
    const pct = 0.1;
    return {
      amount: Math.round(subtotalBeforeTax * pct),
      label: 'STAY10 (10%)',
    };
  }

  if (guestDiscountCode && normalized === guestDiscountCode.toUpperCase()) {
    return { amount: FIXED_CODES.MEMBER50 ?? 50_000, label: guestDiscountCode };
  }

  return null;
}
