import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Endpoint untuk Ringkasan Finansial Mayar:
 * Saldo Akun (Active & Pending Balance), Lifetime Revenue, dan Omset Hari Ini
 * Endpoint: GET /api/crm/mayar-stats
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldVerifyPending = searchParams.get("verifyPending") === "true";

    const mayarApiKey = (
      process.env.MAYAR_API_KEY ||
      process.env.MAYAR_API_KEY_SANDBOX ||
      ""
    ).trim();

    const mayarApiUrl = (
      process.env.MAYAR_API_URL || "https://api.mayar.id"
    ).replace(/\/$/, "");

    let activeBalance = 0;
    let pendingBalance = 0;
    let totalBalance = 0;
    let isMayarConnected = false;

    // 1. Ambil saldo live dari Mayar Headless API V2 (/hl/v2/balances)
    if (mayarApiKey) {
      try {
        const balRes = await fetch(`${mayarApiUrl}/hl/v2/balances`, {
          headers: {
            Authorization: `Bearer ${mayarApiKey}`,
          },
          next: { revalidate: 0 },
        });

        if (balRes.ok) {
          const balJson = await balRes.json();
          const d = balJson?.data || {};
          activeBalance = Number(d.activeBalance ?? d.balance ?? 0);
          pendingBalance = Number(d.pendingBalance ?? 0);
          totalBalance = Number(d.balance ?? (activeBalance + pendingBalance));
          isMayarConnected = true;
        }
      } catch (balErr) {
        console.warn("Mayar balance fetch warning:", balErr);
      }
    }

    // 2. Hitung Lifetime Revenue & Order Stats dari Supabase orders
    const supabase = getSupabaseClient();
    let lifetimeRevenue = 0;
    let totalPaidOrders = 0;
    let todayRevenue = 0;
    let pendingRevenue = 0;
    let updatedPaidCount = 0;

    if (supabase) {
      try {
        // Ambil semua orders untuk kalkulasi finansial
        const { data: rows } = await supabase
          .from("orders")
          .select("id, status, grand_total, created_at, raw_payload")
          .order("created_at", { ascending: false });

        if (rows) {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const pendingRowsToCheck: any[] = [];

          for (const r of rows) {
            const raw = r.raw_payload || {};
            const isPaid = r.status === "paid" || raw.status === "won";
            const amt = Number(r.grand_total || raw.amount || 0);

            if (isPaid) {
              lifetimeRevenue += amt;
              totalPaidOrders += 1;

              const createdAt = new Date(r.created_at || raw.createdAt || 0);
              if (createdAt >= startOfToday) {
                todayRevenue += amt;
              }
            } else {
              pendingRevenue += amt;
              if (raw.paymentId && (r.status === "pending" || raw.status === "pending_payment")) {
                pendingRowsToCheck.push(r);
              }
            }
          }

          // 3. Verifikasi Otomatis Status Pembayaran Mayar untuk Order yang Pending (misal kasus Abe)
          if ((shouldVerifyPending || pendingRowsToCheck.length > 0) && mayarApiKey) {
            // Cek maksimal 10 pending order terbaru ke API Mayar
            const batchToCheck = pendingRowsToCheck.slice(0, 10);
            for (const orderRow of batchToCheck) {
              const payId = orderRow.raw_payload?.paymentId;
              if (!payId) continue;

              try {
                const checkRes = await fetch(`${mayarApiUrl}/hl/v2/payments/${payId}`, {
                  headers: { Authorization: `Bearer ${mayarApiKey}` },
                });

                if (checkRes.ok) {
                  const checkJson = await checkRes.json();
                  const mayarStatus = String(checkJson?.data?.status ?? "unpaid").toLowerCase();
                  if (mayarStatus === "paid" || mayarStatus === "settled" || mayarStatus === "success") {
                    // Update order di Supabase
                    const amt = Number(orderRow.grand_total || orderRow.raw_payload?.amount || 0);
                    await supabase
                      .from("orders")
                      .update({
                        status: "paid",
                        raw_payload: {
                          ...(orderRow.raw_payload || {}),
                          status: "won",
                          paidAt: new Date().toISOString(),
                          verifiedViaMayarSync: true,
                        },
                      })
                      .eq("id", orderRow.id);

                    lifetimeRevenue += amt;
                    totalPaidOrders += 1;
                    pendingRevenue = Math.max(0, pendingRevenue - amt);
                    updatedPaidCount += 1;
                  }
                }
              } catch (checkErr) {
                console.warn(`Could not verify paymentId ${payId}:`, checkErr);
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn("Could not query orders for financial stats:", dbErr);
      }
    }

    // Jika live Mayar balance belum terhubung / 0, sediakan estimasi dari pesanan lunas
    if (activeBalance === 0 && lifetimeRevenue > 0) {
      activeBalance = lifetimeRevenue;
      totalBalance = lifetimeRevenue + pendingBalance;
    }

    return NextResponse.json({
      ok: true,
      activeBalance,
      pendingBalance,
      totalBalance,
      lifetimeRevenue,
      totalPaidOrders,
      todayRevenue,
      pendingRevenue,
      updatedPaidCount,
      isMayarConnected,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
