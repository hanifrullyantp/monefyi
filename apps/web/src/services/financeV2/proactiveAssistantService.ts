import { supabase } from '../../lib/supabase';
import {
  approveAndDispatchCollectionDraft,
  buildCollectionMessageDraft,
  buildTenantProactiveReminders,
  runMultiTenantCronBatch,
  type BuildCollectionDraftInput,
  type BuildTenantRemindersOptions,
  type CollectionChannel,
  type CollectionDispatchRejectCode,
  type CollectionDraftStatus,
  type CollectionMessageDraft,
  type MultiTenantCronBatchResult,
  type ProactiveReminderItem,
  type ProactiveReminderSeverity,
  type ProactiveReminderType,
  type TenantCronBatchInput,
  type TenantProactiveReminderInput,
  type TenantProactiveRemindersResult,
} from '@domain/reminderScheduler';
import type { ClientRiskBand } from '@domain/proactiveFinance';

export interface FinanceReminderRecord {
  id: string;
  org_id: string;
  reminder_type: ProactiveReminderType;
  dedupe_key: string;
  severity: ProactiveReminderSeverity;
  entity_id: string;
  title: string;
  detail_json: Record<string, unknown>;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface CollectionDraftRecord {
  id: string;
  org_id: string;
  party_id: string;
  channel: CollectionChannel;
  subject: string;
  body: string;
  total_amount_rupiah: number;
  autonomy_level: 'L0' | 'L1' | 'L2' | 'L3';
  provenance_json: Record<string, unknown>;
  status: CollectionDraftStatus;
  created_by: string;
  approved_by: string | null;
  audit_log_id: string | null;
  dispatched_at: string | null;
  created_at: string;
}

export interface ProactiveAuditLogRecord {
  id: string;
  org_id: string;
  actor_id: string;
  actor_type: 'user' | 'agent' | 'cron' | 'system';
  action: string;
  target_table: string;
  target_id: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface RunTenantReminderCronInput {
  orgId: string;
  asOfDate: string;
  input: TenantProactiveReminderInput;
  options?: BuildTenantRemindersOptions;
  actorId?: string;
  persist?: boolean;
}

export interface RunTenantReminderCronResult {
  schedulerResult: TenantProactiveRemindersResult;
  insertedReminders: FinanceReminderRecord[];
  skippedDedupeKeys: string[];
  auditLog: ProactiveAuditLogRecord | null;
}

export interface CreateCollectionDraftResult {
  draft: CollectionMessageDraft;
  record: CollectionDraftRecord;
  auditLog: ProactiveAuditLogRecord;
}

export interface ApproveAndRecordCollectionDispatchInput {
  orgId: string;
  draftId: string;
  approvedBy: string;
  approvedAt: string;
  draft?: CollectionMessageDraft;
}

export type ApproveAndRecordCollectionDispatchResult =
  | {
      ok: true;
      draft: CollectionMessageDraft;
      record: CollectionDraftRecord;
      auditLog: ProactiveAuditLogRecord;
    }
  | {
      ok: false;
      code: CollectionDispatchRejectCode | 'draft_not_found';
      reason: string;
    };

function mapReminderRecord(row: Record<string, unknown>): FinanceReminderRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    reminder_type: row.reminder_type as ProactiveReminderType,
    dedupe_key: row.dedupe_key as string,
    severity: row.severity as ProactiveReminderSeverity,
    entity_id: row.entity_id as string,
    title: row.title as string,
    detail_json: (row.detail_json as Record<string, unknown>) || {},
    status: (row.status as FinanceReminderRecord['status']) || 'open',
    created_at: row.created_at as string,
  };
}

