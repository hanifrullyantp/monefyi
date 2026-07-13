import { directCreateMembers } from './invitationService';
import { createWorker } from './rpp/workerService';
import type { OrgMember, MemberRole } from '../types/onboarding';

export type QuickHrResult =
  | { ok: true; member: OrgMember; generatedPassword?: string }
  | { ok: false; error: string; fallbackWorkerId?: number };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'worker';
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Create HR member from manual name. Uses placeholder email for field workers without login.
 * Falls back to rpp_workers catalog when caller lacks direct-create permission.
 */
export async function createHrMemberQuick(params: {
  orgId: string;
  name: string;
  phone?: string;
  role?: MemberRole;
  canDirectCreate: boolean;
  orgSlug?: string;
}): Promise<QuickHrResult> {
  const name = params.name.trim();
  if (!name) return { ok: false, error: 'Nama wajib diisi' };

  if (!params.canDirectCreate) {
    try {
      const worker = await createWorker(params.orgId, {
        name,
        level: 'Menengah',
        rate: 0,
        contact: params.phone || '',
      });
      return { ok: false, error: 'Disimpan ke katalog tenaga (belum di HR)', fallbackWorkerId: worker.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan' };
    }
  }

  const slug = slugify(params.orgSlug || params.orgId.slice(0, 8));
  const stamp = Date.now().toString(36);
  const email = `worker+${slug}-${stamp}@workers.monefyi.local`;
  const password = randomPassword();

  try {
    const res = await directCreateMembers({
      org_id: params.orgId,
      items: [{
        name,
        email,
        password,
        phone: params.phone,
        role: params.role || 'worker',
      }],
    });

    const row = res.results?.[0];
    if (!row?.ok || !row.member_id) {
      return { ok: false, error: row?.error || 'Gagal menambah ke HR' };
    }

    const member: OrgMember = {
      id: row.member_id,
      org_id: params.orgId,
      user_id: row.user_id || '',
      role: (row.role as MemberRole) || 'worker',
      status: 'active',
      profile: { name: row.name || name },
      phone: row.phone,
    };

    return { ok: true, member, generatedPassword: password };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menambah ke HR' };
  }
}
