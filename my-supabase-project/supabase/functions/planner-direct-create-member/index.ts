import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireUser, getMembership, canInviteRole } from "../_shared/auth.ts";
import { sanitizeText } from "../_shared/sanitize.ts";
import { writeAudit } from "../_shared/audit.ts";

type DirectMemberInput = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: string;
};

async function findUserIdByEmail(sb: ReturnType<typeof getServiceClient>, email: string): Promise<string | null> {
  const { data, error } = await sb.rpc("planner_find_user_id_by_email", { p_email: email });
  if (error) throw error;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (Array.isArray(data) && data.length && typeof data[0] === "string") return data[0];
  return null;
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const sb = getServiceClient();
    const actor = await requireUser(sb, req.headers.get("Authorization"));
    const body = await req.json();
    const orgId = sanitizeText(body.org_id, 80);
    const items = Array.isArray(body.items) ? (body.items as DirectMemberInput[]) : [];

    if (!orgId) return jsonResponse({ error: "org_id required" }, 400);
    if (!items.length) return jsonResponse({ error: "items required" }, 400);
    if (items.length > 20) return jsonResponse({ error: "Maksimal 20 akun per sekali proses" }, 400);

    const membership = await getMembership(sb, actor.id, orgId);
    if (!membership || membership.role !== "owner") {
      return jsonResponse({ error: "Hanya owner yang bisa direct create akun" }, 403);
    }

    const results: Array<Record<string, unknown>> = [];

    for (const row of items) {
      const name = sanitizeText(row.name, 120);
      const email = sanitizeText(row.email, 200).toLowerCase();
      const password = typeof row.password === "string" ? row.password : "";
      const phoneRaw = sanitizeText(row.phone, 40);
      const phone = phoneRaw.replace(/[^\d+]/g, "");
      const role = sanitizeText(row.role, 20) || "worker";

      if (!name || !email || !password) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: "name/email/password wajib diisi",
        });
        continue;
      }
      if (!email.includes("@")) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: "Email tidak valid",
        });
        continue;
      }
      if (password.length < 8) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: "Password minimal 8 karakter",
        });
        continue;
      }
      if (!canInviteRole(membership.role, role)) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: "Role tidak diizinkan untuk akun Anda",
        });
        continue;
      }

      let uid: string | null = null;
      const created = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone },
      });

      if (created.data.user?.id) {
        uid = created.data.user.id;
      } else if (created.error?.message?.toLowerCase().includes("already been registered")) {
        uid = await findUserIdByEmail(sb, email);
        if (!uid) {
          results.push({
            ok: false,
            email,
            phone,
            role,
            error: "Email sudah terdaftar tetapi user tidak ditemukan",
          });
          continue;
        }
        const updated = await sb.auth.admin.updateUserById(uid, {
          password,
          email_confirm: true,
          user_metadata: { name, phone },
        });
        if (updated.error) {
          results.push({
            ok: false,
            email,
            phone,
            role,
            error: updated.error.message || "Gagal update user existing",
          });
          continue;
        }
      } else if (created.error) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: created.error?.message || "Gagal membuat user",
        });
        continue;
      }

      if (!uid) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: "Gagal mendapatkan user id",
        });
        continue;
      }

      const profileUpsert = await sb
        .from("profiles")
        .upsert(
          {
            id: uid,
            name,
            onboarding_completed: false,
          },
          { onConflict: "id" },
        );
      if (profileUpsert.error) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: profileUpsert.error.message || "Gagal menyiapkan profile",
        });
        continue;
      }

      const memberUpsert = await sb
        .from("planner_org_members")
        .upsert(
          {
            org_id: orgId,
            user_id: uid,
            role,
            status: "active",
            accepted_at: new Date().toISOString(),
            invited_by: actor.id,
            phone: phone || null,
          },
          { onConflict: "org_id,user_id" },
        )
        .select("id")
        .single();

      if (memberUpsert.error || !memberUpsert.data?.id) {
        results.push({
          ok: false,
          email,
          phone,
          role,
          error: memberUpsert.error?.message || "Gagal menambahkan ke organisasi",
        });
        continue;
      }

      await writeAudit(sb, {
        orgId,
        userId: actor.id,
        action: "member.direct_created",
        targetUserId: uid,
        metadata: { email, role },
      });

      results.push({
        ok: true,
        member_id: memberUpsert.data.id,
        user_id: uid,
        name,
        email,
        phone,
        role,
      });
    }

    const ok = results.filter((r) => r.ok).length;
    return jsonResponse({
      ok: true,
      created: ok,
      failed: results.length - ok,
      results,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "UNAUTHORIZED") return jsonResponse({ error: "Unauthorized" }, 401);
    if (msg === "EMAIL_NOT_VERIFIED") return jsonResponse({ error: "Email belum diverifikasi" }, 403);
    console.error(e);
    return jsonResponse({ error: msg }, 500);
  }
});
