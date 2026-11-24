import {
  authorizeAgentAction,
  type ActorRole,
  type AuthorizeRejectCode,
  type OrgAutonomyGovernancePolicy,
  type OrgDailyGovernanceUsage,
} from './autonomyGovernance';
import { toRupiah } from './journal';
import { firstRupiah, parseRupiah } from './money';
import {
  computeDeterministicSha256,
  detectPromptInjection,
  extractReceiptFields,
} from './receiptExtraction';

/**
 * Daftar kanonis 18 jenis aksi Manager Agent (paritas 1:1 dengan `ActionType` di `managerAgentService.ts`).
 */
export const UNIFIED_MANAGER_ACTION_TYPES = [
  'record_cost',
  'record_income',
  'record_transfer',
  'update_progress',
  'add_worker_log',
  'add_project',
  'add_rap_item',
  'add_work_item',
  'update_project_status',
  'review_bon',
  'assign_todo',
  'complete_todo',
  'generate_payroll',
  'add_employee',
  'record_attendance',
  'upsert_pricelist',
  'create_estimation',
  'convert_estimation',
] as const;

export type UnifiedManagerActionType = (typeof UNIFIED_MANAGER_ACTION_TYPES)[number];
export type UnifiedAgentRole = 'hrd' | 'pm' | 'finance';
export type UnifiedActionRiskLevel = 'read' | 'low_write' | 'high_risk';
export type InputModality = 'text' | 'voice_transcript' | 'photo_ocr';

export const PREPARE_TOKEN_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_UNIFIED_APPROVAL_THRESHOLD_RUPIAH = 5_000_000;

export type UnifiedActionSpec = {
  actionType: UnifiedManagerActionType;
  roles: readonly UnifiedAgentRole[];
  riskLevel: UnifiedActionRiskLevel;
  alwaysRequiresApproval: boolean;
  highRiskAboveThreshold?: boolean;
  minActorRole: ActorRole;
  description: string;
};

/**
 * Peta lengkap 18 aksi terpadu beserta peran terkait (`hrd`, `pm`, `finance`),
 * tingkat risiko, peran minimum, dan kebijakan persetujuan wajib manusia + SoD.
 */
