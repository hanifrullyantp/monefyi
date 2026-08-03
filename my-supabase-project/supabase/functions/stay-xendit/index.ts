import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getSupabaseAdmin, postXenditPaidJournal } from "../_shared/stayJournal.ts";

interface InvoiceRequest {
  action?: string;
  bookingId?: string;
  bookingCode?: string;
  amount?: number;
  guestName?: string;
  payerEmail?: string;
  bankCode?: string;
  bankAccountId?: string;
}

async function xenditFetch(path: string, body?: unknown, method = "POST") {
  const key = Deno.env.get("XENDIT_SECRET_KEY");
  if (!key) return null;
  const res = await fetch(`https://api.xendit.co${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${key}:`)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return null;
  return res.json();
}

async function handleCreate(req: Request, body: InvoiceRequest) {
  const bookingId = body.bookingId ?? "unknown";
  const amount = Number(body.amount) || 0;
  const externalId = `xnd-${body.action ?? "invoice"}-${bookingId}-${Date.now()}`;
  const action = body.action ?? "invoice";

  let paymentUrl = `https://checkout.xendit.co/web/${externalId}`;
  let result: Record<string, unknown> = {};

  if (action === "balance") {
    const bal = await xenditFetch("/balance?account_type=CASH", undefined, "GET");
    return jsonResponse(req, { balance: bal?.balance ?? 0 });
  }

  if (action === "disbursement") {
    result = (await xenditFetch("/disbursements", {
      external_id: externalId,
      amount: body.amount,
      bank_code: "BCA",
      account_holder_name: "STAY",
      account_number: "1234567890",
      description: "STAY withdraw",
    })) ?? { id: externalId };
    return jsonResponse(req, result);
  }

  if (action === "qris") {
    result = (await xenditFetch("/qr_codes", {
      external_id: externalId,
      type: "DYNAMIC",
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/stay-xendit-webhook`,
      amount,
    })) ?? {};
    paymentUrl = (result.qr_string as string) || paymentUrl;
  } else if (action === "virtual_account") {
    result = (await xenditFetch("/callback_virtual_accounts", {
      external_id: externalId,
      bank_code: body.bankCode || "BCA",
      name: body.guestName || "Tamu STAY",
      expected_amount: amount,
      is_closed: true,
      expiration_date: new Date(Date.now() + 86400000).toISOString(),
    })) ?? {};
    paymentUrl = (result.account_number as string) || paymentUrl;
  } else {
    result = (await xenditFetch("/v2/invoices", {
      external_id: externalId,
      amount,
      payer_email: body.payerEmail || "guest@stay.demo",
      description: `STAY ${body.bookingCode || bookingId}`,
      invoice_duration: 86400,
      currency: "IDR",
      customer: { given_names: body.guestName || "Tamu" },
    })) ?? {};
    paymentUrl = (result.invoice_url as string) || paymentUrl;
  }

  const supabase = getSupabaseAdmin();
  if (body.bookingId && amount > 0) {
    await supabase.from("stay_payments").upsert({
      tenant_id: null,
      booking_id: body.bookingId,
      amount,
      method: action,
      status: "pending",
      external_id: externalId,
      payment_url: paymentUrl,
      expiry_date: new Date(Date.now() + 86400000).toISOString(),
    }, { onConflict: "external_id", ignoreDuplicates: true });
  }

  return jsonResponse(req, {
    invoice_url: paymentUrl,
    payment_url: paymentUrl,
    external_id: externalId,
    amount,
  });
}

async function handleStatus(req: Request, externalId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("stay_payments")
    .select("status")
    .eq("external_id", externalId)
    .maybeSingle();

  if (data?.status === "paid") {
    return jsonResponse(req, { status: "PAID" });
  }

  const key = Deno.env.get("XENDIT_SECRET_KEY");
  if (key) {
    const invoice = await xenditFetch(`/v2/invoices/?external_id=${externalId}`, undefined, "GET");
    if (invoice?.data?.[0]?.status === "PAID") {
      return jsonResponse(req, { status: "PAID" });
    }
  }

  return jsonResponse(req, { status: data ? "PENDING" : "PENDING" });
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.get("action") === "balance") {
      const bal = await xenditFetch("/balance?account_type=CASH", undefined, "GET");
      return jsonResponse(req, { balance: bal?.balance ?? 0 });
    }
    const externalId = url.searchParams.get("external_id");
    if (externalId) return handleStatus(req, externalId);
    return errorResponse(req, "external_id required", 400);
  }

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const body = (await req.json()) as InvoiceRequest;
    return handleCreate(req, body);
  } catch (err) {
    return errorResponse(req, String(err), 500);
  }
});
