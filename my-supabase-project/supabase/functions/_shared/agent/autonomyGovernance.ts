import { toRupiah } from './journal.ts';
import { computeDeterministicSha256 } from './receiptExtraction.ts';

export type AmountBand = 'small' | 'medium' | 'large';
export type AutonomyLevel = 'L0' | 'L1' | 'L2';
export type ActorRole = 'worker' | 'manager' | 'owner';

export type CriticalErrorType =
  | 'wrong_amount'
  | 'wrong_party'
  | 'duplicate_entry'
  | 'wrong_direction';

export const SMALL_AMOUNT_MAX_RUPIAH = 1_000_000;
export const MEDIUM_AMOUNT_MAX_RUPIAH = 10_000_000;

export const DEFAULT_AUTONOMY_POLICY = {
  minSamples: 30,
  minAccuracy: 0.98,
  maxCriticalErrors: 0,
  outboundHighRiskThresholdRupiah: 10_000_000,
} as const;

export const HIGH_RISK_AUTONOMY_INTENTS = new Set<string>([
  'dividen',
  'bagi_dividen',
  'dividend',
  'tutup_proyek',
  'project_close',
  'tutup_periode',
  'period_close',
  'write_off',
  'pinjaman_antar_proyek',
  'interproject_loan',
]);

const OUTBOUND_PAYMENT_INTENTS = new Set<string>([
  'pembayaran_keluar',
  'bayar_hutang',
  'outbound_payment',
  'kasbon',
]);

const OWNER_MIN_ROLE_ACTIONS = new Set<string>([
  'dividen',
  'bagi_dividen',
  'dividend',
  'tutup_proyek',
  'project_close',
  'tutup_periode',
  'period_close',
  'write_off',
  'autonomy_policy_update',
  'kill_switch_override',
]);

const MANAGER_MIN_ROLE_ACTIONS = new Set<string>([
  'pinjaman_antar_proyek',
  'interproject_loan',
  'pembayaran_keluar',
  'outbound_payment',
  'approve_collection_draft',
  'approve_reversal',
  'approve_entry',
  'commit_entry',
]);

const ROLE_RANK: Record<ActorRole, number> = {
  worker: 1,
  manager: 2,
  owner: 3,
};

