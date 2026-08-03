import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

interface InvoiceRequest {
  bookingId?: string;
  bookingCode?: string;
  amount?: number;
  guestName?: string;
  payerEmail?: string;
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
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

  // Mock: treat external IDs older pattern as eventually paid in demo
  const xenditKey = Deno.env.get("XENDIT_SECRET_KEY");
  if (xenditKey) {
    // TODO: poll Xendit Invoice API for real status
    return jsonResponse(req, { status: "PENDING" });
  }

  return jsonResponse(req, { status: data ? "PENDING" : "PENDING" });
}

async function handleCreate(req: Request) {
  const body = (await req.json()) as InvoiceRequest;
  const bookingId = body.bookingId ?? "unknown";
  const amount = Number(body.amount) || 0;
  const externalId = `xnd-${bookingId}-${Date.now()}`;

  const xenditKey = Deno.env.get("XENDIT_SECRET_KEY");
  let invoiceUrl = `https://checkout.xendit.co/web/${externalId}`;

  if (xenditKey && amount > 0) {
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${xenditKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
        payer_email: body.payerEmail || "guest@stay.demo",
        description: `STAY ${body.bookingCode || bookingId}`,
        invoice_duration: 86400,
        currency: "IDR",
        customer: { given_names: body.guestName || "Tamu" },
      }),
    });

    if (res.ok) {
      const invoice = await res.json();
      invoiceUrl = invoice.invoice_url || invoiceUrl;
    }
  }

  return jsonResponse(req, {
    invoice_url: invoiceUrl,
    external_id: externalId,
    amount,
  });
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const externalId = url.searchParams.get("external_id");

  if (req.method === "GET" && externalId) {
    try {
      return await handleStatus(req, externalId);
    } catch (err) {
      return errorResponse(req, String(err), 500);
    }
  }

  if (req.method === "POST") {
    try {
      return await handleCreate(req);
    } catch (err) {
      return errorResponse(req, String(err), 500);
    }
  }

  return errorResponse(req, "Method not allowed", 405);
});
