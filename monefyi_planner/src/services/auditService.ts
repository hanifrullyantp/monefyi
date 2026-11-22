import { DEMO_ORG_ID, isDemoEmbedActive, isDemoOrInvalidUuid, isUuid } from '../lib/demo/demoMode';
import { supabase } from '../lib/supabase';
import type { AuditLogEntry } from '../types/onboarding';

const LOCAL_AUDIT_KEY_PREFIX = 'monefyi_audit_logs_local_v1:';
const MAX_LOCAL_AUDIT_ENTRIES = 50;
const EDGE_CLIENT_DEDUPE_WINDOW_MS = 15_000;

/** Session-scoped flag flipped to false on 42501 / 403 / permission-denied so client never spams 403s. */
let auditInsertSupported = true;

/** In-memory projectId -> orgId cache for project-scoped services. */
const projectOrgCache = new Map<string, string>();

export interface LogAuditParams {
  orgId: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
  isDemoMode?: boolean;
}

export interface LogProjectAuditParams extends Omit<LogAuditParams, 'orgId'> {
  projectId: string;
  orgId?: string | null;
}

const ACTION_LABELS_ID: Record<string, string> = {
  // Project
  'project.created': 'Proyek dibuat',
  project_create: 'Proyek dibuat',
  'project.updated': 'Proyek diperbarui',
  project_update: 'Proyek diperbarui',
  'project.archived': 'Proyek diarsipkan',
  project_archive: 'Proyek diarsipkan',
  'project.restored': 'Proyek dipulihkan',
  project_restore: 'Proyek dipulihkan',
  'project.deleted': 'Proyek dihapus',
  project_delete: 'Proyek dihapus',

  // Cost & Income
  'cost.created': 'Biaya dicatat',
  cost_create: 'Biaya dicatat',
  'cost.updated': 'Biaya diperbarui',
  cost_update: 'Biaya diperbarui',
  'cost.deleted': 'Biaya dihapus',
  cost_delete: 'Biaya dihapus',
  'cost.bulk_deleted': 'Semua biaya proyek dihapus',
  'cost.rap_realization_set': 'Realisasi RAP dicatat',
  'cost.rap_realization_cleared': 'Realisasi RAP dibatalkan',
  'income.created': 'Pemasukan dicatat',
  income_create: 'Pemasukan dicatat',
  'income.deleted': 'Pemasukan dihapus',
  income_delete: 'Pemasukan dihapus',

  // RAP
  'rap.created': 'Item RAP ditambah',
  'rap_item.created': 'Item RAP ditambah',
  rap_create: 'Item RAP ditambah',
  'rap.updated': 'Item RAP diperbarui',
  'rap_item.updated': 'Item RAP diperbarui',
  rap_update: 'Item RAP diperbarui',
  'rap.deleted': 'Item RAP dihapus',
  'rap_item.deleted': 'Item RAP dihapus',
  rap_delete: 'Item RAP dihapus',
  'rap.duplicated': 'Item RAP diduplikasi',
  'rap.bulk_deleted': 'Semua item RAP dihapus',

  // Member, Role, Invite, Org
  'member.role_changed': 'Role anggota diubah',
  member_role_changed: 'Role anggota diubah',
  'member.removed': 'Anggota dinonaktifkan / dihapus',
  member_removed: 'Anggota dinonaktifkan / dihapus',
  'member.profile_updated': 'Profil anggota diperbarui',
  'member.direct_created': 'Akun anggota dibuat',
  'member.joined': 'Anggota bergabung',
  'member.domain_auto_join': 'Anggota gabung via domain',
  'invitation.created': 'Undangan dibuat',
  'invite.created': 'Undangan dibuat',
  'invitation.revoked': 'Undangan dicabut',
  'invite.revoked': 'Undangan dicabut',
  'join_request.approved': 'Permintaan gabung disetujui',
  'join_request.rejected': 'Permintaan gabung ditolak',
  'ownership.transferred': 'Kepemilikan dipindahkan',
  'org.created': 'Organisasi dibuat',
  'org.access_updated': 'Pengaturan akses diperbarui',
};

const ROLE_LABELS_ID: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Karyawan',
};

export function isAuditInsertSupported(): boolean {
  return auditInsertSupported;
}

export function resetAuditInsertSupportCache(supported = true): void {
  auditInsertSupported = supported;
}

export function rememberProjectOrg(projectId?: string | null, orgId?: string | null): void {
  if (projectId && orgId) {
    projectOrgCache.set(projectId, orgId);
  }
}