function normToken(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

/**
 * Mengelompokkan nominal rupiah ke pita risiko standar G5:
 * - `small`: <= Rp 1.000.000
 * - `medium`: Rp 1.000.001 .. Rp 10.000.000
 * - `large`: > Rp 10.000.000
 */
export function resolveAmountBand(amountRupiah: number): AmountBand {
  const value = toRupiah(amountRupiah);
  if (value <= SMALL_AMOUNT_MAX_RUPIAH) return 'small';
  if (value <= MEDIUM_AMOUNT_MAX_RUPIAH) return 'medium';
  return 'large';
}

export type ShadowDecisionSnapshot = {
  intent?: string | null;
  category?: string | null;
  amountRupiah?: number | null;
  partyId?: string | null;
  projectId?: string | null;
  direction?: 'in' | 'out' | string | null;
  isDuplicate?: boolean;
  rejected?: boolean;
};

export type ShadowDecisionRecord = {
  id?: string;
  orgId?: string;
  intent: string;
  category: string;
  amountBand?: AmountBand;
  amountRupiah?: number;
  agentDraft: ShadowDecisionSnapshot;
  humanDecision: ShadowDecisionSnapshot;
  agreed?: boolean;
  isCriticalError?: boolean;
  criticalErrorTypes?: readonly CriticalErrorType[];
  createdAt?: string;
};

export type ShadowSliceMetrics = {
  sliceKey: string;
  intent: string;
  category: string;
  amountBand: AmountBand;
  sampleCount: number;
  agreedCount: number;
  disagreedCount: number;
  agreementRate: number;
  criticalErrorCount: number;
  criticalErrorBreakdown: Record<CriticalErrorType, number>;
  maxAmountRupiah: number;
  currentLevel?: AutonomyLevel;
};

export type ShadowAgreementEvaluationResult = {
  totalSamples: number;
  totalAgreed: number;
  overallAgreementRate: number;
  totalCriticalErrors: number;
  slices: ShadowSliceMetrics[];
  bySliceKey: Record<string, ShadowSliceMetrics>;
};

function detectRecordCriticalErrors(record: ShadowDecisionRecord): Set<CriticalErrorType> {
  const errors = new Set<CriticalErrorType>(record.criticalErrorTypes ?? []);
  const draft = record.agentDraft ?? {};
  const human = record.humanDecision ?? {};

  if (
    draft.amountRupiah != null
    && human.amountRupiah != null
    && toRupiah(draft.amountRupiah) !== toRupiah(human.amountRupiah)
  ) {
    errors.add('wrong_amount');
  }

  if (
    (draft.partyId != null || human.partyId != null)
    && normToken(draft.partyId) !== normToken(human.partyId)
  ) {
    errors.add('wrong_party');
  }

  if (draft.isDuplicate === true || human.isDuplicate === true) {
    errors.add('duplicate_entry');
  }

  if (
    draft.direction != null
    && human.direction != null
    && normToken(draft.direction) !== normToken(human.direction)
  ) {
    errors.add('wrong_direction');
  }

  if (record.isCriticalError === true && errors.size === 0) {
    errors.add('wrong_direction');
  }

  return errors;
}

function isRecordAgreed(record: ShadowDecisionRecord, criticalErrors: Set<CriticalErrorType>): boolean {
  if (criticalErrors.size > 0 || record.isCriticalError === true) return false;
  if (record.humanDecision?.rejected === true) return false;
  if (typeof record.agreed === 'boolean') return record.agreed;

  const draft = record.agentDraft ?? {};
  const human = record.humanDecision ?? {};

  if (draft.intent != null && human.intent != null && normToken(draft.intent) !== normToken(human.intent)) {
    return false;
  }
  if (draft.category != null && human.category != null && normToken(draft.category) !== normToken(human.category)) {
    return false;
  }
  if (
    (draft.projectId != null || human.projectId != null)
    && normToken(draft.projectId) !== normToken(human.projectId)
  ) {
    return false;
  }
  return true;
}

/**
 * Mengukur tingkat kesepakatan Mode Bayangan (Shadow Mode) antara draf agen dan keputusan akhir manusia
 * per kombinasi `(intent, category, amountBand)`.
 */
export function evaluateShadowAgreement(
  records: readonly ShadowDecisionRecord[],
): ShadowAgreementEvaluationResult {
  const sliceMap = new Map<string, ShadowSliceMetrics>();
  let totalSamples = 0;
  let totalAgreed = 0;
  let totalCriticalErrors = 0;

  for (const record of records ?? []) {
    const intent = normToken(record.intent) || 'unknown';
    const category = normToken(record.category) || 'uncategorized';
    const nominal = toRupiah(
      record.amountRupiah
      ?? record.humanDecision?.amountRupiah
      ?? record.agentDraft?.amountRupiah
      ?? 0,
    );
    const amountBand: AmountBand = record.amountBand ?? resolveAmountBand(nominal);
    const sliceKey = `${intent}::${category}::${amountBand}`;

    let slice = sliceMap.get(sliceKey);
    if (!slice) {
      slice = {
        sliceKey,
        intent,
        category,
        amountBand,
        sampleCount: 0,
        agreedCount: 0,
        disagreedCount: 0,
        agreementRate: 0,
        criticalErrorCount: 0,
        criticalErrorBreakdown: {
          wrong_amount: 0,
          wrong_party: 0,
          duplicate_entry: 0,
          wrong_direction: 0,
        },
        maxAmountRupiah: 0,
      };
      sliceMap.set(sliceKey, slice);
    }

    const criticalErrors = detectRecordCriticalErrors(record);
    const agreed = isRecordAgreed(record, criticalErrors);
    const hasCritical = criticalErrors.size > 0 || record.isCriticalError === true;

    slice.sampleCount += 1;
    totalSamples += 1;

    if (nominal > slice.maxAmountRupiah) {
      slice.maxAmountRupiah = nominal;
    }

    if (agreed) {
      slice.agreedCount += 1;
      totalAgreed += 1;
    } else {
      slice.disagreedCount += 1;
    }

    if (hasCritical) {
      slice.criticalErrorCount += 1;
      totalCriticalErrors += 1;
      for (const errType of criticalErrors) {
        slice.criticalErrorBreakdown[errType] += 1;
      }
    }
  }

  const slices = Array.from(sliceMap.values())
    .map((slice) => ({
      ...slice,
      agreementRate: slice.sampleCount === 0 ? 0 : round4(slice.agreedCount / slice.sampleCount),
    }))
    .sort((a, b) => a.sliceKey.localeCompare(b.sliceKey));

  const bySliceKey: Record<string, ShadowSliceMetrics> = {};
  for (const slice of slices) {
    bySliceKey[slice.sliceKey] = slice;
  }

  return {
    totalSamples,
    totalAgreed,
    overallAgreementRate: totalSamples === 0 ? 0 : round4(totalAgreed / totalSamples),
    totalCriticalErrors,
    slices,
    bySliceKey,
  };
}

export type AutonomyPolicyThresholds = {
  minSamples?: number;
  minAccuracy?: number;
  maxCriticalErrors?: number;
  outboundHighRiskThresholdRupiah?: number;
  currentLevel?: AutonomyLevel;
};

export type AutonomySliceInput = {
  intent: string;
  category: string;
  amountBand: AmountBand;
  sampleCount: number;
  agreementRate: number;
  criticalErrorCount: number;
  maxAmountRupiah?: number;
  currentLevel?: AutonomyLevel;
};

export type AutonomyPromotionDecision = {
  sliceKey: string;
  intent: string;
  category: string;
  amountBand: AmountBand;
  currentLevel: AutonomyLevel;
  previousLevel: AutonomyLevel;
  nextLevel: AutonomyLevel;
  promoted: boolean;
  demoted: boolean;
  demotedReason: string | null;
  requiresHumanApproval: boolean;
  isHighRiskAction: boolean;
  reason: string;
  thresholdsUsed: {
    minSamples: number;
    minAccuracy: number;
    maxCriticalErrors: number;
    outboundHighRiskThresholdRupiah: number;
  };
};

/**
 * Menentukan apakah kombinasi intent + pita nominal termasuk aksi berisiko tinggi
 * yang TIDAK PERNAH boleh naik ke otonomi L2.
 */
export function isHighRiskAutonomyAction(
  intent: string,
  amountBand?: AmountBand,
  amountRupiah?: number,
  outboundHighRiskThresholdRupiah: number = DEFAULT_AUTONOMY_POLICY.outboundHighRiskThresholdRupiah,
): boolean {
  const normIntent = normToken(intent);
  if (HIGH_RISK_AUTONOMY_INTENTS.has(normIntent)) {
    return true;
  }
  if (OUTBOUND_PAYMENT_INTENTS.has(normIntent)) {
    if (amountBand === 'large') return true;
    if (amountRupiah != null && toRupiah(amountRupiah) > outboundHighRiskThresholdRupiah) {
      return true;
    }
  }
  return false;
}

/**
 * Mengevaluasi kenaikan ke L2 atau penurunan otomatis (auto-demote) ke L1 berbasis bukti shadow mode.
 * Kebijakan default D-G5-01: `minSamples = 30`, `minAccuracy = 0.98`, `maxCriticalErrors = 0`.
 */
export function evaluateAutonomyPromotion(
  sliceMetrics: AutonomySliceInput,
  policy?: AutonomyPolicyThresholds,
): AutonomyPromotionDecision {
  const minSamples = Math.max(1, Math.floor(policy?.minSamples ?? DEFAULT_AUTONOMY_POLICY.minSamples));
  const minAccuracy = policy?.minAccuracy ?? DEFAULT_AUTONOMY_POLICY.minAccuracy;
  const maxCriticalErrors = Math.max(
    0,
    Math.floor(policy?.maxCriticalErrors ?? DEFAULT_AUTONOMY_POLICY.maxCriticalErrors),
  );
  const outboundHighRiskThresholdRupiah =
    policy?.outboundHighRiskThresholdRupiah ?? DEFAULT_AUTONOMY_POLICY.outboundHighRiskThresholdRupiah;

  const intent = normToken(sliceMetrics.intent) || 'unknown';
  const category = normToken(sliceMetrics.category) || 'uncategorized';
  const amountBand = sliceMetrics.amountBand;
  const sliceKey = `${intent}::${category}::${amountBand}`;
  const currentLevel: AutonomyLevel = sliceMetrics.currentLevel ?? policy?.currentLevel ?? 'L1';

  const thresholdsUsed = {
    minSamples,
    minAccuracy,
    maxCriticalErrors,
    outboundHighRiskThresholdRupiah,
  };

  const highRisk = isHighRiskAutonomyAction(
    intent,
    amountBand,
    sliceMetrics.maxAmountRupiah,
    outboundHighRiskThresholdRupiah,
  );

  // Aturan keras: aksi berisiko tinggi tidak pernah boleh berada di L2.
  if (highRisk) {
    if (currentLevel === 'L2') {
      return {
        sliceKey,
        intent,
        category,
        amountBand,
        currentLevel,
        previousLevel: 'L2',
        nextLevel: 'L1',
        promoted: false,
        demoted: true,
        demotedReason: 'high_risk_action_forbidden_at_l2',
        requiresHumanApproval: true,
        isHighRiskAction: true,
        reason: 'high_risk_action_demoted_to_l1',
        thresholdsUsed,
      };
    }

    return {
      sliceKey,
      intent,
      category,
      amountBand,
      currentLevel,
      previousLevel: currentLevel,
      nextLevel: currentLevel,
      promoted: false,
      demoted: false,
      demotedReason: null,
      requiresHumanApproval: true,
      isHighRiskAction: true,
      reason: 'high_risk_action_requires_human_approval',
      thresholdsUsed,
    };
  }

  // Auto-demote segera bila sudah L2 tetapi terjadi critical error atau akurasi turun.
  if (currentLevel === 'L2') {
    const hasCriticalError = sliceMetrics.criticalErrorCount > maxCriticalErrors || sliceMetrics.criticalErrorCount > 0;
    const accuracyDropped = sliceMetrics.agreementRate < minAccuracy;
    if (hasCriticalError || accuracyDropped) {
      const demotedReason = hasCriticalError && accuracyDropped
        ? 'critical_error_and_accuracy_drop'
        : hasCriticalError
          ? 'critical_error_detected'
          : 'accuracy_below_threshold';

      return {
        sliceKey,
        intent,
        category,
        amountBand,
        currentLevel,
        previousLevel: 'L2',
        nextLevel: 'L1',
        promoted: false,
        demoted: true,
        demotedReason,
        requiresHumanApproval: true,
        isHighRiskAction: false,
        reason: `auto_demoted_l2_to_l1:${demotedReason}`,
        thresholdsUsed,
      };
    }

    return {
      sliceKey,
      intent,
      category,
      amountBand,
      currentLevel,
      previousLevel: 'L2',
      nextLevel: 'L2',
      promoted: false,
      demoted: false,
      demotedReason: null,
      requiresHumanApproval: false,
      isHighRiskAction: false,
      reason: 'l2_maintained',
      thresholdsUsed,
    };
  }

  // Promosi ke L2 hanya jika seluruh syarat bukti terpenuhi.
  const hasZeroCritical = sliceMetrics.criticalErrorCount === 0 && sliceMetrics.criticalErrorCount <= maxCriticalErrors;
  const hasEnoughSamples = sliceMetrics.sampleCount >= minSamples;
  const hasEnoughAccuracy = sliceMetrics.agreementRate >= minAccuracy;

  if (hasZeroCritical && hasEnoughSamples && hasEnoughAccuracy) {
    return {
      sliceKey,
      intent,
      category,
      amountBand,
      currentLevel,
      previousLevel: currentLevel,
      nextLevel: 'L2',
      promoted: true,
      demoted: false,
      demotedReason: null,
      requiresHumanApproval: false,
      isHighRiskAction: false,
      reason: 'promoted_to_l2_by_shadow_evidence',
      thresholdsUsed,
    };
  }

  const blockReason = !hasZeroCritical
    ? 'critical_errors_present'
    : !hasEnoughSamples
      ? 'insufficient_samples'
      : 'accuracy_below_threshold';

  return {
    sliceKey,
    intent,
    category,
    amountBand,
    currentLevel,
    previousLevel: currentLevel,
    nextLevel: currentLevel,
    promoted: false,
    demoted: false,
    demotedReason: null,
    requiresHumanApproval: true,
    isHighRiskAction: false,
    reason: blockReason,
    thresholdsUsed,
  };
}

export type AgentActionRequest = {
  orgId: string;
  actionType: string;
  intent?: string;
  category?: string;
  amountRupiah: number;
  actorId: string;
  actorRole: ActorRole;
  createdBy: string;
  approvedBy?: string | null;
  approverRole?: ActorRole | null;
  requiredRole?: ActorRole;
  requiresApproval?: boolean;
  idempotencyKey?: string | null;
  existingIdempotencyKeys?: ReadonlySet<string> | readonly string[];
  estimatedTokens?: number;
  estimatedCostRupiah?: number;
};

export type OrgAutonomyGovernancePolicy = {
  orgId: string;
  killSwitchEnabled: boolean;
  autonomyLevel?: AutonomyLevel;
  dailyAgentCapRupiah: number;
  dailyTokenBudget?: number;
  monthlyTokenBudget?: number;
  dailyCostBudgetRupiah?: number;
  monthlyCostBudgetRupiah?: number;
  outboundHighRiskThresholdRupiah?: number;
  existingIdempotencyKeys?: ReadonlySet<string> | readonly string[];
};

export type OrgDailyGovernanceUsage = {
  committedRupiahToday: number;
  tokensUsedToday?: number;
  tokensUsedThisMonth?: number;
  costRupiahToday?: number;
  costRupiahThisMonth?: number;
  existingIdempotencyKeys?: ReadonlySet<string> | readonly string[];
};

export type AuthorizeRejectCode =
  | 'cross_tenant_forbidden'
  | 'kill_switch_active'
  | 'role_escalation_forbidden'
  | 'self_approval_forbidden'
  | 'duplicate_payment_blocked'
  | 'daily_amount_cap_exceeded'
  | 'token_budget_exceeded'
  | 'cost_budget_exceeded'
  | 'approval_required';

export type AuthorizeAgentActionResult =
  | {
      allowed: true;
      ok: true;
      code: 'authorized';
      reason: string;
      requiresApproval: boolean;
      checksEvaluated: string[];
    }
  | {
      allowed: false;
      ok: false;
      code: AuthorizeRejectCode;
      reason: string;
      requiresApproval: boolean;
      checksEvaluated: string[];
    };

function resolveRequiredRole(request: AgentActionRequest): ActorRole {
  if (request.requiredRole) return request.requiredRole;
  const actionKey = normToken(request.intent || request.actionType);
  if (OWNER_MIN_ROLE_ACTIONS.has(actionKey)) return 'owner';
  if (MANAGER_MIN_ROLE_ACTIONS.has(actionKey)) return 'manager';
  return 'worker';
}

function hasIdempotencyKey(
  key: string,
  ...collections: Array<ReadonlySet<string> | readonly string[] | undefined>
): boolean {
  for (const col of collections) {
    if (!col) continue;
    if (col instanceof Set) {
      if (col.has(key)) return true;
    } else if (Array.isArray(col)) {
      if (col.includes(key)) return true;
    }
  }
  return false;
}

/**
 * Penjaga otorisasi deterministik aksi agen:
 * isolasi tenant, kill switch, eskalasi peran, Segregation of Duties (SoD),
 * idempotensi pembayaran ganda, batas nominal harian, serta kuota token & biaya.
 */
export function authorizeAgentAction(
  request: AgentActionRequest,
  orgPolicy: OrgAutonomyGovernancePolicy,
  dailyUsage: OrgDailyGovernanceUsage,
): AuthorizeAgentActionResult {
  const checksEvaluated: string[] = [];
  const reqOrgId = String(request.orgId ?? '').trim();
  const policyOrgId = String(orgPolicy.orgId ?? '').trim();

  const amountRupiah = Math.max(0, toRupiah(request.amountRupiah));
  const actionIntent = normToken(request.intent || request.actionType);
  const amountBand = resolveAmountBand(amountRupiah);
  const isHighRisk = isHighRiskAutonomyAction(
    actionIntent,
    amountBand,
    amountRupiah,
    orgPolicy.outboundHighRiskThresholdRupiah ?? DEFAULT_AUTONOMY_POLICY.outboundHighRiskThresholdRupiah,
  );
  // Aksi berisiko tinggi selalu mewajibkan persetujuan manusia dan tidak boleh dimatikan oleh request.requiresApproval = false.
  const requiresApproval = isHighRisk || (request.requiresApproval ?? orgPolicy.autonomyLevel !== 'L2');

  const reject = (code: AuthorizeRejectCode, reason: string): AuthorizeAgentActionResult => ({
    allowed: false,
    ok: false,
    code,
    reason,
    requiresApproval,
    checksEvaluated,
  });

  // 1. Isolasi lintas-tenant
  checksEvaluated.push('tenant_isolation');
  if (!reqOrgId || !policyOrgId || reqOrgId !== policyOrgId) {
    return reject(
      'cross_tenant_forbidden',
      `Akses lintas tenant ditolak: request orgId (${reqOrgId || 'kosong'}) tidak cocok dengan policy orgId (${policyOrgId || 'kosong'}).`,
    );
  }

  // 2. Kill Switch organisasi
  checksEvaluated.push('kill_switch');
  if (orgPolicy.killSwitchEnabled === true) {
    return reject('kill_switch_active', 'Kill switch otonomi agen aktif pada organisasi ini; seluruh eksekusi agen dibekukan.');
  }

  // 3. Eskalasi wewenang peran
  checksEvaluated.push('role_hierarchy');
  const requiredRole = resolveRequiredRole(request);
  const actorRank = ROLE_RANK[request.actorRole] ?? 0;
  const requiredRank = ROLE_RANK[requiredRole] ?? 1;
  if (actorRank < requiredRank) {
    return reject(
      'role_escalation_forbidden',
      `Peran '${request.actorRole}' tidak memenuhi wewenang minimum '${requiredRole}' untuk aksi '${request.intent || request.actionType}'.`,
    );
  }
  if (request.approverRole && (ROLE_RANK[request.approverRole] ?? 0) < requiredRank) {
    return reject(
      'role_escalation_forbidden',
      `Peran penyetuju '${request.approverRole}' tidak memenuhi wewenang minimum '${requiredRole}'.`,
    );
  }

  // 4. Segregation of Duties (SoD) — larangan self-approval
  checksEvaluated.push('segregation_of_duties');
  const createdBy = String(request.createdBy ?? '').trim();
  const approvedBy = String(request.approvedBy ?? '').trim();
  if (requiresApproval && approvedBy && createdBy && approvedBy === createdBy) {
    return reject(
      'self_approval_forbidden',
      'Pembuat draf tidak boleh menyetujui aksinya sendiri (Segregation of Duties).',
    );
  }

  // 5. Idempotensi pembayaran / entri ganda
  checksEvaluated.push('idempotency_guard');
  const idempKey = String(request.idempotencyKey ?? '').trim();
  if (
    idempKey
    && hasIdempotencyKey(
      idempKey,
      dailyUsage.existingIdempotencyKeys,
      orgPolicy.existingIdempotencyKeys,
      request.existingIdempotencyKeys,
    )
  ) {
    return reject(
      'duplicate_payment_blocked',
      `Idempotency key '${idempKey}' sudah pernah dipakai; pembayaran/posting ganda diblokir.`,
    );
  }

  // 6. Batas nominal harian agen
  checksEvaluated.push('daily_amount_cap');
  const committedToday = Math.max(0, toRupiah(dailyUsage.committedRupiahToday));
  const dailyCap = Math.max(0, toRupiah(orgPolicy.dailyAgentCapRupiah));
  if (committedToday + amountRupiah > dailyCap) {
    return reject(
      'daily_amount_cap_exceeded',
      `Akumulasi nominal harian (${committedToday + amountRupiah}) melampaui batas harian agen (${dailyCap}).`,
    );
  }

  // 7. Kuota token & biaya organisasi
  checksEvaluated.push('token_and_cost_budget');
  const estTokens = Math.max(0, Math.round(request.estimatedTokens ?? 0));
  if (
    orgPolicy.dailyTokenBudget != null
    && (dailyUsage.tokensUsedToday ?? 0) + estTokens > orgPolicy.dailyTokenBudget
  ) {
    return reject('token_budget_exceeded', 'Penggunaan token harian melebihi kuota token harian organisasi.');
  }
  if (
    orgPolicy.monthlyTokenBudget != null
    && (dailyUsage.tokensUsedThisMonth ?? 0) + estTokens > orgPolicy.monthlyTokenBudget
  ) {
    return reject('token_budget_exceeded', 'Penggunaan token bulanan melebihi kuota token bulanan organisasi.');
  }

  const estCost = Math.max(0, toRupiah(request.estimatedCostRupiah ?? 0));
  if (
    orgPolicy.dailyCostBudgetRupiah != null
    && toRupiah(dailyUsage.costRupiahToday ?? 0) + estCost > toRupiah(orgPolicy.dailyCostBudgetRupiah)
  ) {
    return reject('cost_budget_exceeded', 'Biaya AI harian melebihi anggaran biaya harian organisasi.');
  }
  if (
    orgPolicy.monthlyCostBudgetRupiah != null
    && toRupiah(dailyUsage.costRupiahThisMonth ?? 0) + estCost > toRupiah(orgPolicy.monthlyCostBudgetRupiah)
  ) {
    return reject('cost_budget_exceeded', 'Biaya AI bulanan melebihi anggaran biaya bulanan organisasi.');
  }

  // 8. Wajib persetujuan manusia jika belum ada approver
  checksEvaluated.push('human_approval_check');
  if (requiresApproval && !approvedBy) {
    return reject(
      'approval_required',
      'Aksi memerlukan persetujuan manusia terlebih dahulu sebelum dieksekusi.',
    );
  }

  return {
    allowed: true,
    ok: true,
    code: 'authorized',
    reason: 'Seluruh pemeriksaan tata kelola, SoD, batas nominal, kuota, dan tenant terpenuhi.',
    requiresApproval,
    checksEvaluated,
  };
}

export type AuditTrailLogEntry = {
  id?: string;
  orgId: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'cron' | 'system';
  model: string;
  promptTokens: number;
  completionTokens: number;
  evidenceAttachmentHash: string | null;
  journalEntryId: string | null;
  createdAt: string;
  action?: string;
  targetTable?: string;
  targetId?: string;
};

export type NormalizedAuditTrailEntry = {
  orgId: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'cron' | 'system';
  model: string;
  promptTokens: number;
  completionTokens: number;
  evidenceAttachmentHash: string | null;
  journalEntryId: string | null;
  createdAt: string;
  id?: string;
  action?: string;
  targetTable?: string;
  targetId?: string;
};

export type AuditTrailExportResult = {
  format: 'json' | 'csv';
  recordCount: number;
  contentHash: string;
  records: NormalizedAuditTrailEntry[];
  content: string;
};

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Mengekspor jejak audit lengkap secara deterministik (urutan kanonis + SHA-256)
 * dalam format JSON maupun CSV.
 */
export function buildAuditTrailExport(
  logs: readonly AuditTrailLogEntry[],
  format: 'json' | 'csv',
): AuditTrailExportResult {
  const normalized: NormalizedAuditTrailEntry[] = (logs ?? []).map((entry) => ({
    orgId: String(entry.orgId ?? '').trim(),
    actorId: String(entry.actorId ?? '').trim(),
    actorType: entry.actorType,
    model: String(entry.model ?? '').trim(),
    promptTokens: Math.max(0, Math.round(entry.promptTokens ?? 0)),
    completionTokens: Math.max(0, Math.round(entry.completionTokens ?? 0)),
    evidenceAttachmentHash: entry.evidenceAttachmentHash ? String(entry.evidenceAttachmentHash).trim() : null,
    journalEntryId: entry.journalEntryId ? String(entry.journalEntryId).trim() : null,
    createdAt: String(entry.createdAt ?? '').trim(),
    ...(entry.id ? { id: String(entry.id).trim() } : {}),
    ...(entry.action ? { action: String(entry.action).trim() } : {}),
    ...(entry.targetTable ? { targetTable: String(entry.targetTable).trim() } : {}),
    ...(entry.targetId ? { targetId: String(entry.targetId).trim() } : {}),
  }));

  normalized.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt)
      || a.orgId.localeCompare(b.orgId)
      || (a.journalEntryId ?? '').localeCompare(b.journalEntryId ?? '')
      || a.actorId.localeCompare(b.actorId)
      || (a.id ?? '').localeCompare(b.id ?? ''),
  );

  const canonicalRecordsJson = JSON.stringify(normalized);
  const contentHash = computeDeterministicSha256(canonicalRecordsJson);

  if (format === 'csv') {
    const header = [
      'orgId',
      'actorId',
      'actorType',
      'model',
      'promptTokens',
      'completionTokens',
      'evidenceAttachmentHash',
      'journalEntryId',
      'createdAt',
    ].join(',');
    const rows = normalized.map((r) =>
      [
        escapeCsvCell(r.orgId),
        escapeCsvCell(r.actorId),
        escapeCsvCell(r.actorType),
        escapeCsvCell(r.model),
        escapeCsvCell(r.promptTokens),
        escapeCsvCell(r.completionTokens),
        escapeCsvCell(r.evidenceAttachmentHash ?? ''),
        escapeCsvCell(r.journalEntryId ?? ''),
        escapeCsvCell(r.createdAt),
      ].join(','),
    );
    return {
      format: 'csv',
      recordCount: normalized.length,
      contentHash,
      records: normalized,
      content: [header, ...rows].join('\n'),
    };
  }

  return {
    format: 'json',
    recordCount: normalized.length,
    contentHash,
    records: normalized,
    content: JSON.stringify(
      {
        format: 'json',
        recordCount: normalized.length,
        contentHash,
        records: normalized,
      },
      null,
      2,
    ),
  };
}

