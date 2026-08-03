/**
 * Server-side journal helper for Supabase Edge Functions.
 * Mirrors client journalService logic without DOM dependencies.
 */
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type CoaCode =
  | "1100" | "1200" | "1300" | "1310" | "1320" | "1400"
  | "2100" | "2300" | "4100" | "4200" | "5100" | "5200" | "5300";

export interface JournalLineInput {
  code: CoaCode;
  debit: number;
  credit: number;
  memo?: string;
}

export function assertBalanced(lines: JournalLineInput[]): void {
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`Journal tidak seimbang: debit=${debit} credit=${credit}`);
  }
}

async function getAccountId(
  supabase: SupabaseClient,
  tenantId: string,
  code: CoaCode
): Promise<string> {
  const { data, error } = await supabase
    .from("stay_chart_of_accounts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("code", code)
    .single();
  if (error || !data) throw new Error(`COA ${code} not found for tenant ${tenantId}`);
  return data.id as string;
}

export async function postJournal(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    description: string;
    sourceType: string;
    sourceId?: string;
    lines: JournalLineInput[];
    entryDate?: string;
  }
): Promise<string> {
  assertBalanced(params.lines);

  const journalId = crypto.randomUUID();
  const entryDate = params.entryDate ?? new Date().toISOString().split("T")[0];

  const { error: entryErr } = await supabase.from("stay_journal_entries").insert({
    id: journalId,
    tenant_id: params.tenantId,
    entry_date: entryDate,
    description: params.description,
    source_type: params.sourceType,
    source_id: params.sourceId,
    is_posted: true,
  });
  if (entryErr) throw entryErr;

  const lineRows = await Promise.all(
    params.lines.map(async (l) => ({
      journal_id: journalId,
      account_id: await getAccountId(supabase, params.tenantId, l.code),
      debit: l.debit,
      credit: l.credit,
      memo: l.memo,
    }))
  );

  const { error: linesErr } = await supabase.from("stay_journal_lines").insert(lineRows);
  if (linesErr) throw linesErr;

  return journalId;
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
  const lines: JournalLineInput[] = [
    { code: "1310", debit: net, credit: 0, memo: "Saldo Xendit" },
    ...(fee > 0 ? [{ code: "5100" as CoaCode, debit: fee, credit: 0, memo: "Biaya PG" }] : []),
    { code: "1300", debit: 0, credit: amount, memo: "Piutang Xendit" },
  ];
  return postJournal(supabase, {
    tenantId,
    description: `Xendit paid ${sourceId}`,
    sourceType: "xendit",
    sourceId,
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
    sourceType: "pos",
    sourceId,
    lines: [
      { code: "1100", debit: amount, credit: 0, memo: "Kas Tunai" },
      { code: "4100", debit: 0, credit: amount, memo: "Pendapatan Kamar" },
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
