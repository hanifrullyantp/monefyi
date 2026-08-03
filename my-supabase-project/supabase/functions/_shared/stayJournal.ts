/**
 * Server-side journal helper for Supabase Edge Functions.
 * Uses stay_finance_v2 schema (stay_post_journal RPC).
 */
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const XENDIT_FEE_RATE = 0.007;

export function assertBalanced(lines: { debit: number; credit: number }[]): void {
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`Journal tidak seimbang: debit=${debit} credit=${credit}`);
  }
}

async function ensureFinanceSeed(supabase: SupabaseClient, tenantId: string): Promise<void> {
  const { error } = await supabase.rpc("stay_seed_finance_for_tenant", { p_tenant_id: tenantId });
  if (error) throw error;
}

async function getAccountIds(
  supabase: SupabaseClient,
  tenantId: string,
  codes: string[]
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("stay_chart_of_accounts")
    .select("id, code")
    .eq("tenant_id", tenantId)
    .in("code", codes);
  if (error) throw error;
  if (!data || data.length < codes.length) {
    throw new Error(`Missing COA codes for tenant ${tenantId}: ${codes.join(", ")}`);
  }
  return Object.fromEntries(data.map((a) => [a.code as string, a.id as string]));
}

export async function postJournal(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    description: string;
    source: string;
    referenceType?: string;
    referenceId?: string;
    lines: { accountCode: string; debit: number; credit: number; notes?: string }[];
    entryDate?: string;
    entryNumber?: string;
  }
): Promise<string> {
  assertBalanced(params.lines);
  await ensureFinanceSeed(supabase, params.tenantId);

  const accountIds = await getAccountIds(
    supabase,
    params.tenantId,
    [...new Set(params.lines.map((l) => l.accountCode))]
  );

  const rpcLines = params.lines.map((l) => ({
    account_id: accountIds[l.accountCode],
    debit: l.debit,
    credit: l.credit,
    notes: l.notes ?? null,
  }));

  const { data, error } = await supabase.rpc("stay_post_journal", {
    p_tenant_id: params.tenantId,
    p_entry_number: params.entryNumber ?? `JRN-${Date.now()}`,
    p_entry_date: params.entryDate ?? new Date().toISOString().split("T")[0],
    p_description: params.description,
    p_source: params.source,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_lines: rpcLines,
  });
  if (error) throw error;
  return data as string;
}

/** Xendit paid: debit Saldo Xendit + fee, credit Piutang Xendit */
export async function postXenditPaidJournal(
  supabase: SupabaseClient,
  tenantId: string,
  amount: number,
  fee: number,
  sourceId: string
): Promise<string> {
  const net = amount - fee;
  const lines = [
    { accountCode: "1104", debit: net, credit: 0, notes: "Saldo Xendit" },
    ...(fee > 0 ? [{ accountCode: "5105", debit: fee, credit: 0, notes: "Biaya PG" }] : []),
    { accountCode: "1203", debit: 0, credit: amount, notes: "Piutang Xendit" },
  ];
  return postJournal(supabase, {
    tenantId,
    description: `Xendit paid ${sourceId}`,
    source: "xendit",
    referenceType: "payment",
    referenceId: sourceId,
    entryNumber: `JRN-XND-${Date.now()}`,
    lines,
  });
}

/** Cash sale journal */
export async function postCashSaleJournal(
  supabase: SupabaseClient,
  tenantId: string,
  amount: number,
  sourceId: string
): Promise<string> {
  return postJournal(supabase, {
    tenantId,
    description: `Cash sale ${sourceId}`,
    source: "pos",
    referenceType: "pos_transaction",
    referenceId: sourceId,
    entryNumber: `JRN-POS-${Date.now()}`,
    lines: [
      { accountCode: "1101", debit: amount, credit: 0, notes: "Kas Tunai" },
      { accountCode: "4101", debit: 0, credit: amount, notes: "Pendapatan Kamar" },
    ],
  });
}

export function verifyCallbackToken(req: Request, expectedToken: string): boolean {
  const token = req.headers.get("x-callback-token");
  return !!expectedToken && token === expectedToken;
}

export function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