function mapCollectionDraftRecord(row: Record<string, unknown>): CollectionDraftRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    party_id: row.party_id as string,
    channel: row.channel as CollectionChannel,
    subject: row.subject as string,
    body: row.body as string,
    total_amount_rupiah: Number(row.total_amount_rupiah) || 0,
    autonomy_level: (row.autonomy_level as CollectionDraftRecord['autonomy_level']) || 'L1',
    provenance_json: (row.provenance_json as Record<string, unknown>) || {},
    status: row.status as CollectionDraftStatus,
    created_by: row.created_by as string,
    approved_by: (row.approved_by as string) || null,
    audit_log_id: (row.audit_log_id as string) || null,
    dispatched_at: (row.dispatched_at as string) || null,
    created_at: row.created_at as string,
  };
}

function mapAuditLogRecord(row: Record<string, unknown>): ProactiveAuditLogRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    actor_id: row.actor_id as string,
    actor_type: row.actor_type as ProactiveAuditLogRecord['actor_type'],
    action: row.action as string,
    target_table: row.target_table as string,
    target_id: row.target_id as string,
    payload_json: (row.payload_json as Record<string, unknown>) || {},
    created_at: row.created_at as string,
  };
}

function draftFromRecord(record: CollectionDraftRecord): CollectionMessageDraft {
  const prov = record.provenance_json || {};
  return {
    id: record.id,
    orgId: record.org_id,
    partyId: record.party_id,
    partyName: String(prov.partyName ?? record.party_id),
    channel: record.channel,
    subject: record.subject,
    body: record.body,
    totalAmountRupiah: record.total_amount_rupiah,
    riskBand: (prov.riskBand as ClientRiskBand) || 'medium',
    autonomyLevel: record.autonomy_level,
    status: record.status,
    autoSendAllowed: false,
    requiresHumanApproval: true,
    createdBy: record.created_by,
    approvedBy: record.approved_by,
    auditLogId: record.audit_log_id,
    dispatchedAt: record.dispatched_at,
    provenance: {
      orgId: record.org_id,
      partyId: record.party_id,
      channel: record.channel,
      riskBand: (prov.riskBand as ClientRiskBand) || 'medium',
      autonomyLevel: record.autonomy_level,
      invoiceCount: Number(prov.invoiceCount) || 0,
      invoiceIds: Array.isArray(prov.invoiceIds) ? (prov.invoiceIds as string[]) : [],
      invoiceNumbers: Array.isArray(prov.invoiceNumbers) ? (prov.invoiceNumbers as string[]) : [],
      invoiceAmountsRupiah: Array.isArray(prov.invoiceAmountsRupiah)
        ? (prov.invoiceAmountsRupiah as number[])
        : [],
      totalAmountRupiah: record.total_amount_rupiah,
      asOfDate: (prov.asOfDate as string) || null,
      builderVersion: 'deterministic_collection_draft_v1',
    },
  };
}