export type UserCorrectionSignalMemory = {
  id: string;
  orgId: string;
  keyword: string;
  correctedIntent: string;
  correctedCategory: string;
  correctedRapType?: string;
  correctedPartyId?: string;
  correctedProjectId?: string;
  correctedWalletId?: string;
  occurrenceCount: number;
  lastCorrectedAt: string;
};

export type UserCorrectionInput = {
  orgId: string;
  keyword: string;
  correctedIntent: string;
  correctedCategory: string;
  correctedRapType?: string;
  correctedPartyId?: string;
  correctedProjectId?: string;
  correctedWalletId?: string;
  correctedAt: string;
  // Field terlarang bila dikirim saat runtime akan ditolak keras
  [forbiddenExtraKey: string]: unknown;
};

export type RecordUserCorrectionResult =
  | {
      ok: true;
      signal: UserCorrectionSignalMemory;
      memory: UserCorrectionSignalMemory[];
    }
  | {
      ok: false;
      code: 'accounting_math_signal_forbidden' | 'invalid_correction_input';
      reason: string;
      memory: UserCorrectionSignalMemory[];
    };

const FORBIDDEN_CORRECTION_KEYS = new Set<string>([
  'debit',
  'credit',
  'debitAccount',
  'creditAccount',
  'debitRole',
  'creditRole',
  'journalLines',
  'lines',
  'amount',
  'nominal',
  'calculatedAmount',
  'formula',
  'balance',
]);