export function getLocalAuditStorageKey(orgId: string): string {
  return `${LOCAL_AUDIT_KEY_PREFIX}${orgId}`;
}

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; status?: number; message?: string; details?: string; hint?: string };
  const code = String(e.code || '').toUpperCase();
  if (code === '42501' || code === 'PGRST301') return true;
  if (Number(e.status) === 403 || Number(e.status) === 401) return true;
  const text = `${e.message || ''} ${e.details || ''} ${e.hint || ''}`.toLowerCase();
  return (
    text.includes('permission denied') ||
    text.includes('row-level security') ||
    text.includes('violates row-level security policy') ||
    text.includes('403')
  );
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readLocalAuditLogs(orgId: string): AuditLogEntry[] {
  if (!orgId) return [];
  const storage = getSafeLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(getLocalAuditStorageKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AuditLogEntry =>
        Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.action === 'string'),
    );
  } catch {
    return [];
  }
}

function writeLocalAuditLogs(orgId: string, entries: AuditLogEntry[]): void {
  if (!orgId) return;
  const storage = getSafeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(
      getLocalAuditStorageKey(orgId),
      JSON.stringify(entries.slice(0, MAX_LOCAL_AUDIT_ENTRIES)),
    );
  } catch {
    // Ignore storage quota or restricted-context errors.
  }
}

export function clearLocalAuditLogs(orgId: string): void {
  if (!orgId) return;
  const storage = getSafeLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(getLocalAuditStorageKey(orgId));
  } catch {
    // Ignore
  }
}

function appendLocalAuditLog(orgId: string, entry: AuditLogEntry): void {
  const existing = readLocalAuditLogs(orgId).filter(item => item.id !== entry.id);
  const next = [entry, ...existing].slice(0, MAX_LOCAL_AUDIT_ENTRIES);
  writeLocalAuditLogs(orgId, next);
}

async function getStoreRuntimeInfo(): Promise<{
  isDemoMode: boolean;
  userId?: string | null;
  userName?: string | null;
  tenantId?: string | null;
}> {
  try {
    const mod = await import('../store/appStore');
    const state = mod.useAppStore?.getState?.();
    if (!state) return { isDemoMode: false };
    return {
      isDemoMode: Boolean(state.isDemoMode || state.tenant?.id === 'demo'),
      userId: state.user?.id ?? null,
      userName: state.user?.name ?? null,
      tenantId: state.tenant?.id ?? null,
    };
  } catch {
    return { isDemoMode: false };
  }
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    if (!params?.orgId || !params?.action) return;

    const runtime = await getStoreRuntimeInfo();
    const demoMode = Boolean(params.isDemoMode || runtime.isDemoMode || isDemoEmbedActive());
    const skipRemote = demoMode || isDemoOrInvalidUuid(params.orgId, demoMode);

    const resolvedActorId = params.actorId ?? runtime.userId ?? null;
    const resolvedActorName = params.actorName ?? runtime.userName ?? null;
    const nowIso = new Date().toISOString();

    const metadata: Record<string, unknown> = {
      ...(params.metadata || {}),
    };
    if (resolvedActorName && metadata.actor_name === undefined) {
      metadata.actor_name = resolvedActorName;
    }
    if (params.targetType && metadata.target_type === undefined) {
      metadata.target_type = params.targetType;
    }
    if (params.targetId && metadata.target_id === undefined) {
      metadata.target_id = params.targetId;
    }

    const entryId = generateUuid();
    const localEntry: AuditLogEntry = {
      id: entryId,
      org_id: params.orgId,
      user_id: resolvedActorId ?? undefined,
      action: params.action,
      target_user_id: params.targetUserId ?? undefined,
      metadata,
      created_at: nowIso,
    };

    appendLocalAuditLog(params.orgId, localEntry);

    if (skipRemote || !auditInsertSupported) return;

    let dbUserId: string | null = isUuid(resolvedActorId) ? resolvedActorId : null;
    if (!dbUserId && typeof supabase?.auth?.getUser === 'function') {
      try {
        const { data } = await supabase.auth.getUser();
        if (isUuid(data?.user?.id)) {
          dbUserId = data.user.id;
        }
      } catch {
        // Ignore auth fallback errors.
      }
    }

    const dbTargetUserId = isUuid(params.targetUserId) ? params.targetUserId : null;

    const res = await supabase.from('planner_audit_logs').insert({
      id: entryId,
      org_id: params.orgId,
      user_id: dbUserId,
      action: params.action,
      target_user_id: dbTargetUserId,
      metadata,
      created_at: nowIso,
    });

    const errObj =
      res && typeof res === 'object' && 'error' in res
        ? (res as { error?: unknown }).error
        : null;
    const status =
      res && typeof res === 'object' && 'status' in res
        ? (res as { status?: number }).status
        : undefined;

    if (errObj || (typeof status === 'number' && status >= 400)) {
      if (status === 403 || status === 401 || isPermissionDeniedError(errObj)) {
        auditInsertSupported = false;
      }
    }
  } catch {
    // Audit logging must never throw or block parent mutations.
  }
}