async function appendProactiveAuditLog(entry: {
  orgId: string;
  actorId: string;
  actorType: ProactiveAuditLogRecord['actor_type'];
  action: string;
  targetTable: string;
  targetId: string;
  payload: Record<string, unknown>;
}): Promise<ProactiveAuditLogRecord> {
  const { data, error } = await supabase
    .from('planner_proactive_audit_logs')
    .insert({
      org_id: entry.orgId,
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId,
      payload_json: entry.payload,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return mapAuditLogRecord((data || {}) as Record<string, unknown>);
}

/**
 * Menjalankan cron pengingat proaktif untuk tepat satu organisasi (`orgId`),
 * melakukan deduplikasi idempoten via `(org_id, dedupe_key)`, dan mencatat jejak audit cron.
 */
export async function runTenantReminderCron(
  params: RunTenantReminderCronInput,
): Promise<RunTenantReminderCronResult> {
  const schedulerResult = buildTenantProactiveReminders(
    params.orgId,
    params.input,
    params.asOfDate,
    params.options,
  );

  if (params.persist === false) {
    return {
      schedulerResult,
      insertedReminders: [],
      skippedDedupeKeys: [],
      auditLog: null,
    };
  }

  const reminders: ProactiveReminderItem[] = schedulerResult.reminders;
  const dedupeKeys = reminders.map((r) => r.dedupeKey);
  const existingKeys = new Set<string>();

  if (dedupeKeys.length > 0) {
    const { data: existingRows, error: existingErr } = await supabase
      .from('planner_finance_reminders')
      .select('dedupe_key')
      .eq('org_id', schedulerResult.orgId)
      .in('dedupe_key', dedupeKeys);

    if (existingErr) {
      throw new Error(existingErr.message);
    }
    for (const row of existingRows || []) {
      if (row.dedupe_key) existingKeys.add(row.dedupe_key as string);
    }
  }

  const skippedDedupeKeys: string[] = [];
  const toInsert: ProactiveReminderItem[] = [];
  for (const item of reminders) {
    if (existingKeys.has(item.dedupeKey)) {
      skippedDedupeKeys.push(item.dedupeKey);
    } else {
      toInsert.push(item);
    }
  }

  let insertedReminders: FinanceReminderRecord[] = [];
  if (toInsert.length > 0) {
    const payload = toInsert.map((item) => ({
      org_id: schedulerResult.orgId,
      reminder_type: item.reminderType,
      dedupe_key: item.dedupeKey,
      severity: item.severity,
      entity_id: item.entityId,
      title: item.title,
      detail_json: {
        ...item.detail,
        amount_rupiah: item.amountRupiah,
        provenance: item.provenance,
      },
      status: 'open',
    }));

    const { data: insertedData, error: insertErr } = await supabase
      .from('planner_finance_reminders')
      .insert(payload)
      .select('*');

    if (insertErr) {
      throw new Error(insertErr.message);
    }
    insertedReminders = (insertedData || []).map((row) =>
      mapReminderRecord(row as Record<string, unknown>),
    );
  }

  const auditLog = await appendProactiveAuditLog({
    orgId: schedulerResult.orgId,
    actorId: params.actorId || 'cron:proactive-reminders',
    actorType: 'cron',
    action: 'run_tenant_reminder_cron',
    targetTable: 'planner_finance_reminders',
    targetId: schedulerResult.orgId,
    payload: {
      asOfDate: schedulerResult.asOfDate,
      generatedCount: reminders.length,
      insertedCount: insertedReminders.length,
      skippedCount: skippedDedupeKeys.length,
      crossTenantRejectedCount: schedulerResult.crossTenantRejectedCount,
      countsByType: schedulerResult.countsByType,
    },
  });

  return {
    schedulerResult,
    insertedReminders,
    skippedDedupeKeys,
    auditLog,
  };
}

/**
 * Wrapper batch multitenant untuk memastikan eksekusi cron terisolasi penuh per `orgId`.
 */
export function runIsolatedMultiTenantCron(
  tenants: readonly TenantCronBatchInput[],
  asOfDate: string,
): MultiTenantCronBatchResult {
  return runMultiTenantCronBatch(tenants, asOfDate);
}

/**
 * Membuat draf pesan penagihan (WA / Email) deterministik, menyimpannya ke
 * `planner_collection_drafts`, dan mencatat jejak audit pembuatan draf.
 * Di L0 & L1 status selalu `pending_approval` & `autoSendAllowed: false`.
 */
export async function createCollectionDraft(
  input: BuildCollectionDraftInput,
): Promise<CreateCollectionDraftResult> {
  const draft = buildCollectionMessageDraft(input);

  const { data: insertedRow, error: insertErr } = await supabase
    .from('planner_collection_drafts')
    .insert({
      org_id: draft.orgId,
      party_id: draft.partyId,
      channel: draft.channel,
      subject: draft.subject,
      body: draft.body,
      total_amount_rupiah: draft.totalAmountRupiah,
      autonomy_level: draft.autonomyLevel,
      provenance_json: {
        ...draft.provenance,
        partyName: draft.partyName,
      },
      status: draft.status,
      created_by: draft.createdBy,
    })
    .select('*')
    .single();

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  const record = mapCollectionDraftRecord((insertedRow || {}) as Record<string, unknown>);
  const auditLog = await appendProactiveAuditLog({
    orgId: draft.orgId,
    actorId: draft.createdBy,
    actorType: 'user',
    action: 'create_collection_draft',
    targetTable: 'planner_collection_drafts',
    targetId: record.id,
    payload: {
      partyId: draft.partyId,
      channel: draft.channel,
      autonomyLevel: draft.autonomyLevel,
      totalAmountRupiah: draft.totalAmountRupiah,
      status: draft.status,
      provenance: draft.provenance,
    },
  });

  return {
    draft: {
      ...draft,
      id: record.id,
    },
    record,
    auditLog,
  };
}

/**
 * Menyetujui dan mencatat pengiriman draf penagihan dengan tiga penjaga wajib:
 * (1) Isolasi tenant (`orgId === draft.orgId`),
 * (2) Pemisahan wewenang / SoD (`approvedBy !== draft.createdBy`),
 * (3) Jejak audit append-only wajib terbentuk (`audit_log_id` non-kosong) sebelum status berubah ke `'dispatched'`.
 */
export async function approveAndRecordCollectionDispatch(
  input: ApproveAndRecordCollectionDispatchInput,
): Promise<ApproveAndRecordCollectionDispatchResult> {
  let targetDraft = input.draft;

  if (!targetDraft) {
    const { data: loadedRow, error: loadErr } = await supabase
      .from('planner_collection_drafts')
      .select('*')
      .eq('id', input.draftId)
      .eq('org_id', input.orgId)
      .single();

    if (loadErr || !loadedRow) {
      return {
        ok: false,
        code: 'draft_not_found',
        reason: loadErr?.message || 'Draf penagihan tidak ditemukan untuk organisasi ini.',
      };
    }

    targetDraft = draftFromRecord(mapCollectionDraftRecord(loadedRow as Record<string, unknown>));
  }

  // Validasi awal tenant + SoD + status sebelum menulis jejak audit dispatch
  const precheck = approveAndDispatchCollectionDraft(targetDraft, {
    orgId: input.orgId,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    auditLogId: 'precheck-pending-audit',
  });

  if (!precheck.ok) {
    return precheck;
  }

  const auditLog = await appendProactiveAuditLog({
    orgId: input.orgId,
    actorId: input.approvedBy,
    actorType: 'user',
    action: 'approve_and_dispatch_collection_draft',
    targetTable: 'planner_collection_drafts',
    targetId: input.draftId,
    payload: {
      partyId: targetDraft.partyId,
      channel: targetDraft.channel,
      totalAmountRupiah: targetDraft.totalAmountRupiah,
      createdBy: targetDraft.createdBy,
      approvedBy: input.approvedBy,
      approvedAt: input.approvedAt,
      provenance: targetDraft.provenance,
    },
  });

  const dispatchResult = approveAndDispatchCollectionDraft(targetDraft, {
    orgId: input.orgId,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    auditLogId: auditLog?.id ?? '',
  });

  if (!dispatchResult.ok) {
    return dispatchResult;
  }

  const { data: updatedRow, error: updateErr } = await supabase
    .from('planner_collection_drafts')
    .update({
      status: 'dispatched',
      approved_by: input.approvedBy,
      audit_log_id: auditLog.id,
      dispatched_at: dispatchResult.draft.dispatchedAt,
    })
    .eq('id', input.draftId)
    .eq('org_id', input.orgId)
    .select('*')
    .single();

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  const record = mapCollectionDraftRecord((updatedRow || {}) as Record<string, unknown>);
  return {
    ok: true,
    draft: {
      ...dispatchResult.draft,
      id: record.id || input.draftId,
    },
    record,
    auditLog,
  };
}
