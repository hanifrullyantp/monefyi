import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface CrmLeadPayload {
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  planTier?: "free" | "standard" | "pro";
  bumpTaken?: boolean;
  paymentMethod?: string;
  amount?: number;
  paymentId?: string;
  checkoutStep?: number;
  status?: "new" | "abandoned_checkout" | "pending_payment" | "won";
}

// In-memory fallback if Supabase table is unreachable
const memoryLeads: Map<string, any> = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CrmLeadPayload;
    const {
      sessionId,
      name = "",
      email = "",
      phone = "",
      planTier = "standard",
      bumpTaken = false,
      paymentMethod = "qris",
      amount = 0,
      paymentId,
      checkoutStep = 1,
      status = "new",
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("62")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone
      ? `62${cleanPhone}`
      : "";

    const leadRecord = {
      sessionId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: formattedPhone,
      planTier,
      bumpTaken,
      paymentMethod,
      amount: Math.round(amount),
      paymentId: paymentId || null,
      checkoutStep,
      status,
      updatedAt: new Date().toISOString(),
    };

    // 1. Simpan ke in-memory cache
    memoryLeads.set(sessionId, {
      ...memoryLeads.get(sessionId),
      ...leadRecord,
      createdAt: memoryLeads.get(sessionId)?.createdAt || new Date().toISOString(),
    });

    // 2. Simpan ke Supabase orders table (menggunakan JSON raw_payload untuk fleksibilitas schema)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Cari apakah session ini sudah pernah ada di orders
        const { data: existing } = await supabase
          .from("orders")
          .select("id, raw_payload")
          .contains("raw_payload", { sessionId })
          .limit(1);

        const productTitle =
          planTier === "free"
            ? "Monefyi Estimator Free"
            : planTier === "pro"
            ? "Monefyi Estimator PRO"
            : "Monefyi Estimator Standard";

        const orderStatus =
          status === "won"
            ? "paid"
            : status === "pending_payment"
            ? "pending"
            : "abandoned";

        if (existing && existing.length > 0) {
          const rowId = existing[0].id;
          await supabase
            .from("orders")
            .update({
              full_name: name.trim() || undefined,
              email: email.trim().toLowerCase() || undefined,
              phone: formattedPhone || undefined,
              grand_total: Math.round(amount),
              status: orderStatus,
              product_title: productTitle,
              raw_payload: {
                ...(existing[0].raw_payload || {}),
                ...leadRecord,
              },
            })
            .eq("id", rowId);
        } else if (name.trim() || email.trim() || formattedPhone) {
          // Buat record order baru
          // UUID v4 format
          const newId = "00000000-0000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12);
          await supabase.from("orders").insert([
            {
              id: newId,
              email: email.trim().toLowerCase() || `session_${sessionId.slice(0, 8)}@monefyi.temp`,
              full_name: name.trim() || "Lead Checkout (Draft)",
              phone: formattedPhone || "-",
              product_title: productTitle,
              grand_total: Math.round(amount),
              status: orderStatus,
              raw_payload: leadRecord,
            },
          ]);
        }
      } catch (dbErr) {
        console.warn("Could not sync to Supabase orders table:", dbErr);
      }
    }

    return NextResponse.json({
      ok: true,
      lead: leadRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Ambil daftar leads dari Supabase orders & memory cache
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const leadsMap: Map<string, any> = new Map();

    // 1. Masukkan memory leads dulu
    for (const [sid, item] of memoryLeads.entries()) {
      leadsMap.set(sid, item);
    }

    // 2. Query dari Supabase orders
    if (supabase) {
      try {
        const { data: rows } = await supabase
          .from("orders")
          .select("id, email, full_name, phone, status, grand_total, product_title, created_at, raw_payload")
          .order("created_at", { ascending: false })
          .limit(100);

        if (rows) {
          for (const r of rows) {
            const raw = r.raw_payload || {};
            const sid = raw.sessionId || r.id;
            leadsMap.set(sid, {
              id: r.id,
              sessionId: sid,
              name: r.full_name || raw.name || "Anonim",
              email: r.email?.includes("@monefyi.temp") ? "" : r.email || raw.email || "",
              phone: r.phone !== "-" ? r.phone || raw.phone || "" : raw.phone || "",
              planTier: raw.planTier || (r.product_title?.includes("Free") ? "free" : r.product_title?.includes("PRO") ? "pro" : "standard"),
              bumpTaken: Boolean(raw.bumpTaken),
              paymentMethod: raw.paymentMethod || "qris",
              amount: r.grand_total || raw.amount || 0,
              paymentId: raw.paymentId || null,
              checkoutStep: raw.checkoutStep || (r.status === "paid" ? 5 : 3),
              status:
                r.status === "paid"
                  ? "won"
                  : r.status === "pending"
                  ? "pending_payment"
                  : raw.status || "abandoned_checkout",
              createdAt: r.created_at,
              updatedAt: raw.updatedAt || r.created_at,
            });
          }
        }
      } catch (sbErr) {
        console.warn("Could not load from Supabase:", sbErr);
      }
    }

    const leads = Array.from(leadsMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime()
    );

    return NextResponse.json({
      ok: true,
      total: leads.length,
      leads,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

