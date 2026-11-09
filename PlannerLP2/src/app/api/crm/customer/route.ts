import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/crm/customer?email=...&id=...
 * Mengambil statistik keaktifan user (estimasi dibuat, proyek, keaktifan, tim)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = (searchParams.get("email") || "").trim().toLowerCase();
    const idParam = searchParams.get("id");

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "Database admin client not configured" },
        { status: 500 }
      );
    }

    // 1. Dapatkan user auth
    let targetUser: any = null;
    const { data: usersData, error: userErr } = await supabaseAdmin.auth.admin.listUsers();
    if (!userErr && usersData?.users) {
      targetUser = usersData.users.find(
        (u) =>
          (emailParam && u.email?.toLowerCase().trim() === emailParam) ||
          (idParam && u.id === idParam)
      );
    }

    if (!targetUser) {
      // Coba cari dari orders table jika user auth belum dibuat
      let orderQuery = supabaseAdmin.from("orders").select("*");
      if (emailParam) orderQuery = orderQuery.ilike("email", emailParam);
      if (idParam) orderQuery = orderQuery.eq("id", idParam);
      const { data: matchedOrders } = await orderQuery.limit(1);

      if (matchedOrders && matchedOrders.length > 0) {
        const ord = matchedOrders[0];
        const raw = ord.raw_payload || {};
        return NextResponse.json({
          ok: true,
          data: {
            existsInAuth: false,
            email: ord.email,
            name: ord.full_name,
            phone: ord.phone,
            planTier: ord.plan_tier || raw.planTier || "standard",
            totalEstimations: raw.estimatorActivity?.usedEstimations || 0,
            totalProjects: 0,
            totalEstValue: 0,
            sentViaWa: 0,
            acceptedEst: 0,
            teamMembers: [],
            lastActiveAt: raw.paidAt || ord.created_at,
            lastSignInAt: null,
            orgName: ord.full_name,
            recentEstimations: [],
          },
        });
      }

      return NextResponse.json({
        ok: true,
        data: {
          existsInAuth: false,
          totalEstimations: 0,
          totalProjects: 0,
          totalEstValue: 0,
          sentViaWa: 0,
          acceptedEst: 0,
          teamMembers: [],
          lastActiveAt: null,
          recentEstimations: [],
        },
      });
    }

    // 2. Cari keanggotaan organisasi user
    const { data: memberRows } = await supabaseAdmin
      .from("planner_org_members")
      .select("org_id, role, last_active_at, joined_at")
      .eq("user_id", targetUser.id);

    const orgId = memberRows?.[0]?.org_id;

    if (!orgId) {
      return NextResponse.json({
        ok: true,
        data: {
          existsInAuth: true,
          userId: targetUser.id,
          email: targetUser.email,
          name: targetUser.user_metadata?.name || targetUser.email,
          phone: targetUser.user_metadata?.phone || targetUser.phone,
          planTier: targetUser.user_metadata?.plan_tier || "standard",
          totalEstimations: 0,
          totalProjects: 0,
          totalEstValue: 0,
          sentViaWa: 0,
          acceptedEst: 0,
          teamMembers: [{ email: targetUser.email, role: "owner", name: targetUser.user_metadata?.name }],
          lastActiveAt: targetUser.last_sign_in_at,
          lastSignInAt: targetUser.last_sign_in_at,
          orgName: targetUser.user_metadata?.name || targetUser.email,
          recentEstimations: [],
        },
      });
    }

    // 3. Ambil data organisasi
    const { data: org } = await supabaseAdmin
      .from("planner_organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    // 4. Ambil semua anggota tim dalam organisasi
    const { data: allMembers } = await supabaseAdmin
      .from("planner_org_members")
      .select("role, user_id, last_active_at, position, profiles(name, plan_type, phone)")
      .eq("org_id", orgId);

    const teamMembers = (allMembers || []).map((m: any) => {
      const u = usersData?.users?.find((usr) => usr.id === m.user_id);
      return {
        userId: m.user_id,
        email: u?.email || "-",
        role: m.role || "worker",
        name: m.profiles?.name || u?.user_metadata?.name || "Member",
        phone: m.profiles?.phone || u?.phone || "",
        lastActive: m.last_active_at || u?.last_sign_in_at || null,
        planType: m.profiles?.plan_type || org?.plan_type || "pro",
      };
    });

    // 5. Hitung Estimasi yang sudah dibuat
    const { data: estimations, count: estCount } = await supabaseAdmin
      .from("planner_estimations")
      .select("id, code, title, total_selling_price, status, created_at, wa_at, accepted_at, customer_name", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // 6. Hitung Proyek yang dibuat
    const { data: projects, count: prjCount } = await supabaseAdmin
      .from("planner_projects")
      .select("id, name, total_budget, status, created_at, client_name", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const totalEstValue = (estimations || []).reduce(
      (sum, e: any) => sum + (Number(e.total_selling_price) || 0),
      0
    );
    const sentViaWa = (estimations || []).filter((e: any) => e.wa_at).length;
    const acceptedEst = (estimations || []).filter((e: any) => e.accepted_at).length;

    return NextResponse.json({
      ok: true,
      data: {
        existsInAuth: true,
        userExists: true,
        userId: targetUser.id,
        email: targetUser.email,
        name: targetUser.user_metadata?.name || org?.name || "Pelanggan",
        phone: targetUser.user_metadata?.phone || targetUser.phone,
        orgId,
        orgName: org?.name || "Workspace",
        planTier: org?.plan_type || "pro",
        lastSignInAt: targetUser.last_sign_in_at,
        lastSignIn: targetUser.last_sign_in_at,
        lastActiveAt: memberRows?.[0]?.last_active_at || targetUser.last_sign_in_at,
        userCreatedAt: targetUser.created_at,
        totalEstimations: estCount || 0,
        estimationsCount: estCount || 0,
        totalEstValue,
        totalEstimationValue: totalEstValue,
        sentViaWa,
        acceptedEst,
        totalProjects: prjCount || 0,
        projectsCount: prjCount || 0,
        teamMembers,
        orgMembers: teamMembers,
        recentEstimations: (estimations || []).slice(0, 5),
        recentProjects: (projects || []).slice(0, 5),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/customer
 * Mengubah data pelanggan (password, email, nama, phone, planTier, status, notes)
 * dan otomatis mensinkronkan ke Supabase Auth & tabel terkait
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      id,
      sessionId,
      email,
      newEmail,
      password,
      name,
      phone,
      planTier,
      status,
      notes,
      amount,
      projectType,
    } = body;

    const currentEmail = String(email || "").trim().toLowerCase();
    const cleanNewEmail = newEmail ? String(newEmail).trim().toLowerCase() : undefined;
    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, "") : undefined;
    const targetEmail = cleanNewEmail || currentEmail;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "Database admin client not configured" },
        { status: 500 }
      );
    }

    // 1. Cari user di Supabase Auth
    let targetUser: any = null;
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    if (usersData?.users) {
      targetUser = usersData.users.find(
        (u) =>
          (currentEmail && u.email?.toLowerCase().trim() === currentEmail) ||
          (cleanNewEmail && u.email?.toLowerCase().trim() === cleanNewEmail)
      );
    }

    let userId = targetUser?.id;

    // 2. Jika user auth belum ada dan ada password / targetEmail: Buat user baru di Supabase Auth
    if (!targetUser && targetEmail && targetEmail.includes("@")) {
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: password || "Estimator2026!",
        email_confirm: true,
        user_metadata: {
          name: name || "Pelanggan",
          phone: cleanPhone || "",
          plan_tier: planTier || "standard",
        },
      });
      if (!createErr && createData?.user) {
        userId = createData.user.id;
        targetUser = createData.user;
      }
    }

    // 3. Jika user auth sudah ada: Update password / email / metadata
    if (userId) {
      const authUpdates: any = {};
      if (password && String(password).trim().length >= 6) {
        authUpdates.password = String(password).trim();
      }
      if (cleanNewEmail && cleanNewEmail !== currentEmail && cleanNewEmail.includes("@")) {
        authUpdates.email = cleanNewEmail;
        authUpdates.email_confirm = true;
      }
      if (name || cleanPhone || planTier) {
        authUpdates.user_metadata = {
          ...(targetUser?.user_metadata || {}),
          ...(name ? { name: name.trim() } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          ...(planTier ? { plan_tier: planTier } : {}),
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
        if (updateErr) {
          console.warn("Supabase Auth update warning:", updateErr.message);
        }
      }

      // Update profiles
      const profileUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (name) profileUpdates.name = name.trim();
      if (cleanPhone) profileUpdates.phone = cleanPhone;
      if (planTier) profileUpdates.plan_type = planTier === "free" ? "free" : "lifetime";

      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          ...profileUpdates,
        },
        { onConflict: "id" }
      );

      // Update planner_organizations jika planTier berubah
      if (planTier) {
        const targetOrgPlan = planTier === "pro" ? "pro" : "standard";
        const { data: mRows } = await supabaseAdmin
          .from("planner_org_members")
          .select("org_id")
          .eq("user_id", userId);

        if (mRows && mRows.length > 0) {
          const orgIds = mRows.map((m: any) => m.org_id);
          await supabaseAdmin
            .from("planner_organizations")
            .update({ plan_type: targetOrgPlan, updated_at: new Date().toISOString() })
            .in("id", orgIds);
        }
      }
    }

    // 4. Update data order di tabel orders (CRM record)
    let orderQuery = supabaseAdmin.from("orders").select("id, raw_payload");
    if (id) {
      orderQuery = orderQuery.eq("id", id);
    } else if (sessionId) {
      orderQuery = orderQuery.contains("raw_payload", { sessionId });
    } else if (currentEmail) {
      orderQuery = orderQuery.ilike("email", currentEmail);
    }

    const { data: matchedOrders } = await orderQuery.limit(1);
    if (matchedOrders && matchedOrders.length > 0) {
      const order = matchedOrders[0];
      const currentRaw = order.raw_payload || {};
      const updatedRaw = {
        ...currentRaw,
        ...(name ? { name: name.trim() } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(targetEmail ? { email: targetEmail } : {}),
        ...(password ? { accountPassword: password.trim() } : {}),
        ...(planTier ? { planTier } : {}),
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(projectType ? { projectType } : {}),
        updatedAt: new Date().toISOString(),
      };

      const topLevelUpdates: any = {
        raw_payload: updatedRaw,
      };
      if (name) topLevelUpdates.full_name = name.trim();
      if (cleanPhone) topLevelUpdates.phone = cleanPhone;
      if (targetEmail) topLevelUpdates.email = targetEmail;
      if (userId) topLevelUpdates.user_id = userId;
      if (amount !== undefined) topLevelUpdates.grand_total = Number(amount);
      if (status === "won") topLevelUpdates.status = "paid";

      await supabaseAdmin.from("orders").update(topLevelUpdates).eq("id", order.id);
    }

    return NextResponse.json({
      ok: true,
      message: "Data pelanggan berhasil diperbarui & disinkronkan ke Supabase Auth",
      userId,
      email: targetEmail,
      planTier,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
