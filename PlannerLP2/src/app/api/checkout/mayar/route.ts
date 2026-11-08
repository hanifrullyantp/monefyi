import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getActiveMayarApiKey,
  getActiveMayarApiUrl,
  sendMayarAlert,
} from "@/lib/services/mayarHealthService";
import { defaultContent } from "@/data/defaultContent";

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

    // URLs Fallback Cadangan Resmi
    const lynkUrls = defaultContent.pricing.lynkCheckoutUrls || {};
    const fallbackLynkUrl =
      product === "pro" || (product === "standard" && bumpTaken)
        ? lynkUrls.estimator_pro || "http://lynk.id/asfin-ai/qynky6065k37/checkout"
        : lynkUrls.estimator_standard || "http://lynk.id/asfin-ai/16w36xe7z3v1/checkout";

    const waFallbackUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(
      `Halo Tim Monefyi, saya ingin konfirmasi pesanan Estimator ${product.toUpperCase()} seharga Rp ${numericAmount.toLocaleString("id-ID")} atas nama ${customerName.trim()} (${formattedMobile}). Mohon instruksi pembayaran & aktivasi.`
    )}`;

    const mayarApiKey = await getActiveMayarApiKey();
    const mayarApiUrl = await getActiveMayarApiUrl();

    // Helper untuk menyimpan pesanan fallback ke CRM orders agar admin tetap punya data
    const saveFallbackLeadToDatabase = async () => {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const fallbackId = `fb_${Date.now()}`;
          await supabase.from("orders").insert([
            {
              id: fallbackId,
              email: email.trim().toLowerCase(),
              full_name: customerName.trim(),
              phone: formattedMobile,
              product_title: `Monefyi Estimator ${product.toUpperCase()} (Fallback Lynk)`,
              grand_total: numericAmount,
              status: "pending_payment",
              raw_payload: {
                name: customerName.trim(),
                email: email.trim().toLowerCase(),
                phone: formattedMobile,
                amount: numericAmount,
                planTier: product,
                bumpTaken,
                paymentMethod: "fallback_lynk",
                checkoutStep: 5,
                redirectUrl: fallbackLynkUrl,
                status: "pending_payment",
                isFallback: true,
                createdAt: new Date().toISOString(),
              },
            },
          ]);
        }
      } catch (err) {
        console.warn("Could not save fallback order to Supabase:", err);
      }
    };

    // 1. Coba panggil Mayar API jika API Key tersedia
    if (mayarApiKey) {
      const descriptionMeta = {
        app: "estimator",
        product: lynkProductKey,
        bump_taken: bumpTaken ? "true" : "false",
        customer_name: customerName,
        customer_email: email,
        customer_mobile: formattedMobile,
      };

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

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(`${mayarApiUrl}/hl/v2/payments/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mayarApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mayarPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const json = await response.json().catch(() => ({}));

        // JIKA MAYAR GAGAL / UNAUTHORIZED (401)
        // OTOMATIS AKTIFKAN FALLBACK KE LYNK.ID & KIRIM ALERT KE ADMIN
        if (!response.ok) {
          console.warn(`[Mayar Checkout Error] Status ${response.status}:`, json);

          // Trigger Alert ke WhatsApp & Telegram Admin
          await sendMayarAlert({
            status: response.status,
            reason:
              response.status === 401
                ? "Mayar API Unauthorized (401) - API Key kedaluwarsa atau salah"
                : json?.messages || json?.error || "Gagal membuat invoice Mayar",
            context: `Customer: ${customerName} (${formattedMobile}), Total: Rp ${numericAmount.toLocaleString("id-ID")}`,
          });

          await saveFallbackLeadToDatabase();

          // KEMBALIKAN FALLBACK RESMI TANPA MENGECEWAKAN PEMBELI
          return NextResponse.json({
            ok: true,
            fallback: true,
            provider: "lynk",
            paymentId: `fallback_${Date.now()}`,
            redirectUrl: fallbackLynkUrl,
            waOrderUrl: waFallbackUrl,
            amount: numericAmount,
            message: "Sistem otomatis mengarahkan ke link pembayaran terverifikasi.",
          });
        }

        const paymentData = json?.data || {};
        const redirectUrl =
          paymentData.link || paymentData.url || json?.link || json?.url;
        const paymentId = paymentData.id || json?.id;

        // Ambil qr_string dari paymentDetail Mayar jika ada
        const qrCodeProps = paymentData?.paymentDetail?.qr_code?.channel_properties;
        const qrString = qrCodeProps?.qr_string || null;
        const qrExpiresAt = qrCodeProps?.expires_at || null;

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
      } catch (fetchErr: any) {
        console.warn("[Mayar Checkout Fetch Exception]:", fetchErr);

        // Fetch timeout atau error koneksi -> Fallback otomatis
        await sendMayarAlert({
          status: 504,
          reason: `Koneksi ke Mayar API gagal/timeout: ${fetchErr?.message || "Timeout"}`,
          context: `Customer: ${customerName} (${formattedMobile})`,
        });

        await saveFallbackLeadToDatabase();

        return NextResponse.json({
          ok: true,
          fallback: true,
          provider: "lynk",
          paymentId: `fallback_${Date.now()}`,
          redirectUrl: fallbackLynkUrl,
          waOrderUrl: waFallbackUrl,
          amount: numericAmount,
          message: "Koneksi gateway dialihkan ke pembayaran resmi.",
        });
      }
    }

    // 2. Jika API Key belum terpasang sama sekali -> Fallback aman
    await sendMayarAlert({
      status: 401,
      reason: "API Key Mayar belum dikonfigurasi di dashboard / environment.",
      context: `Customer: ${customerName} (${formattedMobile})`,
    });

    await saveFallbackLeadToDatabase();

    return NextResponse.json({
      ok: true,
      fallback: true,
      provider: "lynk",
      paymentId: `fallback_${Date.now()}`,
      redirectUrl: fallbackLynkUrl,
      waOrderUrl: waFallbackUrl,
      amount: numericAmount,
      message: "Gateway dialihkan ke link pembayaran cadangan resmi.",
    });
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

    // Jika payment ID adalah fallback, tangani tanpa error
    if (paymentId.startsWith("fallback_") || paymentId.startsWith("free_")) {
      return NextResponse.json({
        ok: true,
        status: "pending",
        isPaid: false,
        isFallback: true,
        paymentId,
      });
    }

    const mayarApiKey = await getActiveMayarApiKey();
    const mayarApiUrl = await getActiveMayarApiUrl();

    if (!mayarApiKey) {
      return NextResponse.json({
        ok: true,
        status: "pending",
        isPaid: false,
        paymentId,
        warning: "Mayar API key not configured",
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${mayarApiUrl}/hl/v2/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mayarApiKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        await sendMayarAlert({
          status: 401,
          reason: "Unauthorized saat mengecek status pembayaran di Mayar.",
        });
      }
      return NextResponse.json(
        { ok: false, error: json?.messages || "Gagal memeriksa status Mayar" },
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
            if (raw.status !== "won" || raw.status !== "paid") {
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
