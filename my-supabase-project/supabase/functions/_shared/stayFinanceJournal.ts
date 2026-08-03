import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const XENDIT_FEE_RATE = 0.007;

interface JournalLineInput {
  account_code: string;
  debit: number;
  credit: number;
  notes?: string;
}

/**
 * Post Xendit settlement journal server-side when webhook confirms payment.
 */
export async function postXenditSettlementJournal(
  supabase: SupabaseClient,
  tenantId: string,
  paymentId: string,
  bookingCode: string,
  amount: number,
): Promise<void> {
  // Ensure chart of accounts exists
  await supabase.rpc("stay_seed_finance_for_tenant", { p_tenant_id: tenantId });

  const { data: accounts } = await supabase
    .from("stay_chart_of_accounts")
    .select("id, code")
    .eq("tenant_id", tenantId)
    .in("code", ["1104", "5105", "1203"]);

  if (!accounts || accounts.length < 3) {
    console.error("Missing chart accounts for Xendit journal");
    return;
  }

  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a.id]));
  const fee = Math.round(amount * XENDIT_FEE_RATE);
  const net = amount - fee;

  const entryNumber = `JRN-XND-${Date.now()}`;
  const lines: JournalLineInput[] = [
    { account_code: "1104", debit: net, credit: 0, notes: "Saldo Xendit" },
    { account_code: "5105", debit: fee, credit: 0, notes: "Biaya Payment Gateway" },
    { account_code: "1203", debit: 0, credit: amount, notes: "Piutang Xendit" },
  ];

  const rpcLines = lines.map((l) => ({
    account_id: byCode[l.account_code],
    debit: l.debit,
    credit: l.credit,
    notes: l.notes,
  }));

  const { error } = await supabase.rpc("stay_post_journal", {
    p_tenant_id: tenantId,
    p_entry_number: entryNumber,
    p_entry_date: new Date().toISOString().split("T")[0],
    p_description: `Xendit settled ${bookingCode}`,
    p_source: "xendit",
    p_reference_type: "payment",
    p_reference_id: paymentId,
    p_lines: rpcLines,
  });

  if (error) {
    console.error("postXenditSettlementJournal:", error);
  }
}

/**
 * Post cash payment journal when webhook can't run client-side flow.
 */
export async function postCashPaymentJournal(
  supabase: SupabaseClient,
  tenantId: string,
  paymentId: string,
  bookingCode: string,
  amount: number,
): Promise<void> {
  await supabase.rpc("stay_seed_finance_for_tenant", { p_tenant_id: tenantId });

  const { data: accounts } = await supabase
    .from("stay_chart_of_accounts")
    .select("id, code")
    .eq("tenant_id", tenantId)
    .in("code", ["1101", "1201"]);

  if (!accounts || accounts.length < 2) return;

  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a.id]));

  await supabase.rpc("stay_post_journal", {
    p_tenant_id: tenantId,
    p_entry_number: `JRN-PAY-${Date.now()}`,
    p_entry_date: new Date().toISOString().split("T")[0],
    p_description: `Pembayaran ${bookingCode}`,
    p_source: "payment",
    p_reference_type: "payment",
    p_reference_id: paymentId,
    p_lines: [
      { account_id: byCode["1101"], debit: amount, credit: 0, notes: "Kas Tunai" },
      { account_id: byCode["1201"], debit: 0, credit: amount, notes: "Piutang Tamu" },
    ],
  });
}

/**
 * Create accounting entry in legacy cash book table.
 */
export async function createAccountingEntry(
  supabase: SupabaseClient,
  tenantId: string,
  description: string,
  amount: number,
  reference: string,
): Promise<void> {
  await supabase.from("stay_accounting_entries").insert({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().split("T")[0],
    description,
    category: "Room Revenue",
    entry_type: "income",
    amount,
    reference,
  });
}