export const UNIFIED_MANAGER_ACTIONS: Record<UnifiedManagerActionType, UnifiedActionSpec> = {
  record_cost: {
    actionType: 'record_cost',
    roles: ['finance', 'pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    highRiskAboveThreshold: true,
    minActorRole: 'worker',
    description: 'Catat pengeluaran / realisasi biaya proyek (wajib approval + SoD di atas ambang).',
  },
  record_income: {
    actionType: 'record_income',
    roles: ['finance'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    highRiskAboveThreshold: true,
    minActorRole: 'manager',
    description: 'Catat dana masuk / termin / DP klien (wajib approval + SoD di atas ambang).',
  },
  record_transfer: {
    actionType: 'record_transfer',
    roles: ['finance'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    highRiskAboveThreshold: true,
    minActorRole: 'manager',
    description: 'Transfer kas atau pinjaman antar proyek (selalu wajib approval manusia + SoD).',
  },
  update_progress: {
    actionType: 'update_progress',
    roles: ['pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'worker',
    description: 'Perbarui persentase progres fisik item pekerjaan lapangan.',
  },
  add_worker_log: {
    actionType: 'add_worker_log',
    roles: ['pm', 'hrd'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'worker',
    description: 'Catat log jumlah tukang/pekerja hadir harian di proyek.',
  },
  add_project: {
    actionType: 'add_project',
    roles: ['pm'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Buat proyek baru beserta target durasi dan nilai kontrak (selalu wajib approval + SoD).',
  },
  add_rap_item: {
    actionType: 'add_rap_item',
    roles: ['pm', 'finance'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    highRiskAboveThreshold: true,
    minActorRole: 'manager',
    description: 'Tambah pos anggaran RAP proyek (wajib approval + SoD di atas ambang).',
  },
  add_work_item: {
    actionType: 'add_work_item',
    roles: ['pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'manager',
    description: 'Tambah item pekerjaan ke jadwal Gantt proyek.',
  },
  update_project_status: {
    actionType: 'update_project_status',
    roles: ['pm'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Ubah status siklus hidup proyek (planning/active/on_hold/completed).',
  },
  review_bon: {
    actionType: 'review_bon',
    roles: ['hrd', 'finance'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Setujui atau tolak pengajuan kasbon karyawan/tukang (selalu wajib approval + SoD).',
  },
  assign_todo: {
    actionType: 'assign_todo',
    roles: ['hrd', 'pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'worker',
    description: 'Delegasikan tugas tim (todo) ke personel terkait.',
  },
  complete_todo: {
    actionType: 'complete_todo',
    roles: ['hrd', 'pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'worker',
    description: 'Tandai tugas tim (todo) selesai.',
  },
  generate_payroll: {
    actionType: 'generate_payroll',
    roles: ['hrd', 'finance'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Buat draf rekap gaji/payroll organisasi (selalu wajib approval + SoD).',
  },
  add_employee: {
    actionType: 'add_employee',
    roles: ['hrd'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Daftarkan karyawan/tukang baru ke organisasi HRD.',
  },
  record_attendance: {
    actionType: 'record_attendance',
    roles: ['hrd', 'pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    minActorRole: 'worker',
    description: 'Catat absensi masuk/pulang personel di proyek.',
  },
  upsert_pricelist: {
    actionType: 'upsert_pricelist',
    roles: ['finance', 'pm'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    highRiskAboveThreshold: true,
    minActorRole: 'manager',
    description: 'Tambah atau perbarui harga master material/upah di database pricelist.',
  },
  create_estimation: {
    actionType: 'create_estimation',
    roles: ['pm', 'finance'],
    riskLevel: 'low_write',
    alwaysRequiresApproval: false,
    highRiskAboveThreshold: true,
    minActorRole: 'manager',
    description: 'Buat draf estimasi RAB baru untuk calon klien.',
  },
  convert_estimation: {
    actionType: 'convert_estimation',
    roles: ['pm', 'finance'],
    riskLevel: 'high_risk',
    alwaysRequiresApproval: true,
    minActorRole: 'manager',
    description: 'Konversi estimasi RAB menjadi proyek aktif (selalu wajib approval + SoD).',
  },
};

export type UnifiedGatewayPolicy = OrgAutonomyGovernancePolicy & {
  approvalThresholdRupiah?: number;
};

export type UnifiedDailyUsage = OrgDailyGovernanceUsage;

export type SingleDoorInput = {
  modality: InputModality;
  rawText: string;
  orgId: string;
  actorId: string;
  actorRole: ActorRole;
  attachmentHash?: string;
  projectHint?: string;
  nowMs?: number;
};

export type PreparedActionRequest = {
  orgId: string;
  actorId: string;
  actorRole: ActorRole;
  actionType: UnifiedManagerActionType;
  roles: UnifiedAgentRole[];
  modality: InputModality;
  rawText: string;
  params: Record<string, unknown>;
  amountRupiah: number;
  summary?: string;
  attachmentHash?: string;
  idempotencyKey?: string;
  estimatedTokens?: number;
  estimatedCostRupiah?: number;
  requiresApproval?: boolean;
  nowMs?: number;
};

export type RouteSingleDoorResult =
  | {
      ok: true;
      modality: InputModality;
      orgId: string;
      actorId: string;
      triggeredRoles: UnifiedAgentRole[];
      candidates: PreparedActionRequest[];
      inferredProjectName?: string;
    }
  | {
      ok: false;
      code: 'prompt_injection_detected' | 'invalid_input' | 'no_action_detected';
      reason: string;
      modality: InputModality;
      orgId: string;
      actorId: string;
      triggeredRoles: UnifiedAgentRole[];
      candidates: [];
      injectionHits?: string[];
    };

export type UnifiedAuditDraft = {
  orgId: string;
  actorId: string;
  actorRole: ActorRole;
  actionType: UnifiedManagerActionType;
  roles: UnifiedAgentRole[];
  riskLevel: UnifiedActionRiskLevel;
  modality: InputModality;
  prepareToken: string;
  idempotencyKey: string;
  amountRupiah: number;
  requiresApproval: boolean;
  attachmentHash: string | null;
  preparedAt: string;
  expiresAt: string;
  status: 'prepared_not_committed';
};

export type UnifiedCommitAuditRecord = {
  orgId: string;
  actorId: string;
  approvedBy: string | null;
  prepareToken: string;
  idempotencyKey: string;
  actionType: UnifiedManagerActionType;
  roles: UnifiedAgentRole[];
  riskLevel: UnifiedActionRiskLevel;
  modality: InputModality;
  amountRupiah: number;
  committedAt: string;
};

export type CommittedActionResult = {
  ok: true;
  duplicate: boolean;
  code: 'committed' | 'duplicate_commit_prevented';
  executed: boolean;
  reason: string;
  orgId: string;
  actionType: UnifiedManagerActionType;
  roles: UnifiedAgentRole[];
  prepareToken: string;
  idempotencyKey: string;
  committedAt: string;
  summary: string;
  params: Record<string, unknown>;
  auditRecord: UnifiedCommitAuditRecord;
  previousResult?: CommittedActionResult;
};

export type PreparedUnifiedActionRecord = {
  prepareToken: string;
  idempotencyKey: string;
  orgId: string;
  actorId: string;
  actorRole: ActorRole;
  actionType: UnifiedManagerActionType;
  roles: UnifiedAgentRole[];
  riskLevel: UnifiedActionRiskLevel;
  modality: InputModality;
  rawText: string;
  params: Record<string, unknown>;
  amountRupiah: number;
  requiresApproval: boolean;
  summary: string;
  attachmentHash?: string;
  preparedAt: string;
  preparedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  auditDraft: UnifiedAuditDraft;
  committedResult?: CommittedActionResult;
};

export type PreparedActionStore =
  | Map<string, PreparedUnifiedActionRecord>
  | Record<string, PreparedUnifiedActionRecord>;

export type PrepareRejectCode =
  | AuthorizeRejectCode
  | 'prompt_injection_detected'
  | 'unknown_action_type'
  | 'invalid_prepare_request';

export type PrepareUnifiedActionResult =
  | {
      ok: true;
      status: 'prepared';
      written: false;
      prepareToken: string;
      idempotencyKey: string;
      expiresAt: string;
      expiresAtMs: number;
      requiresApproval: boolean;
      riskLevel: UnifiedActionRiskLevel;
      roles: UnifiedAgentRole[];
      summary: string;
      auditDraft: UnifiedAuditDraft;
      preparedRecord: PreparedUnifiedActionRecord;
    }
  | {
      ok: false;
      status: 'rejected';
      written: false;
      code: PrepareRejectCode;
      reason: string;
      injectionHits?: string[];
    };

export type CommitUnifiedActionRequest = {
  prepareToken: string;
  idempotencyKey?: string;
  orgId: string;
  approvedBy?: string | null;
  approverRole?: ActorRole | null;
  nowMs?: number;
};

export type CommitRejectCode =
  | AuthorizeRejectCode
  | 'invalid_or_expired_prepare_token'
  | 'prompt_injection_detected';

export type CommitUnifiedActionResult =
  | CommittedActionResult
  | {
      ok: false;
      duplicate: false;
      executed: false;
      code: CommitRejectCode;
      reason: string;
      injectionHits?: string[];
    };

export function isUnifiedManagerActionType(value: string): value is UnifiedManagerActionType {
  return Object.prototype.hasOwnProperty.call(UNIFIED_MANAGER_ACTIONS, value);
}

/**
 * Menentukan tingkat risiko efektif dan apakah persetujuan manusia + SoD wajib
 * berdasarkan spesifikasi aksi dan nominal terhadap ambang batas.
 */
export function resolveEffectiveActionPolicy(
  actionType: UnifiedManagerActionType,
  amountRupiah: number,
  policy: Pick<UnifiedGatewayPolicy, 'autonomyLevel' | 'approvalThresholdRupiah' | 'outboundHighRiskThresholdRupiah'>,
  requestedRequiresApproval?: boolean,
): {
  spec: UnifiedActionSpec;
  riskLevel: UnifiedActionRiskLevel;
  requiresApproval: boolean;
  isHighRisk: boolean;
} {
  const spec = UNIFIED_MANAGER_ACTIONS[actionType];
  const threshold = Math.max(
    0,
    toRupiah(
      policy.approvalThresholdRupiah
        ?? policy.outboundHighRiskThresholdRupiah
        ?? DEFAULT_UNIFIED_APPROVAL_THRESHOLD_RUPIAH,
    ),
  );
  const normalizedAmount = Math.max(0, toRupiah(amountRupiah));
  const aboveThreshold = Boolean(spec.highRiskAboveThreshold && normalizedAmount > threshold);
  const isHighRisk = spec.riskLevel === 'high_risk' || aboveThreshold;
  const riskLevel: UnifiedActionRiskLevel = isHighRisk ? 'high_risk' : spec.riskLevel;
  const requiresApproval =
    spec.alwaysRequiresApproval
    || aboveThreshold
    || Boolean(requestedRequiresApproval)
    || policy.autonomyLevel !== 'L2';

  return {
    spec,
    riskLevel,
    requiresApproval,
    isHighRisk,
  };
}

function parseFlexibleRupiah(fragment: string): number {
  const cleaned = String(fragment ?? '').trim();
  if (!cleaned) return 0;
  const miliarMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(?:miliar|m)\b/i);
  if (miliarMatch) {
    const val = Number(miliarMatch[1].replace(',', '.'));
    return Number.isFinite(val) && val > 0 ? Math.round(val * 1_000_000_000) : 0;
  }
  const direct = parseRupiah(cleaned);
  if (direct.ok && direct.amount > 0) return direct.amount;
  const first = firstRupiah(cleaned);
  return first.ok && first.amount > 0 ? first.amount : 0;
}

function normalizeNaturalText(rawText: string): string {
  return String(rawText ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/(\d{1,3})\s*persen\b/gi, '$1%')
    .trim();
}

function splitClauses(normalizedText: string): string[] {
  return normalizedText
    .split(
      /(?:,\s+(?=[a-zA-Z0-9])|;\s*|\n+|\s+(?:lalu|terus|kemudian|serta|dan\s+juga)\s+|\s+sama\s+(?=(?:tukang|karyawan|absen|beli|bayar|catat|update|ubah|pasang|buat|tambah|terima|transfer|setujui|tolak|tugaskan|selesaikan|rekap|generate)\b))/i,
    )
    .map((c) => c.trim())
    .filter(Boolean);
}

function cleanProjectPhrase(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/^(?:di\s+)?(?:proyek|project|lokasi|site)\s+/i, '')
    .trim();
  return cleaned || undefined;
}

function pushCandidate(
  out: PreparedActionRequest[],
  input: SingleDoorInput,
  actionType: UnifiedManagerActionType,
  params: Record<string, unknown>,
  amountRupiah: number,
  summary: string,
): void {
  const spec = UNIFIED_MANAGER_ACTIONS[actionType];
  out.push({
    orgId: input.orgId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType,
    roles: [...spec.roles],
    modality: input.modality,
    rawText: input.rawText,
    params,
    amountRupiah: Math.max(0, toRupiah(amountRupiah)),
    summary,
    ...(input.attachmentHash ? { attachmentHash: input.attachmentHash } : {}),
    ...(input.nowMs !== undefined ? { nowMs: input.nowMs } : {}),
  });
}

function collectTriggeredRoles(candidates: readonly PreparedActionRequest[]): UnifiedAgentRole[] {
  const ordered: UnifiedAgentRole[] = [];
  for (const candidate of candidates) {
    for (const role of candidate.roles) {
      if (!ordered.includes(role)) ordered.push(role);
    }
  }
  return ordered;
}

/**
 * Gerbang Satu Pintu Input (ketik / transkrip suara / OCR foto).
 * Mendeteksi prompt injection terlebih dahulu, lalu mengurai perintah majemuk
 * menjadi kandidat aksi lintas peran (`hrd`, `pm`, `finance`) tanpa pengguna memilih modul.
 */
export function routeSingleDoorInput(input: SingleDoorInput): RouteSingleDoorResult {
  const orgId = String(input.orgId ?? '').trim();
  const actorId = String(input.actorId ?? '').trim();
  const rawText = String(input.rawText ?? '');

  if (!orgId || !actorId || !rawText.trim()) {
    return {
      ok: false,
      code: 'invalid_input',
      reason: 'orgId, actorId, dan rawText wajib diisi.',
      modality: input.modality,
      orgId,
      actorId,
      triggeredRoles: [],
      candidates: [],
    };
  }

  const injectionHits = detectPromptInjection(rawText);
  if (injectionHits.length > 0) {
    return {
      ok: false,
      code: 'prompt_injection_detected',
      reason: `Input ditolak karena mengandung pola prompt injection (${injectionHits[0]}).`,
      modality: input.modality,
      orgId,
      actorId,
      triggeredRoles: [],
      candidates: [],
      injectionHits,
    };
  }

  const normalized = normalizeNaturalText(rawText);
  const candidates: PreparedActionRequest[] = [];
  let inferredProjectName: string | undefined = cleanProjectPhrase(input.projectHint);

  const isPureReceiptOcr =
    input.modality === 'photo_ocr'
    && /\n/.test(normalized)
    && /(?:grand\s*total|subtotal|sub\s*total|total\s*(?:bayar|tagihan|belanja|rp)|kwitansi|faktur|struk|nota)/i.test(normalized)
    && !/(?:tukang|absen|pasang|progres|kasbon|payroll|tugas)/i.test(normalized);

  if (isPureReceiptOcr) {
    const receipt = extractReceiptFields(normalized);
    if (receipt.detectedInjectionSegments.length > 0) {
      return {
        ok: false,
        code: 'prompt_injection_detected',
        reason: `Input OCR ditolak karena mengandung instruksi mencurigakan (${receipt.detectedInjectionSegments[0]}).`,
        modality: input.modality,
        orgId,
        actorId,
        triggeredRoles: [],
        candidates: [],
        injectionHits: receipt.detectedInjectionSegments,
      };
    }
    const receiptTotal = receipt.totalAmount ?? 0;
    if (receiptTotal > 0) {
      const itemLabel =
        receipt.items[0]?.name
        || receipt.supplierName
        || 'Pembelian Nota OCR';
      pushCandidate(
        candidates,
        input,
        'record_cost',
        {
          ...(inferredProjectName ? { project: inferredProjectName } : {}),
          item: itemLabel,
          total: receiptTotal,
          supplier: receipt.supplierName,
          attachmentHash: input.attachmentHash ?? receipt.contentHash,
        },
        receiptTotal,
        `Catat biaya nota OCR "${itemLabel}" sebesar Rp ${receiptTotal.toLocaleString('id-ID')}`,
      );
      return {
        ok: true,
        modality: input.modality,
        orgId,
        actorId,
        triggeredRoles: collectTriggeredRoles(candidates),
        candidates,
        ...(inferredProjectName ? { inferredProjectName } : {}),
      };
    }
  }

  const clauses = splitClauses(normalized);

  for (const clause of clauses) {
    // 1. Absensi tukang / karyawan: "tukang Budi masuk Ruko Bu Ana", "absen Budi pulang", "Budi masuk proyek X"
    const workerEntryMatch =
      clause.match(
        /^(?:tolong\s+)?(?:catat\s+)?(?:tukang|karyawan|pekerja|mandor|staf|staff)\s+([a-zA-Z0-9 ._-]+?)\s+(masuk|hadir|pulang|keluar)(?:\s+(?:di\s+)?(?:proyek\s+|project\s+)?(.+))?$/i,
      )
      || clause.match(
        /^(?:tolong\s+)?(?:absen(?:kan|si)?|catat\s+hadir)\s+([a-zA-Z0-9 ._-]+?)(?:\s+(masuk|pulang|keluar|hadir))?(?:\s+(?:di\s+)?(?:proyek\s+|project\s+)?(.+))?$/i,
      );
    if (workerEntryMatch && !/\d+\s*(?:orang|tukang|pekerja)/i.test(clause)) {
      const empName = workerEntryMatch[1].trim();
      const direction = workerEntryMatch[2] || 'masuk';
      const attType = /pulang|keluar/i.test(direction) ? 'check_out' : 'check_in';
      const proj = cleanProjectPhrase(workerEntryMatch[3]) ?? inferredProjectName;
      if (proj && !inferredProjectName) inferredProjectName = proj;
      pushCandidate(
        candidates,
        input,
        'record_attendance',
        {
          employee: empName,
          type: attType,
          ...(proj ? { project: proj } : {}),
        },
        0,
        `Catat absensi ${attType === 'check_in' ? 'masuk' : 'pulang'} ${empName}${proj ? ` (${proj})` : ''}`,
      );
      continue;
    }

    // 2. Log jumlah pekerja lapangan: "hadir 6 tukang", "6 tukang masuk"
    const workerLogMatch =
      clause.match(/(?:hadir|masuk|log\s+pekerja)\s+(\d+)\s*(?:orang|pekerja|tukang)/i)
      || clause.match(/(\d+)\s*(?:orang|pekerja|tukang)\s+(?:hadir|masuk)/i);
    if (workerLogMatch) {
      const workers = Number(workerLogMatch[1]) || 0;
      if (workers > 0) {
        pushCandidate(
          candidates,
          input,
          'add_worker_log',
          {
            workers,
            ...(inferredProjectName ? { project: inferredProjectName } : {}),
          },
          0,
          `Catat log ${workers} tukang hadir${inferredProjectName ? ` di ${inferredProjectName}` : ''}`,
        );
        continue;
      }
    }

    // 3. Review kasbon
    if (/\b(?:kasbon|bon)\b/i.test(clause) && /(?:setuju|approve|acc|tolak|reject)/i.test(clause)) {
      const approve = /(?:setuju|approve|acc)/i.test(clause) && !/tolak|reject/i.test(clause);
      const bonRefMatch = clause.match(/\b(B\d+)\b/i);
      const amtMatch = clause.match(/(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)\s*$/i);
      const amount = amtMatch ? parseFlexibleRupiah(amtMatch[1]) : 0;
      pushCandidate(
        candidates,
        input,
        'review_bon',
        {
          bon: bonRefMatch ? bonRefMatch[1].toUpperCase() : 'B1',
          decision: approve ? 'approve' : 'reject',
          ...(amount > 0 ? { amount } : {}),
        },
        amount,
        `${approve ? 'Setujui' : 'Tolak'} pengajuan kasbon`,
      );
      continue;
    }

    // 4. Generate payroll
    if (/(?:buat|generate|hitung|rekap)\s+(?:draf\s+)?(?:slip\s+)?(?:payroll|gaji)/i.test(clause)) {
      pushCandidate(
        candidates,
        input,
        'generate_payroll',
        {},
        0,
        'Generate draf rekap payroll karyawan',
      );
      continue;
    }

    // 5. Tambah proyek baru
    const addProjMatch = clause.match(/^(?:tolong\s+)?(?:buat|tambah|buka)\s+proyek(?:\s+baru)?\s+(.+)$/i);
    if (addProjMatch && !/^(?:item\s+)?(?:rap|pekerjaan|tugas)\b/i.test(addProjMatch[1].trim())) {
      const projRaw = addProjMatch[1].trim();
      const contractMatch = projRaw.match(/(?:nilai\s+kontrak|kontrak)\s+(\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?)/i);
      const contractValue = contractMatch ? parseFlexibleRupiah(contractMatch[1]) : 0;
      const projName = projRaw
        .replace(/(?:nilai\s+kontrak|kontrak)\s+\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?/i, '')
        .replace(/\bklien\s+.+$/i, '')
        .trim();
      if (projName) {
        if (!inferredProjectName) inferredProjectName = projName;
        pushCandidate(
          candidates,
          input,
          'add_project',
          {
            name: projName,
            ...(contractValue > 0 ? { contract_value: contractValue } : {}),
          },
          contractValue,
          `Buat proyek baru "${projName}"`,
        );
        continue;
      }
    }

    // 6. Konversi estimasi jadi proyek
    if (/(?:konversi|jadikan\s+proyek)\s+estimasi/i.test(clause)) {
      const estCode = clause.match(/\b(EST\d+)\b/i)?.[1]?.toUpperCase() || 'EST1';
      pushCandidate(
        candidates,
        input,
        'convert_estimation',
        { estimation: estCode },
        0,
        `Konversi estimasi ${estCode} menjadi proyek aktif`,
      );
      continue;
    }

    // 7. Buat estimasi RAB
    const estMatch = clause.match(/(?:buat|bikin|siapkan)\s+estimasi\s+(.+)/i);
    if (estMatch) {
      pushCandidate(
        candidates,
        input,
        'create_estimation',
        { title: estMatch[1].trim() },
        0,
        `Buat estimasi RAB "${estMatch[1].trim()}"`,
      );
      continue;
    }

    // 8. Penerimaan dana / termin / DP
    const incomeMatch = clause.match(
      /(?:catat\s+)?(?:uang\s+masuk|dana\s+masuk|terima\s+(?:dp|termin|pelunasan|pembayaran)|masuk\s+(?:dp|termin|pelunasan))\s*(.*?)\s+(\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?)/i,
    );
    if (incomeMatch) {
      const amount = parseFlexibleRupiah(incomeMatch[2]);
      if (amount > 0) {
        const category = /dp/i.test(clause)
          ? 'dp'
          : /pelunasan/i.test(clause)
            ? 'pelunasan'
            : /retensi/i.test(clause)
              ? 'retensi'
              : 'termin';
        pushCandidate(
          candidates,
          input,
          'record_income',
          {
            ...(inferredProjectName ? { project: inferredProjectName } : {}),
            amount,
            category,
            description: incomeMatch[1]?.trim() || 'Penerimaan klien',
          },
          amount,
          `Catat dana masuk (${category}) Rp ${amount.toLocaleString('id-ID')}`,
        );
        continue;
      }
    }

    // 9. Transfer antar proyek
    const transferMatch = clause.match(/transfer\s+(?:kas\s+)?(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?)$/i);
    if (transferMatch) {
      const amount = parseFlexibleRupiah(transferMatch[2]);
      if (amount > 0) {
        pushCandidate(
          candidates,
          input,
          'record_transfer',
          {
            description: transferMatch[1].trim(),
            amount,
          },
          amount,
          `Catat transfer kas Rp ${amount.toLocaleString('id-ID')}`,
        );
        continue;
      }
    }

    // 10. Tambah karyawan
    const empMatch = clause.match(/(?:tambah|rekrut|daftarkan)\s+(?:karyawan|tukang|anggota|staf|staff)\s+([a-zA-Z0-9 ._-]+)/i);
    if (empMatch) {
      const name = empMatch[1].trim();
      pushCandidate(
        candidates,
        input,
        'add_employee',
        { name, role: /staf|staff/i.test(clause) ? 'staff' : 'worker' },
        0,
        `Daftarkan personel baru "${name}"`,
      );
      continue;
    }

    // 11. Tugas tim: complete / assign
    const doneTodoMatch = clause.match(/(?:selesaikan|tandai\s+selesai|bereskan)\s+tugas\s+(.+)/i);
    if (doneTodoMatch) {
      pushCandidate(
        candidates,
        input,
        'complete_todo',
        { todo: doneTodoMatch[1].trim() },
        0,
        `Tandai tugas "${doneTodoMatch[1].trim()}" selesai`,
      );
      continue;
    }

    const todoMatch = clause.match(/(?:tugaskan|buat\s+tugas|delegasikan|todo)\s+(?:ke\s+([a-zA-Z0-9]+)\s+(?:untuk\s+)?)?(.+)/i);
    if (todoMatch) {
      const assignee = todoMatch[1]?.trim();
      const title = todoMatch[2].trim();
      pushCandidate(
        candidates,
        input,
        'assign_todo',
        {
          ...(inferredProjectName ? { project: inferredProjectName } : {}),
          title,
          ...(assignee ? { assignee } : {}),
        },
        0,
        `Delegasikan tugas "${title}"${assignee ? ` ke ${assignee}` : ''}`,
      );
      continue;
    }

    // 12. Update status proyek
    const statusMatch = clause.match(/(?:update|ubah)\s+status\s+proyek\s+(?:(.+?)\s+)?(?:jadi|ke|menjadi)\s+(planning|active|on_hold|completed|archived)/i);
    if (statusMatch) {
      const proj = cleanProjectPhrase(statusMatch[1]) ?? inferredProjectName;
      const status = statusMatch[2].toLowerCase();
      pushCandidate(
        candidates,
        input,
        'update_project_status',
        { ...(proj ? { project: proj } : {}), status },
        0,
        `Ubah status proyek menjadi ${status}`,
      );
      continue;
    }

    // 13. Tambah item RAP / work item
    const rapMatch = clause.match(/(?:tambah|masukkan)\s+(?:item\s+)?rap\s+(.+?)\s+(\d+)\s*([a-zA-Z0-9]+)?\s*(?:@|harga|senilai)?\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i);
    if (rapMatch) {
      const name = rapMatch[1].trim();
      const qty = Number(rapMatch[2]) || 1;
      const unit = (rapMatch[3] || 'ls').trim();
      const unitPrice = parseFlexibleRupiah(rapMatch[4]);
      const total = qty * unitPrice;
      if (total > 0) {
        pushCandidate(
          candidates,
          input,
          'add_rap_item',
          {
            ...(inferredProjectName ? { project: inferredProjectName } : {}),
            name,
            qty,
            unit,
            unitPrice,
          },
          total,
          `Tambah item RAP "${name}" senilai Rp ${total.toLocaleString('id-ID')}`,
        );
        continue;
      }
    }

    const wiMatch = clause.match(/(?:tambah|buat)\s+(?:item\s+)?(?:pekerjaan|jadwal)\s+["']?([^,"'\n]+)["']?/i);
    if (wiMatch) {
      pushCandidate(
        candidates,
        input,
        'add_work_item',
        {
          ...(inferredProjectName ? { project: inferredProjectName } : {}),
          name: wiMatch[1].trim(),
        },
        0,
        `Tambah item jadwal pekerjaan "${wiMatch[1].trim()}"`,
      );
      continue;
    }

    // 14. Update pricelist
    const priceMatch = clause.match(/(?:update|ubah|tambah)\s+harga\s+(?:master|pricelist|material)?\s*(.+?)\s+(?:jadi|ke|@)?\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i);
    if (priceMatch) {
      const baseCost = parseFlexibleRupiah(priceMatch[2]);
      if (baseCost > 0) {
        pushCandidate(
          candidates,
          input,
          'upsert_pricelist',
          { name: priceMatch[1].trim(), baseCost },
          baseCost,
          `Perbarui harga master "${priceMatch[1].trim()}"`,
        );
        continue;
      }
    }

    // 15. Catat biaya / beli material (termasuk qty x harga atau nominal langsung)
    const costQtyMatch = clause.match(
      /(?:catat|beli|bayar|keluar(?:kan)?)\s+(?:biaya\s+)?(.+?)\s+(\d+)\s*([a-zA-Z]+)?\s*(?:@|x|kali)\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i,
    );
    if (costQtyMatch) {
      const item = costQtyMatch[1].trim();
      const qty = Number(costQtyMatch[2]) || 1;
      const unit = (costQtyMatch[3] || 'pcs').trim();
      const unitPrice = parseFlexibleRupiah(costQtyMatch[4]);
      const total = qty * unitPrice;
      if (total > 0) {
        pushCandidate(
          candidates,
          input,
          'record_cost',
          {
            ...(inferredProjectName ? { project: inferredProjectName } : {}),
            item,
            qty,
            unit,
            unitPrice,
            total,
          },
          total,
          `Catat biaya "${item}" (${qty} ${unit} = Rp ${total.toLocaleString('id-ID')})`,
        );
        continue;
      }
    }

    const costSimpleMatch = clause.match(
      /(?:catat|beli|bayar|pengeluaran)\s+(?:biaya\s+)?(.+?)\s+(?:rp\.?\s*)?(\d+(?:[.,]\d+)?(?:\.\d{3})*\s*(?:miliar|m|juta|jt|ribu|rb|k)?)(?:\s+(?:di\s+)?(?:proyek|untuk)\s+(.+))?$/i,
    );
    if (costSimpleMatch && !/uang\s+masuk|dana\s+masuk|termin|dp\b/i.test(clause)) {
      const item = costSimpleMatch[1].replace(/\b(?:di\s+)?proyek\s+.*/i, '').trim();
      const amount = parseFlexibleRupiah(costSimpleMatch[2]);
      const proj = cleanProjectPhrase(costSimpleMatch[3]) ?? inferredProjectName;
      if (proj && !inferredProjectName) inferredProjectName = proj;
      if (amount > 0 && item) {
        pushCandidate(
          candidates,
          input,
          'record_cost',
          {
            ...(proj ? { project: proj } : {}),
            item,
            total: amount,
          },
          amount,
          `Catat biaya "${item}" Rp ${amount.toLocaleString('id-ID')}${proj ? ` (${proj})` : ''}`,
        );
        continue;
      }
    }

    // 16. Update progres pekerjaan lapangan (baik "update progres X 50%" maupun "pasang bata 50%")
    const explicitProgMatch = clause.match(
      /(?:update|ubah|naikkan|catat)\s+progres(?:s)?\s+(.+?)\s+(?:jadi|ke|menjadi|sebesar)?\s*(\d{1,3})\s*%/i,
    );
    const naturalProgMatch = !explicitProgMatch
      ? clause.match(/^(?:pekerjaan\s+)?([a-zA-Z][a-zA-Z0-9\s._-]{1,60}?)\s+(?:sudah\s+|jadi\s+|ke\s+)?(\d{1,3})\s*%(?:\s+(?:di\s+)?(?:proyek\s+)?(.+))?$/i)
      : null;

    if (explicitProgMatch) {
      const workItem = explicitProgMatch[1].replace(/\bdi\s+proyek\s+.*/i, '').trim();
      const pct = Math.min(100, Math.max(0, Number(explicitProgMatch[2]) || 0));
      pushCandidate(
        candidates,
        input,
        'update_progress',
        {
          ...(inferredProjectName ? { project: inferredProjectName } : {}),
          workItem,
          progress: pct,
        },
        0,
        `Update progres "${workItem}" menjadi ${pct}%`,
      );
      continue;
    }

    if (naturalProgMatch && !/\b(?:naik|turun|margin|ppn|pajak|diskon|bunga|kenaikan)\b/i.test(naturalProgMatch[1])) {
      const workItem = naturalProgMatch[1].trim();
      const pct = Math.min(100, Math.max(0, Number(naturalProgMatch[2]) || 0));
      const proj = cleanProjectPhrase(naturalProgMatch[3]) ?? inferredProjectName;
      if (proj && !inferredProjectName) inferredProjectName = proj;
      pushCandidate(
        candidates,
        input,
        'update_progress',
        {
          ...(proj ? { project: proj } : {}),
          workItem,
          progress: pct,
        },
        0,
        `Update progres "${workItem}" menjadi ${pct}%${proj ? ` (${proj})` : ''}`,
      );
      continue;
    }
  }

  // Fallback OCR bila masih kosong dan input adalah photo_ocr
  if (candidates.length === 0 && input.modality === 'photo_ocr') {
    const receipt = extractReceiptFields(normalized);
    if (receipt.detectedInjectionSegments.length > 0) {
      return {
        ok: false,
        code: 'prompt_injection_detected',
        reason: `Input OCR ditolak karena mengandung pola prompt injection (${receipt.detectedInjectionSegments[0]}).`,
        modality: input.modality,
        orgId,
        actorId,
        triggeredRoles: [],
        candidates: [],
        injectionHits: receipt.detectedInjectionSegments,
      };
    }
    const receiptTotal = receipt.totalAmount ?? 0;
    if (receiptTotal > 0) {
      const item = receipt.items[0]?.name || receipt.supplierName || 'Belanja Nota OCR';
      pushCandidate(
        candidates,
        input,
        'record_cost',
        {
          ...(inferredProjectName ? { project: inferredProjectName } : {}),
          item,
          total: receiptTotal,
          supplier: receipt.supplierName,
          attachmentHash: input.attachmentHash ?? receipt.contentHash,
        },
        receiptTotal,
        `Catat biaya nota OCR "${item}" Rp ${receiptTotal.toLocaleString('id-ID')}`,
      );
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      code: 'no_action_detected',
      reason: 'Tidak ditemukan instruksi operasional terstruktur pada input satu pintu.',
      modality: input.modality,
      orgId,
      actorId,
      triggeredRoles: [],
      candidates: [],
    };
  }

  return {
    ok: true,
    modality: input.modality,
    orgId,
    actorId,
    triggeredRoles: collectTriggeredRoles(candidates),
    candidates,
    ...(inferredProjectName ? { inferredProjectName } : {}),
  };
}

function getFromStore(
  store: PreparedActionStore | undefined,
  token: string,
): PreparedUnifiedActionRecord | undefined {
  if (!store) return undefined;
  if (store instanceof Map) return store.get(token);
  return store[token];
}

function setInStore(
  store: PreparedActionStore | undefined,
  token: string,
  record: PreparedUnifiedActionRecord,
): void {
  if (!store) return;
  if (store instanceof Map) {
    store.set(token, record);
  } else {
    store[token] = record;
  }
}

function findCommittedByIdempotencyKey(
  store: PreparedActionStore | undefined,
  orgId: string,
  idempotencyKey: string,
): CommittedActionResult | undefined {
  if (!store || !idempotencyKey) return undefined;
  const records = store instanceof Map ? store.values() : Object.values(store);
  for (const record of records) {
    if (
      record.orgId === orgId
      && record.committedResult
      && (record.idempotencyKey === idempotencyKey || record.committedResult.idempotencyKey === idempotencyKey)
    ) {
      return record.committedResult;
    }
  }
  return undefined;
}

function collectParamsText(params: Record<string, unknown>): string {
  try {
    return JSON.stringify(params ?? {});
  } catch {
    return '';
  }
}

/**
 * Tahap PREPARE runtime tunggal:
 * Menegakkan isolasi tenant, kill switch, batas token/biaya, batas nominal harian,
 * deteksi prompt injection, serta menerbitkan `prepareToken` TTL 10 menit dan `auditDraft`.
 * TIDAK PERNAH menulis atau memposting data pada tahap ini.
 */
export function prepareUnifiedAction(
  request: PreparedActionRequest,
  policy: UnifiedGatewayPolicy,
  dailyUsage: UnifiedDailyUsage,
  preparedStore?: PreparedActionStore,
): PrepareUnifiedActionResult {
  const reject = (
    code: PrepareRejectCode,
    reason: string,
    injectionHits?: string[],
  ): PrepareUnifiedActionResult => ({
    ok: false,
    status: 'rejected',
    written: false,
    code,
    reason,
    ...(injectionHits ? { injectionHits } : {}),
  });

  if (!request || !isUnifiedManagerActionType(request.actionType)) {
    return reject(
      'unknown_action_type',
      `Jenis aksi '${String(request?.actionType ?? '')}' tidak terdaftar pada 18 aksi terpadu.`,
    );
  }

  const orgId = String(request.orgId ?? '').trim();
  const actorId = String(request.actorId ?? '').trim();
  if (!orgId || !actorId) {
    return reject('invalid_prepare_request', 'orgId dan actorId wajib diisi saat prepare.');
  }

  const injectionHits = [
    ...detectPromptInjection(request.rawText),
    ...detectPromptInjection(collectParamsText(request.params)),
  ];
  if (injectionHits.length > 0) {
    return reject(
      'prompt_injection_detected',
      `Permintaan ditolak karena terdeteksi prompt injection (${injectionHits[0]}).`,
      injectionHits,
    );
  }

  const amountRupiah = Math.max(0, toRupiah(request.amountRupiah ?? 0));
  const effective = resolveEffectiveActionPolicy(
    request.actionType,
    amountRupiah,
    policy,
    request.requiresApproval,
  );

  // Gunakan otorisasi deterministik untuk memeriksa tenant, kill switch, peran, batas harian, & kuota token/biaya.
  const authCheck = authorizeAgentAction(
    {
      orgId,
      actionType: request.actionType,
      intent: request.actionType,
      amountRupiah,
      actorId,
      actorRole: request.actorRole,
      createdBy: actorId,
      approvedBy: null,
      requiredRole: effective.spec.minActorRole,
      requiresApproval: effective.requiresApproval,
      idempotencyKey: request.idempotencyKey ?? null,
      estimatedTokens: request.estimatedTokens ?? 0,
      estimatedCostRupiah: request.estimatedCostRupiah ?? 0,
    },
    policy,
    dailyUsage,
  );

  if (!authCheck.ok && authCheck.code !== 'approval_required') {
    return reject(authCheck.code, authCheck.reason);
  }

  const nowMs = request.nowMs ?? Date.now();
  const expiresAtMs = nowMs + PREPARE_TOKEN_TTL_MS;
  const preparedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  const roles: UnifiedAgentRole[] =
    request.roles && request.roles.length > 0 ? [...request.roles] : [...effective.spec.roles];

  const canonicalPayload = JSON.stringify({
    orgId,
    actorId,
    actionType: request.actionType,
    params: request.params ?? {},
    amountRupiah,
    modality: request.modality,
    attachmentHash: request.attachmentHash ?? null,
  });

  const idempotencyKey =
    request.idempotencyKey?.trim()
    || `idemp_${computeDeterministicSha256(canonicalPayload).slice(0, 24)}`;

  const prepareToken = `prep_${computeDeterministicSha256(`${canonicalPayload}::${nowMs}::${idempotencyKey}`).slice(0, 32)}`;

  const auditDraft: UnifiedAuditDraft = {
    orgId,
    actorId,
    actorRole: request.actorRole,
    actionType: request.actionType,
    roles,
    riskLevel: effective.riskLevel,
    modality: request.modality,
    prepareToken,
    idempotencyKey,
    amountRupiah,
    requiresApproval: effective.requiresApproval,
    attachmentHash: request.attachmentHash ?? null,
    preparedAt,
    expiresAt,
    status: 'prepared_not_committed',
  };

  const preparedRecord: PreparedUnifiedActionRecord = {
    prepareToken,
    idempotencyKey,
    orgId,
    actorId,
    actorRole: request.actorRole,
    actionType: request.actionType,
    roles,
    riskLevel: effective.riskLevel,
    modality: request.modality,
    rawText: request.rawText,
    params: { ...(request.params ?? {}) },
    amountRupiah,
    requiresApproval: effective.requiresApproval,
    summary: request.summary || effective.spec.description,
    ...(request.attachmentHash ? { attachmentHash: request.attachmentHash } : {}),
    preparedAt,
    preparedAtMs: nowMs,
    expiresAt,
    expiresAtMs,
    auditDraft,
  };

  setInStore(preparedStore, prepareToken, preparedRecord);

  return {
    ok: true,
    status: 'prepared',
    written: false,
    prepareToken,
    idempotencyKey,
    expiresAt,
    expiresAtMs,
    requiresApproval: effective.requiresApproval,
    riskLevel: effective.riskLevel,
    roles,
    summary: preparedRecord.summary,
    auditDraft,
    preparedRecord,
  };
}

/**
 * Tahap COMMIT runtime tunggal:
 * - Menolak keras commit tanpa `prepareToken` sah & belum kedaluwarsa (`invalid_or_expired_prepare_token`).
 * - Menegakkan isolasi lintas tenant (`cross_tenant_forbidden`).
 * - Idempoten: commit ulang dengan `idempotencyKey` sama mengembalikan hasil sebelumnya tanpa eksekusi ganda (`duplicate_commit_prevented`).
 * - Menegakkan kill switch, persetujuan manusia, & SoD (`approvedBy !== prepared.actorId`).
 * - Menghasilkan `CommittedActionResult` lengkap dengan `auditRecord`.
 */
export function commitUnifiedAction(
  commitReq: CommitUnifiedActionRequest,
  preparedStore: PreparedActionStore,
  policy: UnifiedGatewayPolicy,
  dailyUsage: UnifiedDailyUsage,
): CommitUnifiedActionResult {
  const reject = (
    code: CommitRejectCode,
    reason: string,
    injectionHits?: string[],
  ): CommitUnifiedActionResult => ({
    ok: false,
    duplicate: false,
    executed: false,
    code,
    reason,
    ...(injectionHits ? { injectionHits } : {}),
  });

  const token = String(commitReq?.prepareToken ?? '').trim();
  if (!token) {
    return reject(
      'invalid_or_expired_prepare_token',
      'Commit ditolak: prepareToken wajib disertakan dari tahap prepare.',
    );
  }

  const prepared = getFromStore(preparedStore, token);
  if (!prepared) {
    return reject(
      'invalid_or_expired_prepare_token',
      `Commit ditolak: prepareToken '${token}' tidak ditemukan atau tidak sah.`,
    );
  }

  const reqOrgId = String(commitReq.orgId ?? '').trim();
  const policyOrgId = String(policy.orgId ?? '').trim();
  if (!reqOrgId || !policyOrgId || reqOrgId !== policyOrgId || prepared.orgId !== reqOrgId) {
    return reject(
      'cross_tenant_forbidden',
      `Akses lintas tenant ditolak: commit orgId (${reqOrgId || 'kosong'}) tidak cocok dengan prepared/policy orgId (${prepared.orgId}).`,
    );
  }

  const effectiveIdempKey = String(commitReq.idempotencyKey ?? '').trim() || prepared.idempotencyKey;

  // Idempotensi: jika commit dengan idempotencyKey sama sudah berhasil sebelumnya, kembalikan hasil lama tanpa eksekusi ganda.
  const existingCommitted =
    prepared.committedResult
    ?? findCommittedByIdempotencyKey(preparedStore, reqOrgId, effectiveIdempKey);

  if (existingCommitted) {
    return {
      ...existingCommitted,
      ok: true,
      duplicate: true,
      code: 'duplicate_commit_prevented',
      executed: false,
      reason: `Commit ulang dengan idempotencyKey '${effectiveIdempKey}' dicegah (duplicate_commit_prevented); hasil sebelumnya dikembalikan tanpa eksekusi ganda.`,
      previousResult: existingCommitted,
    };
  }

  const nowMs = commitReq.nowMs ?? Date.now();
  if (nowMs > prepared.expiresAtMs) {
    return reject(
      'invalid_or_expired_prepare_token',
      `Commit ditolak: prepareToken '${token}' telah kedaluwarsa (TTL 10 menit). Lakukan prepare ulang.`,
    );
  }

  const injectionHits = [
    ...detectPromptInjection(prepared.rawText),
    ...detectPromptInjection(collectParamsText(prepared.params)),
  ];
  if (injectionHits.length > 0) {
    return reject(
      'prompt_injection_detected',
      `Commit ditolak karena payload mengandung prompt injection (${injectionHits[0]}).`,
      injectionHits,
    );
  }

  const effective = resolveEffectiveActionPolicy(
    prepared.actionType,
    prepared.amountRupiah,
    policy,
    prepared.requiresApproval,
  );

  const authCheck = authorizeAgentAction(
    {
      orgId: reqOrgId,
      actionType: prepared.actionType,
      intent: prepared.actionType,
      amountRupiah: prepared.amountRupiah,
      actorId: prepared.actorId,
      actorRole: prepared.actorRole,
      createdBy: prepared.actorId,
      approvedBy: commitReq.approvedBy ?? null,
      approverRole: commitReq.approverRole ?? null,
      requiredRole: effective.spec.minActorRole,
      requiresApproval: effective.requiresApproval,
      idempotencyKey: effectiveIdempKey,
    },
    policy,
    dailyUsage,
  );

  if (!authCheck.ok) {
    return reject(authCheck.code, authCheck.reason);
  }

  const committedAt = new Date(nowMs).toISOString();
  const approvedBy = commitReq.approvedBy ? String(commitReq.approvedBy).trim() : null;

  const auditRecord: UnifiedCommitAuditRecord = {
    orgId: prepared.orgId,
    actorId: prepared.actorId,
    approvedBy,
    prepareToken: prepared.prepareToken,
    idempotencyKey: effectiveIdempKey,
    actionType: prepared.actionType,
    roles: [...prepared.roles],
    riskLevel: effective.riskLevel,
    modality: prepared.modality,
    amountRupiah: prepared.amountRupiah,
    committedAt,
  };

  const result: CommittedActionResult = {
    ok: true,
    duplicate: false,
    code: 'committed',
    executed: true,
    reason: 'Aksi terverifikasi dan berhasil di-commit melalui runtime tunggal.',
    orgId: prepared.orgId,
    actionType: prepared.actionType,
    roles: [...prepared.roles],
    prepareToken: prepared.prepareToken,
    idempotencyKey: effectiveIdempKey,
    committedAt,
    summary: prepared.summary,
    params: { ...prepared.params },
    auditRecord,
  };

  prepared.committedResult = result;
  setInStore(preparedStore, prepared.prepareToken, prepared);

  return result;
}
