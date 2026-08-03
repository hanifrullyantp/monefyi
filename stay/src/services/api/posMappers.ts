import type {
  PosSession,
  PosTransaction,
  PosTransactionItem,
  PosTransactionPayment,
  PaymentMethodConfig,
  BankAccount,
  BookingCharge,
} from '../../types/pos';

type DbRow = Record<string, unknown>;

export function mapPaymentMethodFromDb(row: DbRow): PaymentMethodConfig {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    code: row.code as string,
    name: row.name as string,
    category: row.category as PaymentMethodConfig['category'],
    isActive: row.is_active !== false,
    feeType: (row.fee_type as PaymentMethodConfig['feeType']) || 'none',
    feeAmount: Number(row.fee_amount) || 0,
    feePercent: Number(row.fee_percent) || 0,
    feeBearer: (row.fee_bearer as PaymentMethodConfig['feeBearer']) || 'hotel',
    sortOrder: Number(row.sort_order) || 0,
  };
}

export function mapPosSessionFromDb(row: DbRow): PosSession {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    openedBy: row.opened_by as string,
    openedAt: row.opened_at as string,
    openingBalance: Number(row.opening_balance) || 0,
    closedBy: row.closed_by as string | undefined,
    closedAt: row.closed_at as string | undefined,
    expectedBalance: row.expected_balance != null ? Number(row.expected_balance) : undefined,
    actualBalance: row.actual_balance != null ? Number(row.actual_balance) : undefined,
    variance: row.variance != null ? Number(row.variance) : undefined,
    notes: row.notes as string | undefined,
    status: row.status as PosSession['status'],
  };
}

export function mapPosTransactionFromDb(
  row: DbRow,
  items: PosTransactionItem[],
  payments: PosTransactionPayment[],
  methods: PaymentMethodConfig[]
): PosTransaction {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    sessionId: row.session_id as string | undefined,
    transactionNumber: row.transaction_number as string,
    bookingId: row.booking_id as string | undefined,
    guestId: row.guest_id as string | undefined,
    cashierId: row.cashier_id as string | undefined,
    transactionType: row.transaction_type as PosTransaction['transactionType'],
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    discountPercent: Number(row.discount_percent) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    serviceChargeAmount: Number(row.service_charge_amount) || 0,
    grandTotal: Number(row.grand_total) || 0,
    status: row.status as PosTransaction['status'],
    notes: row.notes as string | undefined,
    splitBillName: row.split_bill_name as string | undefined,
    items,
    payments: payments.map((p) => ({
      ...p,
      paymentMethod: methods.find((m) => m.id === p.paymentMethodId),
    })),
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapPosTransactionItemFromDb(row: DbRow): PosTransactionItem {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    itemType: row.item_type as PosTransactionItem['itemType'],
    description: row.description as string,
    quantity: Number(row.quantity) || 1,
    unitPrice: Number(row.unit_price) || 0,
    subtotal: Number(row.subtotal) || 0,
    bookingChargeId: row.booking_charge_id as string | undefined,
  };
}

export function mapPosPaymentFromDb(row: DbRow): PosTransactionPayment {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    paymentMethodId: row.payment_method_id as string | undefined,
    amount: Number(row.amount) || 0,
    status: row.status as PosTransactionPayment['status'],
    cashReceived: row.cash_received != null ? Number(row.cash_received) : undefined,
    changeAmount: row.change_amount != null ? Number(row.change_amount) : undefined,
    referenceNumber: row.reference_number as string | undefined,
    proofUrl: row.proof_url as string | undefined,
    verifiedBy: row.verified_by as string | undefined,
    verifiedAt: row.verified_at as string | undefined,
    externalId: row.external_id as string | undefined,
    paymentUrl: row.payment_url as string | undefined,
    expiryAt: row.expiry_at as string | undefined,
    xenditChannel: row.xendit_channel as string | undefined,
    xenditFee: row.xendit_fee != null ? Number(row.xendit_fee) : undefined,
    guestName: row.guest_name as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapBankAccountFromDb(row: DbRow): BankAccount {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    bankCode: row.bank_code as string,
    bankName: row.bank_name as string,
    accountNumber: row.account_number as string,
    accountHolder: row.account_holder as string,
    isPrimary: Boolean(row.is_primary),
    purpose: (row.purpose as string) || 'general',
  };
}

export function mapPosTransactionToDb(tx: PosTransaction) {
  return {
    id: tx.id,
    tenant_id: tx.tenantId,
    session_id: tx.sessionId,
    transaction_number: tx.transactionNumber,
    booking_id: tx.bookingId,
    guest_id: tx.guestId,
    cashier_id: tx.cashierId,
    transaction_type: tx.transactionType,
    subtotal: tx.subtotal,
    discount_amount: tx.discountAmount,
    discount_percent: tx.discountPercent,
    tax_amount: tx.taxAmount,
    service_charge_amount: tx.serviceChargeAmount,
    grand_total: tx.grandTotal,
    status: tx.status,
    notes: tx.notes,
    split_bill_name: tx.splitBillName,
    created_at: tx.createdAt,
  };
}

export function mapPosSessionToDb(session: PosSession) {
  return {
    id: session.id,
    tenant_id: session.tenantId,
    opened_by: session.openedBy,
    opened_at: session.openedAt,
    opening_balance: session.openingBalance,
    closed_by: session.closedBy,
    closed_at: session.closedAt,
    expected_balance: session.expectedBalance,
    actual_balance: session.actualBalance,
    variance: session.variance,
    notes: session.notes,
    status: session.status,
  };
}

export function mapRemotePosData(params: {
  sessions: DbRow[];
  transactions: DbRow[];
  items: DbRow[];
  payments: DbRow[];
  methods: DbRow[];
  bankAccounts: DbRow[];
  charges: DbRow[];
}) {
  const methods = params.methods.map(mapPaymentMethodFromDb);
  const itemsByTx = new Map<string, PosTransactionItem[]>();
  for (const row of params.items) {
    const item = mapPosTransactionItemFromDb(row);
    const list = itemsByTx.get(item.transactionId) ?? [];
    list.push(item);
    itemsByTx.set(item.transactionId, list);
  }
  const paymentsByTx = new Map<string, PosTransactionPayment[]>();
  for (const row of params.payments) {
    const pay = mapPosPaymentFromDb(row);
    const list = paymentsByTx.get(pay.transactionId) ?? [];
    list.push(pay);
    paymentsByTx.set(pay.transactionId, list);
  }
  const transactions = params.transactions.map((row) =>
    mapPosTransactionFromDb(
      row,
      itemsByTx.get(row.id as string) ?? [],
      paymentsByTx.get(row.id as string) ?? [],
      methods
    )
  );
  return {
    sessions: params.sessions.map(mapPosSessionFromDb),
    transactions,
    paymentMethods: methods,
    bankAccounts: params.bankAccounts.map(mapBankAccountFromDb),
    bookingCharges: params.charges.map((row) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      bookingId: row.booking_id as string,
      description: row.description as string,
      amount: Number(row.amount),
      category: row.category as BookingCharge['category'],
      postedAt: row.posted_at as string,
      posTransactionId: row.pos_transaction_id as string | undefined,
    })),
  };
}
