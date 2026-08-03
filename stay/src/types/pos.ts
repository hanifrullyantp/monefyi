// POS & Payment types

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type JournalSourceType =
  | 'pos'
  | 'xendit'
  | 'payroll'
  | 'refund'
  | 'manual'
  | 'cash_register'
  | 'migration';

export type PaymentMethodCategory =
  | 'cash'
  | 'transfer'
  | 'xendit_va'
  | 'xendit_ewallet'
  | 'xendit_qris'
  | 'xendit_card'
  | 'xendit_retail'
  | 'xendit_invoice';

export type PosTransactionType = 'sale' | 'refund' | 'expense' | 'deposit' | 'settlement';

export type PosTransactionStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'partial'
  | 'refunded'
  | 'void';

export type PosPaymentStatus = 'pending' | 'paid' | 'verified' | 'failed' | 'refunded';

export type PosSessionStatus = 'open' | 'closed';

export type RefundStatus = 'pending' | 'approved' | 'processed' | 'rejected' | 'failed';

export type CoaCode =
  | '1100' // Kas Tunai
  | '1200' // Kas Bank
  | '1300' // Piutang Xendit
  | '1310' // Saldo Xendit
  | '1320' // Piutang Transfer
  | '1400' // Piutang Karyawan
  | '2100' // Hutang Pajak
  | '2300' // Pendapatan Diterima Dimuka
  | '4100' // Pendapatan Kamar
  | '4200' // Pengembalian Pendapatan
  | '5100' // Biaya Payment Gateway
  | '5200' // Beban Gaji
  | '5300'; // Beban Operasional

export interface ChartOfAccount {
  id: string;
  tenantId: string;
  code: CoaCode | string;
  name: string;
  accountType: AccountType;
  parentId?: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface JournalLine {
  accountId: string;
  accountCode?: CoaCode | string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  createdBy?: string;
  isPosted: boolean;
  lines: JournalLine[];
  createdAt: string;
}

export interface PaymentMethodConfig {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: PaymentMethodCategory;
  isActive: boolean;
  feeType: 'none' | 'fixed' | 'percent' | 'mixed';
  feeAmount: number;
  feePercent: number;
  feeBearer: 'hotel' | 'guest' | 'split';
  sortOrder: number;
}

export interface PosSession {
  id: string;
  tenantId: string;
  openedBy: string;
  openedAt: string;
  openingBalance: number;
  closedBy?: string;
  closedAt?: string;
  expectedBalance?: number;
  actualBalance?: number;
  variance?: number;
  notes?: string;
  status: PosSessionStatus;
}

export interface PosTransactionItem {
  id: string;
  transactionId: string;
  itemType: 'room' | 'extra' | 'product' | 'fee' | 'discount';
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  bookingChargeId?: string;
}

export interface PosTransactionPayment {
  id: string;
  transactionId: string;
  paymentMethodId?: string;
  paymentMethod?: PaymentMethodConfig;
  amount: number;
  status: PosPaymentStatus;
  cashReceived?: number;
  changeAmount?: number;
  referenceNumber?: string;
  proofUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  externalId?: string;
  paymentUrl?: string;
  expiryAt?: string;
  xenditChannel?: string;
  xenditFee?: number;
  guestName?: string;
  createdAt: string;
}

export interface PosTransaction {
  id: string;
  tenantId: string;
  sessionId?: string;
  transactionNumber: string;
  bookingId?: string;
  guestId?: string;
  cashierId?: string;
  transactionType: PosTransactionType;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  status: PosTransactionStatus;
  notes?: string;
  splitBillName?: string;
  items: PosTransactionItem[];
  payments: PosTransactionPayment[];
  createdAt: string;
}

export interface BookingCharge {
  id: string;
  tenantId: string;
  bookingId: string;
  description: string;
  amount: number;
  category: 'room' | 'laundry' | 'minibar' | 'food' | 'other';
  postedAt: string;
  posTransactionId?: string;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isPrimary: boolean;
  purpose: string;
}

export interface RefundRecord {
  id: string;
  tenantId: string;
  originalTransactionId: string;
  originalPaymentId?: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  approvedBy?: string;
  xenditRefundId?: string;
  createdAt: string;
}

export interface ReceiptRecord {
  id: string;
  tenantId: string;
  transactionId: string;
  receiptNumber: string;
  format: 'thermal' | 'pdf';
  contentJson?: Record<string, unknown>;
  sentVia?: string;
  sentAt?: string;
  createdAt: string;
}

export interface CashRegisterLog {
  id: string;
  tenantId: string;
  sessionId: string;
  action: 'open' | 'close' | 'handover' | 'variance' | 'cash_in' | 'cash_out';
  amount?: number;
  denomination?: Record<string, number>;
  userId?: string;
  notes?: string;
  createdAt: string;
}

export interface XenditConfig {
  tenantId: string;
  mode: 'sandbox' | 'production';
  feeConfig: Record<string, unknown>;
}

export interface CartItem {
  id: string;
  itemType: PosTransactionItem['itemType'];
  description: string;
  quantity: number;
  unitPrice: number;
  bookingChargeId?: string;
}

export interface PosCartState {
  bookingId?: string;
  guestId?: string;
  guestName?: string;
  items: CartItem[];
  discountAmount: number;
  discountPercent: number;
}
