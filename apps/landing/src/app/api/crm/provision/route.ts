import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0Mjc5NCwiZXhwIjoyMDgxOTE4Nzk0fQ.nQWJJiUTu5YjDcOFI3I1-I1Yf3FFW7_-uNiQXL7RkM8";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * API untuk memastikan akun Supabase Auth pelanggan tersedia & password sinkron
 * Dipanggil saat:
 * 1. Admin mengirim WA berisi data akses/password pelanggan dari CRM
 * 2. Checkout berhasil (pembayaran diverifikasi / registrasi selesai)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "Estimator2026!").trim();
    const name = String(body.name || "Pelanggan").trim();
    const phone = String(body.phone || "").replace(/[^0-9]/g, "");
    const planTier = String(body.planTier || "standard").toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Email tidak valid" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "Supabase service role key belum disetting di environment" }, { status: 500 });
    }

    let userId: string | null = null;

    // 1. Cek apakah user sudah terdaftar di auth.users
    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    }

    const existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email
    );

    if (existingUser) {
      userId = existingUser.id;
      // Update password & pastikan email terkonfirmasi
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          name: name || existingUser.user_metadata?.name,
          phone: phone || existingUser.user_metadata?.phone,
        },
      });

      if (updateErr) {
        return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
      }
    } else {
      // User belum ada, create baru
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          phone,
          plan_tier: planTier,
        },
      });

      if (createErr || !createData.user) {
        return NextResponse.json({ ok: false, error: createErr?.message || "Gagal membuat user" }, { status: 500 });
      }
      userId = createData.user.id;
    }

    // 2. Sinkronkan Profile dan Organisasi jika userId ada
    if (userId) {
      const targetPlanType = planTier === "pro" ? "pro" : "standard";

      // Pastikan profile terisi
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          name: name || "Pengguna",
          plan_type: "lifetime",
          role: "user",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // Sinkronkan planner_organizations milik user
      const { data: memberRows } = await supabaseAdmin
        .from("planner_org_members")
        .select("org_id")
        .eq("user_id", userId);

      if (memberRows && memberRows.length > 0) {
        const orgIds = memberRows.map((m) => m.org_id);
        await supabaseAdmin
          .from("planner_organizations")
          .update({
            plan_type: targetPlanType,
            updated_at: new Date().toISOString(),
          })
          .in("id", orgIds);
      }

      // Link order jika ada
      await supabaseAdmin
        .from("orders")
        .update({ user_id: userId })
        .eq("email", email)
        .is("user_id", null);
    }

    return NextResponse.json({
      ok: true,
      userId,
      email,
      passwordUpdated: true,
      planTier,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