export async function logProjectAudit(params: LogProjectAuditParams): Promise<void> {
  try {
    const { projectId, orgId: explicitOrgId, ...rest } = params;
    let orgId = explicitOrgId || (projectId ? projectOrgCache.get(projectId) : undefined) || null;

    if (!orgId && projectId) {
      const runtime = await getStoreRuntimeInfo();
      const demoMode = Boolean(params.isDemoMode || runtime.isDemoMode || isDemoEmbedActive());
      if (demoMode || isDemoOrInvalidUuid(projectId, demoMode)) {
        orgId = runtime.tenantId || (isDemoEmbedActive() ? DEMO_ORG_ID : 'demo');
      } else {
        try {
          const { data } = await supabase
            .from('planner_projects')
            .select('org_id')
            .eq('id', projectId)
            .maybeSingle();
          if (data?.org_id) {
            orgId = data.org_id as string;
            projectOrgCache.set(projectId, orgId);
          }
        } catch {
          // Fall back to active tenant below.
        }
        if (!orgId && runtime.tenantId) {
          orgId = runtime.tenantId;
        }
      }
    }

    if (!orgId) return;
    await logAudit({ ...rest, orgId });
  } catch {
    // Never throw or block parent mutations.
  }
}

function parseTimeMs(iso?: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function isEdgeVsClientDuplicate(dbEntry: AuditLogEntry, candidate: AuditLogEntry): boolean {
  if (dbEntry.action !== candidate.action) return false;
  const dbHasTargetType = Boolean(dbEntry.metadata?.target_type);
  const candidateHasTargetType = Boolean(candidate.metadata?.target_type);
  if (dbHasTargetType === candidateHasTargetType) return false;

  if (dbEntry.user_id && candidate.user_id && dbEntry.user_id !== candidate.user_id) {
    return false;
  }
  if (
    dbEntry.target_user_id &&
    candidate.target_user_id &&
    dbEntry.target_user_id !== candidate.target_user_id
  ) {
    return false;
  }

  const dbInvId = dbEntry.metadata?.invitation_id as string | undefined;
  const candInvId = (candidate.metadata?.invitation_id ?? candidate.metadata?.target_id) as string | undefined;
  if (dbInvId && candInvId && dbInvId !== candInvId) return false;

  return Math.abs(parseTimeMs(dbEntry.created_at) - parseTimeMs(candidate.created_at)) <= EDGE_CLIENT_DEDUPE_WINDOW_MS;
}

function mergeAuditEntries(dbLogs: AuditLogEntry[], localLogs: AuditLogEntry[]): AuditLogEntry[] {
  const byId = new Map<string, AuditLogEntry>();
  const orderedIds: string[] = [];

  for (const item of dbLogs) {
    if (!item?.id) continue;
    byId.set(item.id, item);
    orderedIds.push(item.id);
  }

  for (const local of localLogs) {
    if (!local?.id) continue;
    const existing = byId.get(local.id);
    if (existing) {
      byId.set(local.id, {
        ...local,
        ...existing,
        metadata: {
          ...(local.metadata || {}),
          ...(existing.metadata || {}),
        },
      });
      continue;
    }

    const edgePartnerId = orderedIds.find(id => {
      const dbEntry = byId.get(id);
      return dbEntry ? isEdgeVsClientDuplicate(dbEntry, local) : false;
    });

    if (edgePartnerId) {
      const dbEntry = byId.get(edgePartnerId)!;
      byId.set(edgePartnerId, {
        ...dbEntry,
        metadata: {
          ...(local.metadata || {}),
          ...(dbEntry.metadata || {}),
        },
      });
      continue;
    }

    byId.set(local.id, local);
    orderedIds.push(local.id);
  }

  // Also collapse edge-vs-client pairs if both were already inserted into DB.
  const finalList: AuditLogEntry[] = [];
  for (const id of orderedIds) {
    const entry = byId.get(id);
    if (!entry) continue;
    const duplicateIdx = finalList.findIndex(prev => isEdgeVsClientDuplicate(prev, entry));
    if (duplicateIdx >= 0) {
      const prev = finalList[duplicateIdx];
      finalList[duplicateIdx] = {
        ...prev,
        metadata: {
          ...(entry.metadata || {}),
          ...(prev.metadata || {}),
        },
      };
      continue;
    }
    finalList.push(entry);
  }

  return finalList.sort((a, b) => parseTimeMs(b.created_at) - parseTimeMs(a.created_at));
}

export async function listAuditLogs(orgId: string, limit = 100): Promise<AuditLogEntry[]> {
  if (!orgId) return [];

  const localLogs = readLocalAuditLogs(orgId);
  const runtime = await getStoreRuntimeInfo();
  const demoMode = runtime.isDemoMode || isDemoEmbedActive();

  if (demoMode || isDemoOrInvalidUuid(orgId, demoMode)) {
    return mergeAuditEntries([], localLogs).slice(0, limit);
  }

  let dbLogs: AuditLogEntry[] = [];
  try {
    const { data, error } = await supabase
      .from('planner_audit_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      dbLogs = data as AuditLogEntry[];
    }
  } catch {
    // Fall back to local ring buffer entries cleanly.
  }

  return mergeAuditEntries(dbLogs, localLogs).slice(0, limit);
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportAuditCsv(logs: AuditLogEntry[]): string {
  const header = 'created_at,action,user_id,target_user_id,metadata';
  const rows = logs.map(l =>
    [
      escapeCsvCell(l.created_at || ''),
      escapeCsvCell(l.action || ''),
      escapeCsvCell(l.user_id || ''),
      escapeCsvCell(l.target_user_id || ''),
      escapeCsvCell(JSON.stringify(l.metadata || {})),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function formatAuditTimestampId(
  isoString?: string | null,
  timeZone?: string,
): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);

  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(timeZone ? { timeZone } : {}),
    }).format(date);

    return formatted.replace(/\s+pukul\s+/i, ', ');
  } catch {
    return String(isoString);
  }
}

