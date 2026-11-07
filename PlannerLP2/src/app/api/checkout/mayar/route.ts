import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

interface MayarCheckoutPayload {
  product: "free" | "standard" | "pro";
  customerName: string;
  email: string;
  mobile: string;
  bumpTaken: boolean;
  amount: number;
  paymentMethod?: string;
  returnUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MayarCheckoutPayload;
    const { product, customerName, email, mobile, bumpTaken, amount } = body;

    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Nama lengkap wajib diisi (minimal 2 karakter)" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Alamat email aktif wajib diisi" },
        { status: 400 }
      );
    }

    const cleanMobile = (mobile || "").replace(/[^0-9]/g, "");
    if (!cleanMobile || cleanMobile.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Nomor WhatsApp / HP wajib diisi (minimal 9 digit)" },
        { status: 400 }
      );
    }

    const formattedMobile = cleanMobile.startsWith("62")
      ? cleanMobile
      : cleanMobile.startsWith("0")
      ? `62${cleanMobile.slice(1)}`
      : `62${cleanMobile}`;

    // JIKA PAKET FREE TANPA ORDER BUMP (TOTAL RP 0)
    // Kumpulkan data lead & berikan akses instan tanpa invoice bayar
    if (product === "free" && !bumpTaken) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from("leads").insert([
            {
              name: customerName.trim(),
              email: email.trim().toLowerCase(),
              phone: formattedMobile,
              plan: "free",
              source: "conversational_checkout",
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (dbErr) {
        console.warn("Non-fatal: could not log free lead to Supabase", dbErr);
      }

      return NextResponse.json({
        ok: true,
        isFree: true,
        amount: 0,
        paymentId: `free_${Date.now()}`,
        redirectUrl: `https://estimator.monefyi.com/app/estimator?status=activated&plan=free&email=${encodeURIComponent(
          email.trim().toLowerCase()
        )}`,
      });
    }

    // Validasi harga minimum di sisi server (Server-Side Price Validation)
    const numericAmount = Math.round(Number(amount) || 0);
    const minRequiredAmount =
      product === "pro"
        ? 199000 + (bumpTaken ? 49000 : 0)
        : product === "standard"
        ? 93000 + (bumpTaken ? 49000 : 0)
        : 49000; // product === "free" && bumpTaken

    if (numericAmount < minRequiredAmount) {
      return NextResponse.json(
        {
          ok: false,
          error: `Nominal pembayaran tidak valid untuk paket ${product.toUpperCase()}. Minimal Rp ${minRequiredAmount.toLocaleString("id-ID")}.`,
        },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "estimator.monefyi.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appBaseUrl =
      process.env.NEXT_PUBLIC_PLANNER_APP_URL || `${protocol}://${host}`;
    const returnUrl =
      body.returnUrl ||
      `${appBaseUrl}/app/estimator?checkout_status=success&product=${product}`;

    const lynkProductKey =
      product === "pro" ? "estimator_pro" : "estimator_standard";

    const mayarApiKey = (
      process.env.MAYAR_API_KEY ||
      process.env.MAYAR_API_KEY_SANDBOX ||
      ""
    ).trim();
    const mayarApiUrl = (
      process.env.MAYAR_API_URL ||
      (process.env.NODE_ENV === "development"
        ? "https://api.mayar.club"
        : "https://api.mayar.id")
    ).replace(/\/$/, "");

    // 1. Coba panggil Mayar API langsung jika MAYAR_API_KEY terkonfigurasi di env
    if (mayarApiKey) {
      const descriptionMeta = {
        app: "estimator",
        product: lynkProductKey,
        bump_taken: bumpTaken ? "true" : "false",
        customer_name: customerName,
        customer_email: email,
        customer_mobile: formattedMobile,
      };

      // Jika QRIS, tentukan paymentMethod "qris" agar Mayar langsung mengembalikan qr_string
      // Jika Virtual Account atau metode lain, jangan kirim paymentMethod agar Mayar menyiapkan invoice multi-metode
      const chosenMethod = body.paymentMethod === "qris" ? "qris" : undefined;

      const mayarPayload: Record<string, unknown> = {
        name: customerName.trim(),
        email: email.trim().toLowerCase(),
        mobile: formattedMobile || "081234567890",
        amount: Math.round(amount),
        description: `monefyi:${JSON.stringify(descriptionMeta)}`,
        redirectUrl: returnUrl,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...(chosenMethod ? { paymentMethod: chosenMethod } : {}),
      };

      const response = await fetch(`${mayarApiUrl}/hl/v2/payments/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mayarApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mayarPayload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              json?.messages ||
              json?.error ||
              "Gagal membuat transaksi di Mayar",
          },
          { status: response.status }
        );
      }

      const paymentData = json?.data || {};
      const redirectUrl =
        paymentData.link || paymentData.url || json?.link || json?.url;
      const paymentId = paymentData.id || json?.id;

      // Ambil qr_string dari paymentDetail Mayar jika ada
      const qrCodeProps = paymentData?.paymentDetail?.qr_code?.channel_properties;
      const qrString = qrCodeProps?.qr_string || null;
      const qrExpiresAt = qrCodeProps?.expires_at || null;

      // Buat URL image QR berkualitas tinggi langsung dari qrString
      const qrImageUrl = qrString
        ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(qrString)}`
        : null;

      return NextResponse.json({
        ok: true,
        provider: "mayar",
        paymentId,
        redirectUrl,
        qrString,
        qrImageUrl,
        qrExpiresAt,
        amount: Math.round(amount),
      });
    }

    // 2. Fallback via Supabase edge function jika API key ada di Supabase secrets
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.functions.invoke(
        "planner-checkout",
        {
          body: {
            provider: "mayar",
            product: lynkProductKey,
            email: email.trim().toLowerCase(),
            customerName: customerName.trim(),
            checkoutAmount: Math.round(amount),
            returnUrl,
            upgradeFrom:
              bumpTaken && product === "standard"
                ? "estimator_standard"
                : undefined,
          },
        }
      );

      if (!error && data?.ok && data?.redirectUrl) {
        return NextResponse.json({
          ok: true,
          provider: "mayar",
          redirectUrl: data.redirectUrl,
          paymentId: data.paymentId,
          amount: Math.round(amount),
        });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "MAYAR_API_KEY belum dikonfigurasi di environment Vercel / Supabase.",
      },
      { status: 503 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Cek status pembayaran real-time dari Mayar
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "Payment ID required" },
        { status: 400 }
      );
    }

    const mayarApiKey = (
      process.env.MAYAR_API_KEY ||
      process.env.MAYAR_API_KEY_SANDBOX ||
      ""
    ).trim();
    const mayarApiUrl = (
      process.env.MAYAR_API_URL || "https://api.mayar.id"
    ).replace(/\/$/, "");

    if (!mayarApiKey) {
      return NextResponse.json(
        { ok: false, error: "MAYAR_API_KEY not configured" },
        { status: 503 }
      );
    }

    const res = await fetch(`${mayarApiUrl}/hl/v2/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mayarApiKey}`,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.messages || "Failed to check status" },
        { status: res.status }
      );
    }

    const status = String(json?.data?.status ?? "unpaid").toLowerCase();
    const isPaid = status === "paid" || status === "settled" || status === "success";

    // Jika Mayar mendeteksi lunas, update langsung database Supabase orders
    if (isPaid) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: matched } = await supabase
            .from("orders")
            .select("id, status, raw_payload")
            .contains("raw_payload", { paymentId })
            .limit(1);

          if (matched && matched.length > 0) {
            const row = matched[0];
            const raw = row.raw_payload || {};
            if (raw.status !== "won" || row.status !== "paid") {
              await supabase
                .from("orders")
                .update({
                  status: "paid",
                  raw_payload: {
                    ...raw,
                    status: "won",
                    paidAt: new Date().toISOString(),
                    verifiedViaMayar: true,
                  },
                })
                .eq("id", row.id);
            }
          }
        }
      } catch (dbErr) {
        console.warn("Could not sync verified Mayar payment to Supabase:", dbErr);
      }
    }

    return NextResponse.json({
      ok: true,
      status,
      isPaid,
      paymentId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
