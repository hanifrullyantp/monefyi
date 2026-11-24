import type { AdvisorWhatIfScenario } from './financialAdvisor';
import type { DailyAssignmentSchedule } from './hrdPayroll';
import { toRupiah } from './journal';

const DAY_MS = 86_400_000;

export type PmActorRole = 'worker' | 'mandor' | 'pm' | 'owner';
export type PmSupervisorRole = 'mandor' | 'pm' | 'owner';

export interface PmProvenance {
  source: string;
  asOfDate: string;
  assumptions: string[];
}

function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidPhotoHash(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length >= 4;
}

function isValidPhotoUrl(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 3 || /\s/.test(trimmed)) return false;
  return (
    /^https?:\/\/\S+$/i.test(trimmed) ||
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed) ||
    /^\/[^\s]+$/.test(trimmed) ||
    /^[^\s]+\.(?:jpg|jpeg|png|webp|heic)$/i.test(trimmed)
  );
}

function isSupervisorRole(role: PmActorRole | null | undefined): role is PmSupervisorRole {
  return role === 'mandor' || role === 'pm' || role === 'owner';
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function roundPct2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseYmdUtcMs(ymd: string, fieldName: string): number {
  const match = String(ymd ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Format tanggal ${fieldName} tidak valid (harus YYYY-MM-DD): ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal kalender ${fieldName} tidak valid: ${ymd}`);
  }
  return dt.getTime();
}

function diffDaysSigned(fromYmd: string, toYmd: string, fromLabel = 'fromDate', toLabel = 'toDate'): number {
  const fromMs = parseYmdUtcMs(fromYmd, fromLabel);
  const toMs = parseYmdUtcMs(toYmd, toLabel);
  return Math.round((toMs - fromMs) / DAY_MS);
}

function diffDaysInclusive(startYmd: string, endYmd: string): number {
  return Math.max(1, diffDaysSigned(startYmd, endYmd, 'startDate', 'endDate') + 1);
}

function shiftYmd(ymd: string, deltaDays: number, fieldName = 'date'): string {
  const ms = parseYmdUtcMs(ymd, fieldName);
  const shifted = new Date(ms + Math.trunc(deltaDays) * DAY_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function sanitizeClientText(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return text
    .replace(/\b(?:laborCost|dailyRate|eacLaborCost|eac|kasbon|margin)\b\s*[:=]?\s*(?:rp\.?\s*[\d.,-]+)?/gi, '[INTERNAL]')
    .replace(/\b(?:upah|tarif\s+harian|gaji|kasbon)\b\s*[:=]?\s*(?:rp\.?\s*[\d.,-]+)?/gi, '[INTERNAL]')
    .trim();
}

// ---------------------------------------------------------------------------
// 1. Jadwal -> Penugasan Harian & Target Progres
// ---------------------------------------------------------------------------

export interface PmWorkItemScheduleInput {
  id: string;
  projectId?: string;
  projectName?: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  weight?: number | null;
  assignedWorkerIds: string[];
  progressPct?: number | null;
}

export interface DailyAssignmentPlan extends DailyAssignmentSchedule {
  workItemName: string;
  stageStartDate: string;
  stageEndDate: string;
}

export interface DeriveDailyPlanInput {
  projectId?: string;
  projectName?: string;
  workItems: PmWorkItemScheduleInput[];
  workDate: string; // YYYY-MM-DD
  includeCompleted?: boolean;
}

export interface ActiveScheduledWorkItemSummary {
  id: string;
  projectId: string;
  projectName: string | null;
  name: string;
  startDate: string;
  endDate: string;
  weight: number;
  progressPct: number;
  plannedPctAtDate: number;
  assignedWorkerIds: string[];
}

export interface DeriveDailyPlanResult {
  workDate: string;
  dailyAssignments: DailyAssignmentPlan[];
  activeWorkItems: ActiveScheduledWorkItemSummary[];
  plannedProgressPct: number;
  actualProgressPct: number;
  totalWeight: number;
  provenance: PmProvenance;
}

/**
 * Menurunkan rencana penugasan harian (selaras `DailyAssignmentSchedule` di `hrdPayroll.ts`)
 * dan target progres tertimbang per tanggal dari jadwal Gantt `workItems`.
 */
export function deriveDailyPlanFromSchedule(input: DeriveDailyPlanInput): DeriveDailyPlanResult {
  const workDateMs = parseYmdUtcMs(input.workDate, 'workDate');
  const dailyAssignments: DailyAssignmentPlan[] = [];
  const activeWorkItems: ActiveScheduledWorkItemSummary[] = [];
  const seenAssignmentKeys = new Set<string>();

  let totalWeight = 0;
  let weightedPlannedSum = 0;
  let weightedActualSum = 0;

  for (const item of input.workItems) {
    const projectId = String(item.projectId || input.projectId || '').trim();
    if (!projectId) {
      throw new Error(`Work item "${item.id}" tidak memiliki projectId.`);
    }

    const startMs = parseYmdUtcMs(item.startDate, `${item.id}.startDate`);
    const endMs = parseYmdUtcMs(item.endDate, `${item.id}.endDate`);
    if (endMs < startMs) {
      throw new Error(`Work item "${item.id}" memiliki endDate (${item.endDate}) lebih awal dari startDate (${item.startDate}).`);
    }

    const weight = Number(item.weight) > 0 ? Number(item.weight) : 1;
    const actualPct = roundPct2(clampPct(Number(item.progressPct ?? 0)));

    let plannedPctAtDate = 0;
    if (workDateMs < startMs) {
      plannedPctAtDate = 0;
    } else if (workDateMs >= endMs) {
      plannedPctAtDate = 100;
    } else {
      const totalDays = diffDaysInclusive(item.startDate, item.endDate);
      const elapsedDays = diffDaysInclusive(item.startDate, input.workDate);
      plannedPctAtDate = roundPct2(Math.min(100, (elapsedDays / totalDays) * 100));
    }

    totalWeight += weight;
    weightedPlannedSum += plannedPctAtDate * weight;
    weightedActualSum += actualPct * weight;

    const isScheduledOnDate = workDateMs >= startMs && workDateMs <= endMs;
    const isIncluded = input.includeCompleted ? true : actualPct < 100;

    if (isScheduledOnDate && isIncluded) {
      activeWorkItems.push({
        id: item.id,
        projectId,
        projectName: item.projectName ?? input.projectName ?? null,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        weight,
        progressPct: actualPct,
        plannedPctAtDate,
        assignedWorkerIds: [...item.assignedWorkerIds],
      });

      for (const rawWorkerId of item.assignedWorkerIds) {
        const workerId = String(rawWorkerId ?? '').trim();
        if (!workerId) continue;
        const dedupeKey = `${workerId}::${projectId}::${item.id}`;
        if (seenAssignmentKeys.has(dedupeKey)) continue;
        seenAssignmentKeys.add(dedupeKey);

        dailyAssignments.push({
          workerId,
          projectId,
          projectName: item.projectName ?? input.projectName,
          workDate: input.workDate,
          sourceWorkItemId: item.id,
          workItemName: item.name,
          stageStartDate: item.startDate,
          stageEndDate: item.endDate,
        });
      }
    }
  }

  const plannedProgressPct = totalWeight > 0 ? roundPct2(weightedPlannedSum / totalWeight) : 0;
  const actualProgressPct = totalWeight > 0 ? roundPct2(weightedActualSum / totalWeight) : 0;

  return {
    workDate: input.workDate,
    dailyAssignments,
    activeWorkItems,
    plannedProgressPct,
    actualProgressPct,
    totalWeight,
    provenance: {
      source: 'pm_schedule_daily_plan',
      asOfDate: input.workDate,
      assumptions: [
        'Progres target tahap dihitung linear inklusif antara startDate dan endDate (bobot kosong = 1).',
        'Tahap yang sudah 100% tidak dijadwalkan ulang kecuali includeCompleted=true.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Penjaga Progres Lapangan & Bukti Foto Wajib 100%
// ---------------------------------------------------------------------------

export interface ProgressUpdateRequestInput {
  workItemId: string;
  workItemName?: string;
  currentProgressPct?: number;
  requestedProgressPct: number;
  actorId: string;
  actorRole: PmActorRole;
  photoAttachmentHash?: string | null;
  photoUrl?: string | null;
  approvedBy?: string | null;
  approvedByRole?: PmActorRole | null;
  asOfDate?: string;
}

export type ProgressUpdateStatus =
  | 'approved'
  | 'pending_supervisor_verification'
  | 'rejected_requires_proof'
  | 'rejected_invalid_input';

export interface ProgressUpdateEvaluationResult {
  ok: boolean;
  workItemId: string;
  status: ProgressUpdateStatus;
  reason:
    | null
    | 'photo_or_supervisor_approval_required'
    | 'invalid_progress_pct'
    | 'invalid_actor';
  requestedProgressPct: number;
  effectiveProgressPct: number;
  canMarkCompleted: boolean;
  requiresSupervisorVerification: boolean;
  hasValidPhotoProof: boolean;
  hasValidSupervisorApproval: boolean;
  sodViolation: boolean;
  message: string;
  provenance: PmProvenance;
}

/**
 * Menegakkan aturan keras penyelesaian tahap 100%:
 * - `requestedProgressPct >= 100` WAJIB menyertakan bukti foto valid ATAU persetujuan supervisor (`mandor` / `pm` / `owner`) dengan SoD `approvedBy !== actorId`.
 * - Pekerja tidak pernah bisa menandai selesai 100% sendirian tanpa foto maupun persetujuan mandor/PM.
 */
export function evaluateProgressUpdateRequest(
  input: ProgressUpdateRequestInput,
): ProgressUpdateEvaluationResult {
  const asOfDate = input.asOfDate ?? '1970-01-01';
  const actorId = String(input.actorId ?? '').trim();
  const currentPct = roundPct2(clampPct(Number(input.currentProgressPct ?? 0)));

  if (!actorId) {
    return {
      ok: false,
      workItemId: input.workItemId,
      status: 'rejected_invalid_input',
      reason: 'invalid_actor',
      requestedProgressPct: currentPct,
      effectiveProgressPct: currentPct,
      canMarkCompleted: false,
      requiresSupervisorVerification: false,
      hasValidPhotoProof: false,
      hasValidSupervisorApproval: false,
      sodViolation: false,
      message: 'actorId wajib diisi untuk memperbarui progres pekerjaan.',
      provenance: {
        source: 'pm_progress_proof_guard',
        asOfDate,
        assumptions: ['Validasi identitas pelapor gagal.'],
      },
    };
  }

  if (
    typeof input.requestedProgressPct !== 'number' ||
    !Number.isFinite(input.requestedProgressPct) ||
    input.requestedProgressPct < 0 ||
    input.requestedProgressPct > 100
  ) {
    return {
      ok: false,
      workItemId: input.workItemId,
      status: 'rejected_invalid_input',
      reason: 'invalid_progress_pct',
      requestedProgressPct: currentPct,
      effectiveProgressPct: currentPct,
      canMarkCompleted: false,
      requiresSupervisorVerification: false,
      hasValidPhotoProof: false,
      hasValidSupervisorApproval: false,
      sodViolation: false,
      message: `requestedProgressPct harus berada di rentang 0..100 (diterima: ${input.requestedProgressPct}).`,
      provenance: {
        source: 'pm_progress_proof_guard',
        asOfDate,
        assumptions: ['Validasi rentang progres 0..100%.'],
      },
    };
  }

  const requestedPct = roundPct2(input.requestedProgressPct);
  const hasValidPhotoProof =
    isValidPhotoHash(input.photoAttachmentHash) || isValidPhotoUrl(input.photoUrl);

  const approvedBy = isNonEmpty(input.approvedBy) ? input.approvedBy.trim() : null;
  const sodViolation = Boolean(approvedBy && approvedBy === actorId);
  const hasValidSupervisorApproval = Boolean(
    approvedBy && isSupervisorRole(input.approvedByRole) && !sodViolation,
  );

  if (requestedPct < 100) {
    return {
      ok: true,
      workItemId: input.workItemId,
      status: 'approved',
      reason: null,
      requestedProgressPct: requestedPct,
      effectiveProgressPct: requestedPct,
      canMarkCompleted: false,
      requiresSupervisorVerification: false,
      hasValidPhotoProof,
      hasValidSupervisorApproval,
      sodViolation,
      message: `Progres ${input.workItemName || input.workItemId} diperbarui ke ${requestedPct}%.`,
      provenance: {
        source: 'pm_progress_proof_guard',
        asOfDate,
        assumptions: ['Pembaruan progres di bawah 100% tidak mewajibkan bukti penyelesaian akhir.'],
      },
    };
  }

  if (!hasValidPhotoProof && !hasValidSupervisorApproval) {
    return {
      ok: false,
      workItemId: input.workItemId,
      status: 'rejected_requires_proof',
      reason: 'photo_or_supervisor_approval_required',
      requestedProgressPct: requestedPct,
      effectiveProgressPct: currentPct,
      canMarkCompleted: false,
      requiresSupervisorVerification: true,
      hasValidPhotoProof: false,
      hasValidSupervisorApproval: false,
      sodViolation,
      message: sodViolation
        ? 'Persetujuan diri sendiri ditolak (SoD). Penyelesaian 100% wajib melampirkan bukti foto atau persetujuan mandor/PM lain.'
        : 'Penyelesaian 100% ditolak: wajib melampirkan bukti foto valid atau persetujuan mandor/PM.',
      provenance: {
        source: 'pm_progress_proof_guard',
        asOfDate,
        assumptions: ['Aturan keras G9: progress 100% memerlukan photoAttachmentHash/photoUrl atau SoD approval supervisor.'],
      },
    };
  }

  if (input.actorRole === 'worker' && hasValidPhotoProof && !hasValidSupervisorApproval) {
    return {
      ok: true,
      workItemId: input.workItemId,
      status: 'pending_supervisor_verification',
      reason: null,
      requestedProgressPct: requestedPct,
      effectiveProgressPct: Math.min(99, currentPct),
      canMarkCompleted: false,
      requiresSupervisorVerification: true,
      hasValidPhotoProof: true,
      hasValidSupervisorApproval: false,
      sodViolation,
      message:
        'Bukti foto diterima. Status ditahan pada antrean verifikasi mandor/PM sebelum disahkan 100%.',
      provenance: {
        source: 'pm_progress_proof_guard',
        asOfDate,
        assumptions: [
          'Unggahan foto oleh worker menunggu verifikasi supervisor; status completed 100% belum dikunci.',
        ],
      },
    };
  }

  return {
    ok: true,
    workItemId: input.workItemId,
    status: 'approved',
    reason: null,
    requestedProgressPct: requestedPct,
    effectiveProgressPct: 100,
    canMarkCompleted: true,
    requiresSupervisorVerification: false,
    hasValidPhotoProof,
    hasValidSupervisorApproval,
    sodViolation,
    message: `Penyelesaian 100% untuk ${input.workItemName || input.workItemId} disetujui.`,
    provenance: {
      source: 'pm_progress_proof_guard',
      asOfDate,
      assumptions: [
        hasValidPhotoProof && hasValidSupervisorApproval
          ? 'Bukti foto terlampir dan disetujui supervisor dengan SoD.'
          : hasValidSupervisorApproval
            ? 'Disetujui eksplisit oleh supervisor dengan SoD (approvedBy !== actorId).'
            : 'Diserahkan langsung oleh supervisor dengan bukti foto valid.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Produktivitas & EAC Upah
// ---------------------------------------------------------------------------

export type LaborProductivityWarning = 'labor_overrun' | 'progress_stalled';

export interface EvaluateLaborProductivityInput {
  projectId: string;
  asOfDate: string;
  actualManDays: number;
  actualLaborCostRupiah: number;
  actualProgressPct: number;
  rapLaborBudgetRupiah: number;
  daysWithoutProgress?: number;
  activeWorkersPresent?: boolean;
  manDaysAddedDuringStall?: number;
  overrunToleranceFactor?: number;
}

export interface EvaluateLaborProductivityResult {
  projectId: string;
  asOfDate: string;
  actualManDays: number;
  actualLaborCostRupiah: number;
  rapLaborBudgetRupiah: number;
  actualProgressPct: number;
  eacAvailable: boolean;
  eacLaborCostRupiah: number;
  laborVarianceAtCompletionRupiah: number;
  overrunAmountRupiah: number;
  costPerProgressPctRupiah: number;
  costPerManDayRupiah: number;
  warnings: LaborProductivityWarning[];
  isOverrun: boolean;
  isProgressStalled: boolean;
  provenance: PmProvenance;
}

/**
 * Menghitung produktivitas upah, Estimate at Completion (EAC) upah dari buku besar `hpp_labor`,
 * varians terhadap anggaran RAP upah, serta peringatan `labor_overrun` dan `progress_stalled`.
 */
export function evaluateLaborProductivityAndEac(
  input: EvaluateLaborProductivityInput,
): EvaluateLaborProductivityResult {
  parseYmdUtcMs(input.asOfDate, 'asOfDate');
  const actualManDays = Math.max(0, Math.round(Number(input.actualManDays || 0) * 100) / 100);
  const actualLaborCostRupiah = toRupiah(Math.max(0, Number(input.actualLaborCostRupiah || 0)));
  const rapLaborBudgetRupiah = toRupiah(Math.max(0, Number(input.rapLaborBudgetRupiah || 0)));
  const actualProgressPct = roundPct2(clampPct(Number(input.actualProgressPct || 0)));

  const eacAvailable = actualProgressPct >= 10;
  const eacLaborCostRupiah = eacAvailable
    ? toRupiah(actualLaborCostRupiah / (actualProgressPct / 100))
    : Math.max(rapLaborBudgetRupiah, actualLaborCostRupiah);

  const laborVarianceAtCompletionRupiah = toRupiah(rapLaborBudgetRupiah - eacLaborCostRupiah);
  const overrunAmountRupiah = Math.max(0, toRupiah(eacLaborCostRupiah - rapLaborBudgetRupiah));
  const costPerProgressPctRupiah =
    actualProgressPct > 0 ? toRupiah(actualLaborCostRupiah / actualProgressPct) : 0;
  const costPerManDayRupiah = actualManDays > 0 ? toRupiah(actualLaborCostRupiah / actualManDays) : 0;

  const tolerance =
    typeof input.overrunToleranceFactor === 'number' &&
    Number.isFinite(input.overrunToleranceFactor) &&
    input.overrunToleranceFactor > 0
      ? input.overrunToleranceFactor
      : 1.1;

  const isOverrun =
    rapLaborBudgetRupiah > 0
      ? eacLaborCostRupiah > toRupiah(rapLaborBudgetRupiah * tolerance)
      : actualLaborCostRupiah > 0;

  const daysWithoutProgress = Math.max(0, Math.floor(Number(input.daysWithoutProgress ?? 0)));
  const workersActiveDuringStall =
    input.activeWorkersPresent !== undefined
      ? Boolean(input.activeWorkersPresent)
      : (input.manDaysAddedDuringStall ?? actualManDays) > 0;
  const isProgressStalled = daysWithoutProgress >= 3 && workersActiveDuringStall;

  const warnings: LaborProductivityWarning[] = [];
  if (isOverrun) warnings.push('labor_overrun');
  if (isProgressStalled) warnings.push('progress_stalled');

  return {
    projectId: input.projectId,
    asOfDate: input.asOfDate,
    actualManDays,
    actualLaborCostRupiah,
    rapLaborBudgetRupiah,
    actualProgressPct,
    eacAvailable,
    eacLaborCostRupiah,
    laborVarianceAtCompletionRupiah,
    overrunAmountRupiah,
    costPerProgressPctRupiah,
    costPerManDayRupiah,
    warnings,
    isOverrun,
    isProgressStalled,
    provenance: {
      source: 'pm_labor_productivity_eac',
      asOfDate: input.asOfDate,
      assumptions: [
        'actualLaborCostRupiah bersumber dari buku besar hpp_labor proyek.',
        eacAvailable
          ? `EAC upah = actualLaborCost / (${actualProgressPct}% / 100).`
          : 'Progres < 10%: EAC konservatif memakai max(rapLaborBudget, actualLaborCost).',
        `Ambang labor_overrun: EAC > ${Math.round(tolerance * 100)}% dari RAP upah.`,
        'Ambang progress_stalled: >= 3 hari tanpa progres saat hari kerja/pekerja aktif bertambah.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Material, Stok, & Draf Permintaan Beli
// ---------------------------------------------------------------------------

export interface ProjectMaterialInventoryInput {
  materialId: string;
  materialName: string;
  unit: string;
  currentStockQty: number;
  neededQty: number;
  minStockThreshold: number;
  unitPriceRupiah: number;
  preferredSupplierPartyId?: string | null;
  workItemId?: string | null;
  stageName?: string | null;
}

export interface EvaluateMaterialStockInput {
  projectId: string;
  projectName?: string;
  asOfDate: string;
  materials: ProjectMaterialInventoryInput[];
}

export interface MaterialStockWarning {
  code: 'stock_low';
  materialId: string;
  materialName: string;
  currentStockQty: number;
  neededQty: number;
  minStockThreshold: number;
  message: string;
}

export interface PurchaseRequestDraft {
  draftId: string;
  type: 'purchase_request_draft';
  status: 'pending_human_approval';
  autoOrderAllowed: false;
  requiresHumanApproval: true;
  projectId: string;
  materialId: string;
  materialName: string;
  unit: string;
  currentStockQty: number;
  neededQty: number;
  minStockThreshold: number;
  shortageQty: number;
  recommendedOrderQty: number;
  unitPriceRupiah: number;
  estimatedCostRupiah: number;
  preferredSupplierPartyId: string | null;
  workItemId: string | null;
  stageName: string | null;
  reason: string;
}

export interface EvaluateMaterialStockResult {
  projectId: string;
  asOfDate: string;
  warnings: MaterialStockWarning[];
  hasStockLowWarning: boolean;
  purchaseRequestDrafts: PurchaseRequestDraft[];
  totalEstimatedDraftCostRupiah: number;
  autoOrderAllowed: false;
  provenance: PmProvenance;
}

/**
 * Mengevaluasi kecukupan stok material tahap aktif/berikutnya dan menyusun draf permintaan beli
 * berstatus wajib `'pending_human_approval'` (`autoOrderAllowed: false`).
 */
export function evaluateMaterialAndPurchaseDrafts(
  input: EvaluateMaterialStockInput,
): EvaluateMaterialStockResult {
  parseYmdUtcMs(input.asOfDate, 'asOfDate');
  const warnings: MaterialStockWarning[] = [];
  const purchaseRequestDrafts: PurchaseRequestDraft[] = [];
  let totalEstimatedDraftCostRupiah = 0;

  for (const mat of input.materials) {
    const currentStockQty = Math.max(0, Number(mat.currentStockQty || 0));
    const neededQty = Math.max(0, Number(mat.neededQty || 0));
    const minStockThreshold = Math.max(0, Number(mat.minStockThreshold || 0));
    const unitPriceRupiah = toRupiah(Math.max(0, Number(mat.unitPriceRupiah || 0)));

    const isBelowNeeded = currentStockQty < neededQty;
    const isAtOrBelowThreshold = currentStockQty <= minStockThreshold;

    if (!isBelowNeeded && !isAtOrBelowThreshold) {
      continue;
    }

    const shortageQty = Math.max(0, neededQty - currentStockQty);
    const bufferShortfall = Math.max(0, minStockThreshold - currentStockQty);
    const recommendedOrderQty = isBelowNeeded
      ? Math.max(shortageQty, bufferShortfall)
      : Math.max(1, bufferShortfall);

    const estimatedCostRupiah = toRupiah(recommendedOrderQty * unitPriceRupiah);
    totalEstimatedDraftCostRupiah += estimatedCostRupiah;

    const reason = isBelowNeeded
      ? `Stok ${mat.materialName} (${currentStockQty} ${mat.unit}) kurang dari kebutuhan tahap (${neededQty} ${mat.unit}).`
      : `Stok ${mat.materialName} (${currentStockQty} ${mat.unit}) menyentuh ambang minimum (${minStockThreshold} ${mat.unit}).`;

    warnings.push({
      code: 'stock_low',
      materialId: mat.materialId,
      materialName: mat.materialName,
      currentStockQty,
      neededQty,
      minStockThreshold,
      message: reason,
    });

    purchaseRequestDrafts.push({
      draftId: `pr-${input.projectId}-${mat.materialId}-${input.asOfDate}`,
      type: 'purchase_request_draft',
      status: 'pending_human_approval',
      autoOrderAllowed: false,
      requiresHumanApproval: true,
      projectId: input.projectId,
      materialId: mat.materialId,
      materialName: mat.materialName,
      unit: mat.unit,
      currentStockQty,
      neededQty,
      minStockThreshold,
      shortageQty,
      recommendedOrderQty,
      unitPriceRupiah,
      estimatedCostRupiah,
      preferredSupplierPartyId: mat.preferredSupplierPartyId ?? null,
      workItemId: mat.workItemId ?? null,
      stageName: mat.stageName ?? null,
      reason,
    });
  }

  return {
    projectId: input.projectId,
    asOfDate: input.asOfDate,
    warnings,
    hasStockLowWarning: warnings.length > 0,
    purchaseRequestDrafts,
    totalEstimatedDraftCostRupiah: toRupiah(totalEstimatedDraftCostRupiah),
    autoOrderAllowed: false,
    provenance: {
      source: 'pm_material_stock_guard',
      asOfDate: input.asOfDate,
      assumptions: [
        'Peringatan stock_low terpicu saat currentStockQty < neededQty atau currentStockQty <= minStockThreshold.',
        'Semua draf pembelian dikunci pada status pending_human_approval dengan autoOrderAllowed=false.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Laporan Harian Proyek Pemilik & Klien
// ---------------------------------------------------------------------------

export type DailyReportAudience = 'owner' | 'client';

export interface DailyReportAttendanceEntry {
  workerId: string;
  workerName: string;
  role: string;
  dayFraction: number;
  workItemName?: string | null;
  dailyRateRupiah?: number | null;
  laborCostRupiah?: number | null;
  kasbonBalanceRupiah?: number | null;
}

export interface DailyReportStageEntry {
  workItemId: string;
  name: string;
  plannedPct: number;
  actualPct: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

export interface DailyReportPhotoEntry {
  id: string;
  workItemId?: string | null;
  stageName?: string | null;
  photoUrl?: string | null;
  photoAttachmentHash?: string | null;
  caption?: string | null;
  capturedAt: string;
}

export interface DailyReportIssueEntry {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'done';
  workItemId?: string | null;
}

export interface DailyReportScheduleSummary {
  plannedProgressPct: number;
  actualProgressPct: number;
  scheduleSlipDays: number;
  projectedCompletionDate: string;
}

export interface DailyReportInternalFinancials {
  actualLaborCostRupiah: number;
  rapLaborBudgetRupiah: number;
  eacLaborCostRupiah: number;
  laborVarianceAtCompletionRupiah: number;
  projectedMarginRupiah: number;
  totalKasbonOutstandingRupiah: number;
}

export interface BuildDailyProjectReportInput {
  projectId: string;
  projectName: string;
  reportDate: string;
  audience: DailyReportAudience;
  clientReportEnabled?: boolean;
  attendance: DailyReportAttendanceEntry[];
  stages: DailyReportStageEntry[];
  issues: DailyReportIssueEntry[];
  photos: DailyReportPhotoEntry[];
  scheduleSummary: DailyReportScheduleSummary;
  internalFinancials?: DailyReportInternalFinancials;
}

export interface OwnerDailyProjectReport {
  audience: 'owner';
  projectId: string;
  projectName: string;
  reportDate: string;
  workersPresentCount: number;
  totalManDays: number;
  attendance: Array<{
    workerId: string;
    workerName: string;
    role: string;
    dayFraction: number;
    workItemName: string | null;
    dailyRateRupiah: number;
    laborCostRupiah: number;
    kasbonBalanceRupiah: number;
  }>;
  stages: DailyReportStageEntry[];
  issues: DailyReportIssueEntry[];
  photos: DailyReportPhotoEntry[];
  schedule: DailyReportScheduleSummary;
  internalMetrics: {
    actualLaborCostRupiah: number;
    rapLaborBudgetRupiah: number;
    eacLaborCostRupiah: number;
    laborVarianceAtCompletionRupiah: number;
    projectedMarginRupiah: number;
    totalKasbonOutstandingRupiah: number;
  };
  summaryText: string;
}

export interface ClientSafeDailyProjectReport {
  audience: 'client';
  projectId: string;
  projectName: string;
  reportDate: string;
  workersPresentCount: number;
  presentTeam: Array<{
    workerName: string;
    role: string;
    workItemName: string | null;
  }>;
  stages: DailyReportStageEntry[];
  issues: DailyReportIssueEntry[];
  photos: DailyReportPhotoEntry[];
  schedule: DailyReportScheduleSummary;
  summaryText: string;
}

export type BuildDailyProjectReportResult =
  | {
      ok: true;
      status: 'ready';
      reason: null;
      audience: 'owner';
      internalFinancialsStripped: false;
      report: OwnerDailyProjectReport;
      provenance: PmProvenance;
    }
  | {
      ok: true;
      status: 'ready';
      reason: null;
      audience: 'client';
      internalFinancialsStripped: true;
      report: ClientSafeDailyProjectReport;
      provenance: PmProvenance;
    }
  | {
      ok: false;
      status: 'client_report_disabled';
      reason: 'client_report_disabled';
      audience: 'client';
      internalFinancialsStripped: true;
      report: null;
      provenance: PmProvenance;
    };

/**
 * Menyusun laporan harian proyek untuk mode `'owner'` (dengan metrik upah/EAC/margin internal)
 * maupun mode `'client'` (wajib menyaring seluruh tarif, biaya upah, kasbon, EAC, dan margin).
 */
export function buildDailyProjectReport(
  input: BuildDailyProjectReportInput,
): BuildDailyProjectReportResult {
  parseYmdUtcMs(input.reportDate, 'reportDate');

  const uniqueWorkerIds = new Set(input.attendance.map((a) => a.workerId));
  const totalManDays = Math.round(
    input.attendance.reduce((sum, a) => sum + Math.max(0, a.dayFraction || 0), 0) * 100,
  ) / 100;

  if (input.audience === 'client') {
    if (!input.clientReportEnabled) {
      return {
        ok: false,
        status: 'client_report_disabled',
        reason: 'client_report_disabled',
        audience: 'client',
        internalFinancialsStripped: true,
        report: null,
        provenance: {
          source: 'pm_daily_report_client_guard',
          asOfDate: input.reportDate,
          assumptions: ['Pelaporan klien dinonaktifkan pada pengaturan proyek.'],
        },
      };
    }

    const sanitizedIssues: DailyReportIssueEntry[] = input.issues.map((issue) => ({
      id: issue.id,
      title: sanitizeClientText(issue.title) || 'Catatan lapangan',
      severity: issue.severity,
      status: issue.status,
      workItemId: issue.workItemId ?? null,
    }));

    const sanitizedPhotos: DailyReportPhotoEntry[] = input.photos.map((photo) => ({
      id: photo.id,
      workItemId: photo.workItemId ?? null,
      stageName: photo.stageName ?? null,
      photoUrl: photo.photoUrl ?? null,
      photoAttachmentHash: photo.photoAttachmentHash ?? null,
      caption: sanitizeClientText(photo.caption),
      capturedAt: photo.capturedAt,
    }));

    const presentTeam = input.attendance.map((a) => ({
      workerName: a.workerName,
      role: a.role,
      workItemName: a.workItemName ?? null,
    }));

    const summaryText =
      `Laporan Harian ${input.projectName} (${input.reportDate}): ` +
      `Progres aktual ${input.scheduleSummary.actualProgressPct}% (rencana ${input.scheduleSummary.plannedProgressPct}%), ` +
      `${uniqueWorkerIds.size} personel hadir, ${sanitizedPhotos.length} dokumentasi foto, ` +
      `estimasi selesai ${input.scheduleSummary.projectedCompletionDate}.`;

    return {
      ok: true,
      status: 'ready',
      reason: null,
      audience: 'client',
      internalFinancialsStripped: true,
      report: {
        audience: 'client',
        projectId: input.projectId,
        projectName: input.projectName,
        reportDate: input.reportDate,
        workersPresentCount: uniqueWorkerIds.size,
        presentTeam,
        stages: input.stages.map((s) => ({ ...s })),
        issues: sanitizedIssues,
        photos: sanitizedPhotos,
        schedule: { ...input.scheduleSummary },
        summaryText,
      },
      provenance: {
        source: 'pm_daily_report_client',
        asOfDate: input.reportDate,
        assumptions: [
          'Mode klien hanya memuat progres fisik, jadwal, kehadiran tim tanpa tarif, catatan lapangan tersanitasi, dan foto dokumentasi.',
        ],
      },
    };
  }

  const normalizedAttendance = input.attendance.map((a) => ({
    workerId: a.workerId,
    workerName: a.workerName,
    role: a.role,
    dayFraction: a.dayFraction,
    workItemName: a.workItemName ?? null,
    dailyRateRupiah: toRupiah(Math.max(0, Number(a.dailyRateRupiah ?? 0))),
    laborCostRupiah: toRupiah(Math.max(0, Number(a.laborCostRupiah ?? 0))),
    kasbonBalanceRupiah: toRupiah(Math.max(0, Number(a.kasbonBalanceRupiah ?? 0))),
  }));

  const fin = input.internalFinancials;
  const derivedLaborCost = normalizedAttendance.reduce((s, a) => s + a.laborCostRupiah, 0);
  const derivedKasbon = normalizedAttendance.reduce((s, a) => s + a.kasbonBalanceRupiah, 0);

  const internalMetrics = {
    actualLaborCostRupiah: toRupiah(fin?.actualLaborCostRupiah ?? derivedLaborCost),
    rapLaborBudgetRupiah: toRupiah(fin?.rapLaborBudgetRupiah ?? 0),
    eacLaborCostRupiah: toRupiah(fin?.eacLaborCostRupiah ?? 0),
    laborVarianceAtCompletionRupiah: toRupiah(fin?.laborVarianceAtCompletionRupiah ?? 0),
    projectedMarginRupiah: toRupiah(fin?.projectedMarginRupiah ?? 0),
    totalKasbonOutstandingRupiah: toRupiah(fin?.totalKasbonOutstandingRupiah ?? derivedKasbon),
  };

  const summaryText =
    `Laporan Owner ${input.projectName} (${input.reportDate}): ` +
    `${uniqueWorkerIds.size} pekerja (${totalManDays} hari-orang), progres ${input.scheduleSummary.actualProgressPct}% ` +
    `(target ${input.scheduleSummary.plannedProgressPct}%), upah aktual Rp ${internalMetrics.actualLaborCostRupiah}, ` +
    `EAC upah Rp ${internalMetrics.eacLaborCostRupiah}.`;

  return {
    ok: true,
    status: 'ready',
    reason: null,
    audience: 'owner',
    internalFinancialsStripped: false,
    report: {
      audience: 'owner',
      projectId: input.projectId,
      projectName: input.projectName,
      reportDate: input.reportDate,
      workersPresentCount: uniqueWorkerIds.size,
      totalManDays,
      attendance: normalizedAttendance,
      stages: input.stages.map((s) => ({ ...s })),
      issues: input.issues.map((i) => ({ ...i })),
      photos: input.photos.map((p) => ({ ...p })),
      schedule: { ...input.scheduleSummary },
      internalMetrics,
      summaryText,
    },
    provenance: {
      source: 'pm_daily_report_owner',
      asOfDate: input.reportDate,
      assumptions: [
        'Mode owner menyertakan rincian tarif harian, biaya upah aktual, EAC upah, kasbon, dan proyeksi margin.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Risiko Keterlambatan & Dampak ke Tagihan Termin
// ---------------------------------------------------------------------------

export interface ProjectTerminMilestoneInput {
  id: string;
  label?: string;
  dueDate: string; // YYYY-MM-DD
  amountRupiah: number;
  requiredProgressPct: number;
  status?: 'pending' | 'invoiced' | 'paid';
}

export interface EvaluateDelayAndTerminInput {
  projectId: string;
  projectName?: string;
  partyId?: string | null;
  partyName?: string | null;
  asOfDate: string;
  projectStartDate: string;
  projectEndDate: string;
  plannedProgressPct: number;
  actualProgressPct: number;
  termins: ProjectTerminMilestoneInput[];
}

export interface BlockedTerminDetail {
  terminId: string;
  label: string;
  dueDate: string;
  amountRupiah: number;
  requiredProgressPct: number;
  actualProgressPct: number;
  shortfallPct: number;
  estimatedCashInDelayDays: number;
  projectedEligibleDate: string;
  status: 'termin_blocked_by_progress_delay';
}

export interface AtRiskTerminDetail {
  terminId: string;
  label: string;
  dueDate: string;
  amountRupiah: number;
  requiredProgressPct: number;
  projectedEligibleDate: string;
  estimatedCashInDelayDays: number;
}

export interface EvaluateDelayAndTerminResult {
  projectId: string;
  asOfDate: string;
  status: 'on_track' | 'at_risk' | 'termin_blocked_by_progress_delay';
  plannedProgressPct: number;
  actualProgressPct: number;
  progressGapPct: number;
  scheduleSlipDays: number;
  projectedCompletionDate: string;
  blockedTermins: BlockedTerminDetail[];
  atRiskTermins: AtRiskTerminDetail[];
  blockedTerminAmountRupiah: number;
  estimatedCashInDelayDays: number;
  advisorWhatIfScenario: AdvisorWhatIfScenario | null;
  provenance: PmProvenance;
}

/**
 * Menghitung keterlambatan jadwal (`scheduleSlipDays`, `projectedCompletionDate`) dan mengevaluasi
 * tagihan termin yang mensyaratkan progres minimum, siap dikoordinasikan ke `runAdvisorWhatIf`.
 */
export function evaluateDelayAndTerminImpact(
  input: EvaluateDelayAndTerminInput,
): EvaluateDelayAndTerminResult {
  parseYmdUtcMs(input.asOfDate, 'asOfDate');
  parseYmdUtcMs(input.projectStartDate, 'projectStartDate');
  parseYmdUtcMs(input.projectEndDate, 'projectEndDate');

  const totalPlannedDays = diffDaysInclusive(input.projectStartDate, input.projectEndDate);
  const elapsedDays = Math.max(
    1,
    diffDaysSigned(input.projectStartDate, input.asOfDate, 'projectStartDate', 'asOfDate') + 1,
  );
  const plannedPct = roundPct2(clampPct(input.plannedProgressPct));
  const actualPct = roundPct2(clampPct(input.actualProgressPct));
  const progressGapPct = roundPct2(Math.max(0, plannedPct - actualPct));

  let scheduleSlipDays = 0;
  if (actualPct < plannedPct) {
    const rawSlip = Math.round(((plannedPct - actualPct) / 100) * totalPlannedDays);
    scheduleSlipDays = Math.max(1, rawSlip);
  }
  const overduePastEnd = diffDaysSigned(input.projectEndDate, input.asOfDate, 'projectEndDate', 'asOfDate');
  if (overduePastEnd > 0 && actualPct < 100) {
    scheduleSlipDays = Math.max(scheduleSlipDays, overduePastEnd);
  }

  const projectedCompletionDate = shiftYmd(input.projectEndDate, scheduleSlipDays, 'projectEndDate');

  const dailyActualPacePct =
    actualPct > 0 ? actualPct / elapsedDays : 100 / totalPlannedDays;

  const blockedTermins: BlockedTerminDetail[] = [];
  const atRiskTermins: AtRiskTerminDetail[] = [];
  let blockedTerminAmountRupiah = 0;
  let maxDelayDays = 0;

  for (const termin of input.termins) {
    parseYmdUtcMs(termin.dueDate, `termin(${termin.id}).dueDate`);
    if (termin.status === 'paid') continue;

    const requiredPct = roundPct2(clampPct(termin.requiredProgressPct));
    const amountRupiah = toRupiah(Math.max(0, Number(termin.amountRupiah || 0)));
    const label = termin.label || termin.id;

    if (actualPct >= requiredPct) continue;

    const shortfallPct = roundPct2(requiredPct - actualPct);
    const daysNeededFromAsOf = Math.max(
      1,
      Math.ceil(shortfallPct / Math.max(0.01, dailyActualPacePct)),
    );
    const projectedEligibleDate = shiftYmd(input.asOfDate, daysNeededFromAsOf, 'asOfDate');
    const dueToEligibleDays = diffDaysSigned(
      termin.dueDate,
      projectedEligibleDate,
      'termin.dueDate',
      'projectedEligibleDate',
    );
    const estimatedCashInDelayDays = Math.max(1, dueToEligibleDays);
    const isDueOrPast =
      diffDaysSigned(termin.dueDate, input.asOfDate, 'termin.dueDate', 'asOfDate') >= 0;

    if (isDueOrPast) {
      blockedTermins.push({
        terminId: termin.id,
        label,
        dueDate: termin.dueDate,
        amountRupiah,
        requiredProgressPct: requiredPct,
        actualProgressPct: actualPct,
        shortfallPct,
        estimatedCashInDelayDays,
        projectedEligibleDate,
        status: 'termin_blocked_by_progress_delay',
      });
      blockedTerminAmountRupiah += amountRupiah;
      maxDelayDays = Math.max(maxDelayDays, estimatedCashInDelayDays);
    } else if (dueToEligibleDays > 0) {
      atRiskTermins.push({
        terminId: termin.id,
        label,
        dueDate: termin.dueDate,
        amountRupiah,
        requiredProgressPct: requiredPct,
        projectedEligibleDate,
        estimatedCashInDelayDays,
      });
    }
  }

  const status: EvaluateDelayAndTerminResult['status'] =
    blockedTermins.length > 0
      ? 'termin_blocked_by_progress_delay'
      : scheduleSlipDays > 0 || atRiskTermins.length > 0
        ? 'at_risk'
        : 'on_track';

  const advisorWhatIfScenario: AdvisorWhatIfScenario | null =
    blockedTermins.length > 0 && isNonEmpty(input.partyId)
      ? {
          kind: 'client_delay',
          partyId: input.partyId.trim(),
          partyName: input.partyName ?? undefined,
          delayDays: maxDelayDays,
        }
      : null;

  return {
    projectId: input.projectId,
    asOfDate: input.asOfDate,
    status,
    plannedProgressPct: plannedPct,
    actualProgressPct: actualPct,
    progressGapPct,
    scheduleSlipDays,
    projectedCompletionDate,
    blockedTermins,
    atRiskTermins,
    blockedTerminAmountRupiah: toRupiah(blockedTerminAmountRupiah),
    estimatedCashInDelayDays: maxDelayDays,
    advisorWhatIfScenario,
    provenance: {
      source: 'pm_delay_termin_impact',
      asOfDate: input.asOfDate,
      assumptions: [
        `Total durasi rencana ${totalPlannedDays} hari (${input.projectStartDate} s.d. ${input.projectEndDate}).`,
        'scheduleSlipDays dihitung dari selisih progres rencana vs aktual terhadap total durasi jadwal.',
        'Termin berstatus belum lunas yang sudah jatuh tempo namun actualProgressPct < requiredProgressPct ditandai termin_blocked_by_progress_delay.',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Todo Otomatis dari Kendala & Penutupan Berbukti
// ---------------------------------------------------------------------------

export type PmTodoIssueType = 'field_issue' | 'stock_low' | 'safety' | 'quality' | 'delay';

export interface CreateTodoFromIssueInput {
  id?: string;
  projectId: string;
  workItemId?: string | null;
  issueType: PmTodoIssueType;
  title: string;
  description?: string | null;
  stagePicWorkerId?: string | null;
  fallbackPicId?: string | null;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: string;
}

export interface PmTodoItem {
  id: string;
  projectId: string;
  workItemId: string | null;
  issueType: PmTodoIssueType;
  title: string;
  description: string | null;
  assigneeWorkerId: string | null;
  status: 'open' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  requiresClosureProof: true;
  closureProofHash: string | null;
  confirmedBy: string | null;
  confirmedByRole: PmSupervisorRole | null;
  resolutionNote: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface CloseTodoWithProofInput {
  todo: PmTodoItem;
  closedBy: string;
  closedByRole: PmActorRole;
  proofAttachmentHash?: string | null;
  confirmedBy?: string | null;
  confirmedByRole?: PmActorRole | null;
  closedAt?: string;
  resolutionNote?: string | null;
}

export interface CloseTodoWithProofResult {
  ok: boolean;
  reason: null | 'closure_proof_required' | 'already_closed';
  todo: PmTodoItem;
  message: string;
  provenance: PmProvenance;
}

/**
 * Membuat todo otomatis dari kendala lapangan / kekurangan stok dan menugaskannya ke PIC tahap.
 */
export function createTodoFromIssue(input: CreateTodoFromIssueInput): PmTodoItem {
  parseYmdUtcMs(input.dueDate, 'dueDate');
  const assigneeWorkerId = isNonEmpty(input.stagePicWorkerId)
    ? input.stagePicWorkerId.trim()
    : isNonEmpty(input.fallbackPicId)
      ? input.fallbackPicId.trim()
      : null;

  const defaultPriority: PmTodoItem['priority'] =
    input.issueType === 'safety'
      ? 'urgent'
      : input.issueType === 'stock_low' || input.issueType === 'delay'
        ? 'high'
        : 'medium';

  const sanitizedSlug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);

  return {
    id: input.id || `todo-${input.projectId}-${input.issueType}-${sanitizedSlug || 'item'}-${input.dueDate}`,
    projectId: input.projectId,
    workItemId: input.workItemId ?? null,
    issueType: input.issueType,
    title: input.title.trim(),
    description: input.description ?? null,
    assigneeWorkerId,
    status: 'open',
    priority: input.priority ?? defaultPriority,
    dueDate: input.dueDate,
    requiresClosureProof: true,
    closureProofHash: null,
    confirmedBy: null,
    confirmedByRole: null,
    resolutionNote: null,
    createdAt: input.createdAt ?? input.dueDate,
    closedAt: null,
  };
}

/**
 * Menutup todo dengan syarat wajib bukti foto (`proofAttachmentHash`) atau konfirmasi mandor/PM.
 */
export function closeTodoWithProof(input: CloseTodoWithProofInput): CloseTodoWithProofResult {
  const closedAt = input.closedAt ?? input.todo.dueDate;

  if (input.todo.status === 'done') {
    return {
      ok: false,
      reason: 'already_closed',
      todo: input.todo,
      message: `Todo "${input.todo.title}" sudah berstatus selesai.`,
      provenance: {
        source: 'pm_todo_closure_guard',
        asOfDate: closedAt,
        assumptions: ['Todo yang sudah ditutup tidak dapat ditutup ulang.'],
      },
    };
  }

  const closedBy = String(input.closedBy ?? '').trim();
  const hasProofHash = isValidPhotoHash(input.proofAttachmentHash);
  const confirmedBy = isNonEmpty(input.confirmedBy) ? input.confirmedBy.trim() : null;
  const hasSupervisorConfirmation = Boolean(
    confirmedBy &&
      isSupervisorRole(input.confirmedByRole) &&
      (input.closedByRole !== 'worker' || confirmedBy !== closedBy),
  );

  if (!hasProofHash && !hasSupervisorConfirmation) {
    return {
      ok: false,
      reason: 'closure_proof_required',
      todo: input.todo,
      message:
        'Penutupan todo ditolak: wajib melampirkan proofAttachmentHash atau konfirmasi mandor/PM.',
      provenance: {
        source: 'pm_todo_closure_guard',
        asOfDate: closedAt,
        assumptions: ['Penutupan todo dari kendala lapangan wajib berbukti foto atau verifikasi supervisor.'],
      },
    };
  }

  const closedTodo: PmTodoItem = {
    ...input.todo,
    status: 'done',
    closureProofHash: hasProofHash ? input.proofAttachmentHash!.trim() : null,
    confirmedBy: hasSupervisorConfirmation ? confirmedBy : null,
    confirmedByRole: hasSupervisorConfirmation ? (input.confirmedByRole as PmSupervisorRole) : null,
    resolutionNote: input.resolutionNote ?? null,
    closedAt,
  };

  return {
    ok: true,
    reason: null,
    todo: closedTodo,
    message: `Todo "${input.todo.title}" ditutup dengan bukti sah.`,
    provenance: {
      source: 'pm_todo_closure_guard',
      asOfDate: closedAt,
      assumptions: [
        hasProofHash
          ? 'Bukti penutupan berbasis proofAttachmentHash terlampir.'
          : 'Ditutup dengan konfirmasi eksplisit mandor/PM.',
      ],
    },
  };
}