export function formatAuditActionLabel(action: string): string {
  const normalized = String(action || '').trim();
  if (!normalized) return 'Aktivitas sistem';

  const exact = ACTION_LABELS_ID[normalized];
  if (exact) return exact;

  const lower = normalized.toLowerCase();
  if (ACTION_LABELS_ID[lower]) return ACTION_LABELS_ID[lower];

  const readable = normalized
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!readable) return 'Aktivitas sistem';
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function formatRupiahCompact(value: unknown): string | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatAuditSummary(
  entry: AuditLogEntry,
  memberNamesByUserId: Record<string, string> = {},
): string {
  const meta = (entry.metadata || {}) as Record<string, unknown>;
  const actorName =
    (typeof meta.actor_name === 'string' && meta.actor_name.trim()) ||
    (entry.user_id && memberNamesByUserId[entry.user_id]) ||
    'Sistem';
  const targetUserName =
    (entry.target_user_id && memberNamesByUserId[entry.target_user_id]) || null;

  const details: string[] = [];

  if (typeof meta.name === 'string' && meta.name.trim()) {
    details.push(meta.name.trim());
  }
  if (typeof meta.description === 'string' && meta.description.trim()) {
    details.push(meta.description.trim());
  }

  const amountFormatted = formatRupiahCompact(meta.total_amount ?? meta.amount);
  if (amountFormatted) {
    details.push(amountFormatted);
  }

  if (typeof meta.new_role === 'string' && meta.new_role.trim()) {
    const roleText = ROLE_LABELS_ID[meta.new_role] || meta.new_role;
    details.push(targetUserName ? `${targetUserName} → ${roleText}` : `Role → ${roleText}`);
  } else if (targetUserName) {
    details.push(targetUserName);
  }

  if (typeof meta.email === 'string' && meta.email.trim()) {
    details.push(meta.email.trim());
  } else if (typeof meta.code === 'string' && meta.code.trim()) {
    details.push(`Kode ${meta.code.trim()}`);
  } else if (typeof meta.type === 'string' && entry.action.startsWith('invitation.')) {
    const typeLabel =
      meta.type === 'link' ? 'Link undangan' : meta.type === 'email' ? 'Undangan email' : 'Kode undangan';
    details.push(typeLabel);
  }

  if (details.length === 0 && Array.isArray(meta.fields) && meta.fields.length > 0) {
    details.push(`${meta.fields.length} kolom diubah`);
  }

  return details.length > 0 ? `${actorName} · ${details.join(' · ')}` : `Oleh ${actorName}`;
}
