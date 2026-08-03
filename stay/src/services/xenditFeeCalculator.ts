/**
 * Xendit fee calculator — configurable per payment method.
 */
import type { PaymentMethodConfig } from '../../types/pos';

export interface FeeResult {
  fee: number;
  net: number;
  gross: number;
  bearer: 'hotel' | 'guest' | 'split';
  guestSurcharge: number;
}

/**
 * Calculate payment gateway fee for an amount.
 */
export function calculateXenditFee(
  amount: number,
  method: PaymentMethodConfig
): FeeResult {
  let fee = 0;

  switch (method.feeType) {
    case 'fixed':
      fee = method.feeAmount;
      break;
    case 'percent':
      fee = Math.round(amount * method.feePercent);
      break;
    case 'mixed':
      fee = method.feeAmount + Math.round(amount * method.feePercent);
      break;
    default:
      fee = 0;
  }

  const bearer = method.feeBearer;
  let guestSurcharge = 0;
  let gross = amount;

  if (bearer === 'guest') {
    guestSurcharge = fee;
    gross = amount + fee;
  } else if (bearer === 'split') {
    guestSurcharge = Math.round(fee / 2);
    gross = amount + guestSurcharge;
  }

  return {
    fee,
    net: amount - (bearer === 'hotel' ? fee : 0),
    gross,
    bearer,
    guestSurcharge,
  };
}

/** Default fee presets matching Xendit typical rates */
export const DEFAULT_FEE_PRESETS: Record<string, Partial<PaymentMethodConfig>> = {
  virtual_account: { feeType: 'fixed', feeAmount: 4000, feePercent: 0 },
  qris: { feeType: 'percent', feeAmount: 0, feePercent: 0.007 },
  ewallet: { feeType: 'percent', feeAmount: 0, feePercent: 0.015 },
  credit_card: { feeType: 'mixed', feeAmount: 2000, feePercent: 0.029 },
};
