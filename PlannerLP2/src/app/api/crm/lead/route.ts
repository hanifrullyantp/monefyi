import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { randomUUID } from "crypto";

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
          // Buat record order baru dengan UUID v4 unik
          const newId = randomUUID();
          await supabase.from("orders").insert([
            {
              id: newId,
              email: email.trim().toLowerCase() || `session_${sessionId.slice(0, 8)}@monefyi.temp`,
              full_name: name.trim() || "Lead Checkout (Draft)",
              phone: formattedPhone || "-",
              product_title: productTitle,
              grand_total: Math.round(amount),
              status: orderStatus,
              raw_payload: {
                ...leadRecord,
                id: newId,
              },
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
export async function GET(req: NextRequest) {
  try {
    const shouldVerifyMayar = req?.nextUrl?.searchParams?.get("verifyMayar") === "true";
    const supabase = getSupabaseClient();
    const leadsMap: Map<string, any> = new Map();

    const mayarApiKey = (
      process.env.MAYAR_API_KEY ||
      process.env.MAYAR_API_KEY_SANDBOX ||
      ""
    ).trim();
    const mayarApiUrl = (
      process.env.MAYAR_API_URL || "https://api.mayar.id"
    ).replace(/\/$/, "");

    // 1. Masukkan memory leads dulu
    for (const [sid, item] of memoryLeads.entries()) {
      const memId = item.id || `mem_${sid}`;
      leadsMap.set(memId, {
        ...item,
        id: memId,
        sessionId: sid,
        estimatedValue: item.amount || item.estimatedValue || 0,
      });
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

            // Hapus memory lead jika sessionId ini sudah ada di Supabase orders
            if (sid) {
              for (const [mk, mv] of leadsMap.entries()) {
                if (mv.sessionId === sid || mk === `mem_${sid}`) {
                  leadsMap.delete(mk);
                }
              }
            }

            let currentStatus =
              r.status === "paid"
                ? "won"
                : r.status === "pending"
                ? "pending_payment"
                : raw.status || "abandoned_checkout";

            // Verifikasi real-time ke Mayar jika status masih pending_payment dan memiliki paymentId
            if (shouldVerifyMayar && mayarApiKey && raw.paymentId && currentStatus === "pending_payment") {
              try {
                const checkRes = await fetch(`${mayarApiUrl}/hl/v2/payments/${raw.paymentId}`, {
                  headers: { Authorization: `Bearer ${mayarApiKey}` },
                });
                if (checkRes.ok) {
                  const checkJson = await checkRes.json();
                  const mayarStatus = String(checkJson?.data?.status ?? "unpaid").toLowerCase();
                  if (mayarStatus === "paid" || mayarStatus === "settled" || mayarStatus === "success") {
                    currentStatus = "won";
                    // Update ke database Supabase
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
                      .eq("id", r.id);
                  }
                }
              } catch (chkErr) {
                console.warn(`Could not verify Mayar status for paymentId ${raw.paymentId}:`, chkErr);
              }
            }

            // Gunakan r.id asli sebagai ID unik setiap pesanan di tabel
            leadsMap.set(r.id, {
              id: r.id,
              sessionId: sid,
              name: r.full_name || raw.name || "Anonim",
              email: r.email?.includes("@monefyi.temp") ? "" : r.email || raw.email || "",
              phone: r.phone !== "-" ? r.phone || raw.phone || "" : raw.phone || "",
              planTier: raw.planTier || (r.product_title?.includes("Free") ? "free" : r.product_title?.includes("PRO") ? "pro" : "standard"),
              bumpTaken: Boolean(raw.bumpTaken),
              paymentMethod: raw.paymentMethod || "qris",
              amount: r.grand_total || raw.amount || 0,
              estimatedValue: r.grand_total || raw.amount || 0,
              paymentId: raw.paymentId || null,
              productId: raw.productId || (raw.paymentId ? "b8cd23" : null),
              paymentName: raw.paymentName || (raw.paymentId ? "Penagihan" : null),
              verifiedViaMayar: Boolean(raw.verifiedViaMayar || (r.status === "paid" && raw.paymentId)),
              checkoutStep: raw.checkoutStep || (currentStatus === "won" ? 5 : 3),
              status: currentStatus,
              emails: Array.isArray(raw.emails) ? raw.emails : [],
              createdAt: r.created_at,
              updatedAt: raw.updatedAt || r.created_at,
            });
          }
        }
      } catch (sbErr) {
        console.warn("Could not load from Supabase:", sbErr);
      }
    }

    // 3. Sinkronisasi Langsung dari Mayar Transactions API
    // Memastikan seluruh transaksi yang sudah dibayar di Mayar (seperti Abe) selalu masuk ke CRM
    if (mayarApiKey) {
      try {
        const mayarTxRes = await fetch(`${mayarApiUrl}/hl/v2/transactions?limit=50`, {
          headers: {
            Authorization: `Bearer ${mayarApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (mayarTxRes.ok) {
          const txJson = await mayarTxRes.json();
          const txList = Array.isArray(txJson?.data) ? txJson.data : [];

          for (const tx of txList) {
            const txStatus = String(tx?.status || "").toLowerCase();
            const isPaid = txStatus === "paid" || txStatus === "settled" || txStatus === "success";
            if (!isPaid) continue;

            const txCustomer = tx.customer || {};
            const txEmail = (txCustomer.email || "").trim().toLowerCase();
            const txName = (txCustomer.name || "Pelanggan Mayar").trim();
            const txPhoneRaw = (txCustomer.mobile || "").replace(/[^0-9]/g, "");
            const txPhone = txPhoneRaw.startsWith("62")
              ? txPhoneRaw
              : txPhoneRaw.startsWith("0")
              ? `62${txPhoneRaw.slice(1)}`
              : txPhoneRaw ? `62${txPhoneRaw}` : "";

            const txAmount = Number(tx.amount || tx.credit || 0);
            const txMethod = String(tx.paymentMethod || "qris").toLowerCase();
            const txId = String(tx.id || "");
            const txCreatedAt = tx.createdAt
              ? typeof tx.createdAt === "number"
                ? new Date(tx.createdAt).toISOString()
                : new Date(String(tx.createdAt)).toISOString()
              : new Date().toISOString();

            // Cari apakah lead ini sudah ada di leadsMap (prioritas ID transaksi / paymentId)
            let matchedKey: string | null = null;
            for (const [key, existing] of leadsMap.entries()) {
              const exPayId = existing.paymentId || "";
              if (
                txId && (exPayId === txId || existing.id === txId || existing.sessionId === txId)
              ) {
                matchedKey = key;
                break;
              }
            }

            // Jika belum cocok via ID, cocokkan pesanan yang statusnya masih menunggu pembayaran
            if (!matchedKey && txEmail) {
              for (const [key, existing] of leadsMap.entries()) {
                const exEmail = (existing.email || "").trim().toLowerCase();
                if (exEmail === txEmail && existing.status === "pending_payment") {
                  matchedKey = key;
                  break;
                }
              }
            }

            if (matchedKey) {
              const existing = leadsMap.get(matchedKey);
              const updatedLead = {
                ...existing,
                status: "won",
                paymentId: txId,
                amount: txAmount || existing.amount,
                paymentMethod: txMethod || existing.paymentMethod,
                name: existing.name && existing.name !== "Lead Checkout (Draft)" && existing.name !== "Anonim" ? existing.name : txName,
                email: existing.email || txEmail,
                phone: existing.phone && existing.phone !== "-" ? existing.phone : txPhone,
                checkoutStep: 5,
                updatedAt: txCreatedAt,
              };
              leadsMap.set(matchedKey, updatedLead);

              // Update baris di Supabase jika status order belum 'paid'
              if (supabase && existing.id) {
                try {
                  await supabase
                    .from("orders")
                    .update({
                      status: "paid",
                      grand_total: updatedLead.amount,
                      raw_payload: {
                        ...(existing.raw_payload || {}),
                        ...updatedLead,
                        status: "won",
                        verifiedViaMayar: true,
                        paidAt: txCreatedAt,
                      },
                    })
                    .eq("id", existing.id);
                } catch (updErr) {
                  console.warn("Could not sync order update to Supabase:", updErr);
                }
              }
            } else {
              // Transaksi baru yang belum ada di local/Supabase
              const newTier = txAmount >= 290000 ? "pro" : "standard";
              const newLead = {
                id: txId,
                sessionId: txId,
                name: txName,
                email: txEmail,
                phone: txPhone,
                planTier: newTier,
                bumpTaken: false,
                paymentMethod: txMethod,
                amount: txAmount,
                paymentId: txId,
                checkoutStep: 5,
                status: "won",
                emails: [],
                createdAt: txCreatedAt,
                updatedAt: txCreatedAt,
              };

              leadsMap.set(txId, newLead);

              // Simpan langsung ke Supabase orders agar permanen
              if (supabase) {
                try {
                  await supabase.from("orders").upsert(
                    [
                      {
                        id: txId,
                        email: txEmail || `mayar_${txId.slice(0, 8)}@monefyi.temp`,
                        full_name: txName,
                        phone: txPhone || "-",
                        product_title: `Monefyi Estimator ${newTier.toUpperCase()}`,
                        grand_total: txAmount,
                        status: "paid",
                        raw_payload: newLead,
                      },
                    ],
                    { onConflict: "id" }
                  );
                } catch (insErr) {
                  console.warn("Could not upsert Mayar tx to Supabase orders:", insErr);
                }
              }
            }
          }
        }
      } catch (mayarErr) {
        console.warn("Could not fetch Mayar transactions:", mayarErr);
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

// DELETE: Hapus lead tunggal atau masal dari memory & Supabase orders
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIds: string[] = Array.isArray(body?.ids)
      ? body.ids
      : body?.id
      ? [String(body.id)]
      : [];

    const rawSessionIds: string[] = Array.isArray(body?.sessionIds)
      ? body.sessionIds
      : body?.sessionId
      ? [String(body.sessionId)]
      : [];

    const ids = rawIds.filter(Boolean);
    const sessionIds = rawSessionIds.filter(Boolean);

    if (ids.length === 0 && sessionIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Parameter 'id', 'ids', atau 'sessionId' wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Hapus dari in-memory cache
    for (const [key, val] of memoryLeads.entries()) {
      if (
        ids.includes(key) ||
        ids.includes(val.id) ||
        ids.includes(val.sessionId) ||
        sessionIds.includes(key) ||
        sessionIds.includes(val.sessionId)
      ) {
        memoryLeads.delete(key);
      }
    }

    // 2. Hapus dari Supabase orders table
    const supabase = getSupabaseClient();
    let deletedCount = 0;
    if (supabase) {
      try {
        if (ids.length > 0) {
          const { count, error } = await supabase
            .from("orders")
            .delete({ count: "exact" })
            .in("id", ids);

          if (!error && count) {
            deletedCount += count;
          }

          // Cek juga jika ada id yang tersimpan sebagai sessionId di raw_payload
          for (const idItem of ids) {
            const { count: c } = await supabase
              .from("orders")
              .delete({ count: "exact" })
              .contains("raw_payload", { sessionId: idItem });
            if (c) deletedCount += c;
          }
        }

        if (sessionIds.length > 0) {
          for (const sid of sessionIds) {
            const { count: c } = await supabase
              .from("orders")
              .delete({ count: "exact" })
              .contains("raw_payload", { sessionId: sid });
            if (c) deletedCount += c;
          }
        }
      } catch (dbErr) {
        console.warn("Supabase orders delete warning:", dbErr);
      }
    }

    return NextResponse.json({
      ok: true,
      deletedCount: Math.max(deletedCount, ids.length + sessionIds.length),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Perbarui status atau catatan lead langsung ke memory & Supabase orders
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, sessionId, status, notes } = body;

    if (!id && !sessionId) {
      return NextResponse.json(
        { ok: false, error: "Parameter 'id' atau 'sessionId' wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Update memory leads
    for (const [key, val] of memoryLeads.entries()) {
      if (
        key === id ||
        key === sessionId ||
        val.id === id ||
        val.sessionId === sessionId
      ) {
        memoryLeads.set(key, {
          ...val,
          ...(status ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Update Supabase orders table
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const orderStatus =
          status === "won"
            ? "paid"
            : status === "pending_payment"
            ? "pending"
            : status === "abandoned_checkout"
            ? "abandoned"
            : status || "pending";

        let query = supabase.from("orders").select("id, raw_payload");
        if (id) {
          query = query.eq("id", id);
        } else if (sessionId) {
          query = query.contains("raw_payload", { sessionId });
        }

        const { data: matched } = await query.limit(1);
        if (matched && matched.length > 0) {
          const row = matched[0];
          const raw = row.raw_payload || {};
          await supabase
            .from("orders")
            .update({
              status: orderStatus,
              raw_payload: {
                ...raw,
                ...(status ? { status } : {}),
                ...(notes !== undefined ? { notes } : {}),
                updatedAt: new Date().toISOString(),
              },
            })
            .eq("id", row.id);
        }
      } catch (dbErr) {
        console.warn("Could not patch Supabase orders:", dbErr);
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}


