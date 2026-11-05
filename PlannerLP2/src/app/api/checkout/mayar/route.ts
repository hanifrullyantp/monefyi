import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

interface MayarCheckoutPayload {
  product: "standard" | "pro";
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

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Alamat email wajib diisi dengan benar" },
        { status: 400 }
      );
    }

    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Nama lengkap wajib diisi" },
        { status: 400 }
      );
    }

    const cleanMobile = (mobile || "").replace(/[^0-9]/g, "");
    const formattedMobile = cleanMobile.startsWith("62")
      ? cleanMobile
      : cleanMobile.startsWith("0")
      ? `62${cleanMobile.slice(1)}`
      : `62${cleanMobile}`;

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

    // 1. Coba panggil Mayar API langsung jika MAYAR_API_KEY terkonfigurasi di env Next.js
    if (mayarApiKey) {
      const descriptionMeta = {
        app: "estimator",
        product: lynkProductKey,
        bump_taken: bumpTaken ? "true" : "false",
        customer_name: customerName,
        customer_email: email,
        customer_mobile: formattedMobile,
      };

      const mayarPayload = {
        name: customerName.trim(),
        email: email.trim().toLowerCase(),
        mobile: formattedMobile || "081234567890",
        amount: Math.round(amount),
        description: `monefyi:${JSON.stringify(descriptionMeta)}`,
        redirectUrl: returnUrl,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ...(body.paymentMethod && body.paymentMethod !== "qris"
          ? { paymentMethod: body.paymentMethod }
          : {}),
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

      const redirectUrl =
        json?.data?.link || json?.data?.url || json?.link || json?.url;
      const paymentId = json?.data?.id || json?.id;

      if (!redirectUrl) {
        return NextResponse.json(
          { ok: false, error: "Link checkout Mayar tidak ditemukan" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        provider: "mayar",
        redirectUrl,
        paymentId,
      });
    }

    // 2. Alternatif: Panggil Supabase Edge Function planner-checkout (yang memiliki secret MAYAR_API_KEY)
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
        });
      }
    }

    // 3. Fallback jika environment key belum dipasang
    return NextResponse.json(
      {
        ok: false,
        error:
          "MAYAR_API_KEY belum dikonfigurasi di environment Vercel / Supabase. Hubungi admin.",
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