const FORBIDDEN_CORRECTION_TEXT_RE = /\b(?:debit|credit|kredit|dr\/cr|hitung|formula|nominal\s*=)\b/i;

/**
 * Menyimpan koreksi pengguna sebagai sinyal pemetaan slot/kategori untuk klasifikasi berikutnya,
 * tanpa pernah menyimpan atau mengizinkan LLM memilih debit/kredit atau menghitung angka.
 */
export function recordUserCorrectionSignal(
  existingMemory: readonly UserCorrectionSignalMemory[],
  correction: UserCorrectionInput,
): RecordUserCorrectionResult {
  const safeMemory = [...(existingMemory ?? [])];

  for (const key of Object.keys(correction ?? {})) {
    if (FORBIDDEN_CORRECTION_KEYS.has(key) && correction[key] !== undefined) {
      return {
        ok: false,
        code: 'accounting_math_signal_forbidden',
        reason: `Memori koreksi dilarang menyimpan field akuntansi/perhitungan '${key}'. Hanya sinyal pemetaan slot/kategori yang diizinkan.`,
        memory: safeMemory,
      };
    }
  }

  const orgId = String(correction?.orgId ?? '').trim();
  const keyword = normToken(correction?.keyword);
  const correctedIntent = normToken(correction?.correctedIntent);
  const correctedCategory = normToken(correction?.correctedCategory);
  const correctedAt = String(correction?.correctedAt ?? '').trim();

  if (!orgId || !keyword || !correctedIntent || !correctedCategory || !correctedAt) {
    return {
      ok: false,
      code: 'invalid_correction_input',
      reason: 'orgId, keyword, correctedIntent, correctedCategory, dan correctedAt wajib diisi.',
      memory: safeMemory,
    };
  }

  if (
    FORBIDDEN_CORRECTION_TEXT_RE.test(keyword)
    || FORBIDDEN_CORRECTION_TEXT_RE.test(correctedIntent)
    || FORBIDDEN_CORRECTION_TEXT_RE.test(correctedCategory)
  ) {
    return {
      ok: false,
      code: 'accounting_math_signal_forbidden',
      reason: 'Koreksi tidak boleh berisi arahan debit/kredit atau rumus perhitungan angka.',
      memory: safeMemory,
    };
  }

  const signalId = `corr-${computeDeterministicSha256(`${orgId}::${keyword}::${correctedIntent}::${correctedCategory}`).slice(0, 12)}`;
  const existingIdx = safeMemory.findIndex(
    (item) => item.orgId === orgId && normToken(item.keyword) === keyword,
  );

  const signal: UserCorrectionSignalMemory = {
    id: signalId,
    orgId,
    keyword,
    correctedIntent,
    correctedCategory,
    ...(correction.correctedRapType ? { correctedRapType: normToken(correction.correctedRapType) } : {}),
    ...(correction.correctedPartyId ? { correctedPartyId: String(correction.correctedPartyId).trim() } : {}),
    ...(correction.correctedProjectId ? { correctedProjectId: String(correction.correctedProjectId).trim() } : {}),
    ...(correction.correctedWalletId ? { correctedWalletId: String(correction.correctedWalletId).trim() } : {}),
    occurrenceCount: existingIdx >= 0 ? safeMemory[existingIdx].occurrenceCount + 1 : 1,
    lastCorrectedAt: correctedAt,
  };

  if (existingIdx >= 0) {
    safeMemory[existingIdx] = signal;
  } else {
    safeMemory.push(signal);
  }

  return {
    ok: true,
    signal,
    memory: safeMemory,
  };
}
