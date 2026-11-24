import {
  filterHrdRecordsByRole,
  type HrdWorkerPayRecord,
} from './hrdGovernance';
import {
  computeKasbonSettlement,
  resolveAttendanceProjectFromSchedule,
  type DailyAssignmentSchedule,
} from './hrdPayroll';
import { toRupiah } from './journal';

/**
 * Model UX yang Meringankan & Pengukur Beban Deterministik (G11).
 *
 * Prinsip keras:
 * 1. Layar tukang, mandor, dan layar keputusan pagi PM/pemilik menggunakan Bahasa Indonesia
 *    sehari-hari dengan 0 jargon akuntansi teknis (`assertNoAccountingJargon`).
 * 2. Pre-fill proyek tukang berasal dari jadwal PM / tugas terassign (`resolveAttendanceProjectFromSchedule`),
 *    TIDAK PERNAH menebak proyek aktif pertama saat pekerja belum ditugaskan.
 * 3. Mandor tidak pernah melihat tarif/gaji/kasbon pekerja lain (enforced lewat `filterHrdRecordsByRole` G8).
 * 4. Layar pagi pemilik/PM maksimal 5 keputusan dengan aksi 1-ketukan Setujui / Tolak.
 * 5. Antrean offline menjaga urutan kronologis & idempoten (`idempotencyKey`).
 */

export const MIN_TOUCH_TARGET_PX = 44;
export const RECOMMENDED_TOUCH_TARGET_PX = 48;
export const MAX_MORNING_DECISIONS = 5;

export const ACCOUNTING_JARGON_TERMS = [
  'debit',
  'kredit',
  'jurnal',
  'hpp',
  'liabilitas',
  'ekuitas',
  'akrual',
  'aktiva',
  'pasiva',
  'neraca',
  'buku besar',
  'posting',
  'coa',
  'rekonsiliasi',
] as const;

export type AccountingJargonTerm = (typeof ACCOUNTING_JARGON_TERMS)[number];

export interface AccountingJargonCheckResult {
  ok: boolean;
  forbiddenTermsFound: AccountingJargonTerm[];
}

/**
 * Memeriksa bahwa teks layar pengguna lapangan/pemilik tidak mengandung jargon akuntansi teknis.
 */
export function assertNoAccountingJargon(text: string): AccountingJargonCheckResult {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { ok: true, forbiddenTermsFound: [] };
  }

  const found: AccountingJargonTerm[] = [];
  for (const term of ACCOUNTING_JARGON_TERMS) {
    const escaped = term.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(normalized)) {
      found.push(term);
    }
  }

  return {
    ok: found.length === 0,
    forbiddenTermsFound: found,
  };
}

function formatRupiahId(amount: number): string {
  const rounded = toRupiah(amount);
  const abs = Math.abs(rounded);
  const formatted = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

function formatNumberId(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace('.', ',');
}

function collectVisibleStrings(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) bucket.push(trimmed);
    return bucket;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectVisibleStrings(item, bucket);
    }
    return bucket;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      // Lewati field teknis ID/hash/key agar tidak menimbulkan false positive
      if (
        key === 'id' ||
        key === 'orgId' ||
        key === 'workerId' ||
        key === 'mandorId' ||
        key === 'projectId' ||
        key === 'idempotencyKey' ||
        key === 'sourceWorkItemId'
      ) {
        continue;
      }
      collectVisibleStrings(entry, bucket);
    }
  }
  return bucket;
}

export interface WorkerAssignableProject {
  id: string;
  name?: string;
  status?: string | null;
}

export interface WorkerWorkItemBrief {
  id: string;
  project_id: string;
  assigned_member_id?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  progress_pct?: number | null;
  status?: string | null;
}

export interface SelectInitialWorkerProjectInput {
  workerId: string;
  memberIds?: string[];
  workDate: string; // YYYY-MM-DD
  projects: WorkerAssignableProject[];
  workItems?: WorkerWorkItemBrief[];
  dailyAssignments?: DailyAssignmentSchedule[];
}

export interface SelectInitialWorkerProjectResult {
  projectId: string | null;
  projectName: string | null;
  source: 'pm_schedule' | 'assigned_work_item' | 'unassigned' | 'ambiguous_schedule';
  autoFilledFromPlan: boolean;
  needsExplicitChoice: boolean;
  candidateProjectIds: string[];
}

/**
 * Menentukan proyek awal tukang secara deterministik dari jadwal PM atau work item terassign.
 * Tidak pernah menebak proyek aktif pertama apabila pekerja tidak ditugaskan ke sana.
 */
export function selectInitialWorkerProjectId(
  input: SelectInitialWorkerProjectInput,
): SelectInitialWorkerProjectResult {
  const projectsById = new Map(input.projects.map((p) => [p.id, p]));
  const workDate = String(input.workDate || '').slice(0, 10);

  if (input.dailyAssignments && input.dailyAssignments.length > 0) {
    const validAssignments = input.dailyAssignments.filter((a) => projectsById.has(a.projectId));
    const scheduleRes = resolveAttendanceProjectFromSchedule(
      input.workerId,
      workDate,
      validAssignments,
    );

    if (scheduleRes.source === 'pm_schedule' && scheduleRes.resolvedProjectId) {
      return {
        projectId: scheduleRes.resolvedProjectId,
        projectName: projectsById.get(scheduleRes.resolvedProjectId)?.name ?? null,
        source: 'pm_schedule',
        autoFilledFromPlan: true,
        needsExplicitChoice: false,
        candidateProjectIds: [scheduleRes.resolvedProjectId],
      };
    }

    if (scheduleRes.source === 'ambiguous_schedule') {
      return {
        projectId: null,
        projectName: null,
        source: 'ambiguous_schedule',
        autoFilledFromPlan: false,
        needsExplicitChoice: true,
        candidateProjectIds: scheduleRes.plannedProjectIds,
      };
    }
  }

  const memberIdSet = new Set(
    [input.workerId, ...(input.memberIds ?? [])]
      .map((s) => String(s ?? '').trim())
      .filter(Boolean),
  );

  const openAssignedItems = (input.workItems ?? []).filter((wi) => {
    if (!wi.assigned_member_id || !memberIdSet.has(wi.assigned_member_id)) return false;
    if (!projectsById.has(wi.project_id)) return false;
    const pct = Number(wi.progress_pct ?? 0);
    if (wi.status === 'completed' || pct >= 100) return false;
    return true;
  });

  if (openAssignedItems.length > 0) {
    const itemsCoveringToday = openAssignedItems.filter((wi) => {
      const start = (wi.planned_start || '').slice(0, 10);
      const end = (wi.planned_end || '').slice(0, 10);
      const afterStart = !start || start <= workDate;
      const beforeEnd = !end || workDate <= end;
      return afterStart && beforeEnd;
    });

    const sourceItems = itemsCoveringToday.length > 0 ? itemsCoveringToday : openAssignedItems;
    const derivedSchedule: DailyAssignmentSchedule[] = sourceItems.map((wi) => ({
      workerId: input.workerId,
      projectId: wi.project_id,
      projectName: projectsById.get(wi.project_id)?.name,
      workDate,
      sourceWorkItemId: wi.id,
    }));

    const itemRes = resolveAttendanceProjectFromSchedule(
      input.workerId,
      workDate,
      derivedSchedule,
    );

    if (itemRes.source === 'pm_schedule' && itemRes.resolvedProjectId) {
      return {
        projectId: itemRes.resolvedProjectId,
        projectName: projectsById.get(itemRes.resolvedProjectId)?.name ?? null,
        source: 'assigned_work_item',
        autoFilledFromPlan: true,
        needsExplicitChoice: false,
        candidateProjectIds: [itemRes.resolvedProjectId],
      };
    }

    if (itemRes.source === 'ambiguous_schedule') {
      return {
        projectId: null,
        projectName: null,
        source: 'ambiguous_schedule',
        autoFilledFromPlan: false,
        needsExplicitChoice: true,
        candidateProjectIds: itemRes.plannedProjectIds,
      };
    }
  }

  return {
    projectId: null,
    projectName: null,
    source: 'unassigned',
    autoFilledFromPlan: false,
    needsExplicitChoice: true,
    candidateProjectIds: [],
  };
}

export interface WorkerTodayWageBreakdown {
  workedDays: number;
  dailyRateRupiah: number;
  grossWageRupiah: number;
  kasbonDeductionRupiah: number;
  netTakeHomeRupiah: number;
  remainingKasbonRupiah: number;
  formulaLabel: string;
  remainingKasbonLabel: string;
  summaryLines: string[];
}

export interface WorkerTodayProjectChoice {
  projectId: string;
  projectName: string;
}

export interface WorkerTodayTaskSummary {
  id: string;
  title: string;
  progressPct: number;
  projectId: string;
}

export interface WorkerTodayViewInput {
  workerId: string;
  workerName: string;
  workDate: string;
  dailyAssignments: DailyAssignmentSchedule[];
  projects: Array<{ id: string; name: string }>;
  selectedProjectId?: string | null;
  checkedIn?: boolean;
  checkedOut?: boolean;
  workedHoursToday?: number;
  workedDaysInPeriod?: number;
  dailyRateRupiah: number;
  openingKasbonRupiah: number;
  maxKasbonDeductionPct?: number;
  kasbonDeductionRupiah?: number | null;
  assignedTasks?: WorkerTodayTaskSummary[];
}

export interface WorkerTodayView {
  workerId: string;
  workerName: string;
  workDate: string;
  projectId: string | null;
  projectName: string | null;
  projectAutoFilledFromPlan: boolean;
  requiresExplicitProjectChoice: boolean;
  projectPromptLabel: string;
  availableProjectChoices: WorkerTodayProjectChoice[];
  tapsToCheckIn: number;
  requiresNumericTyping: false;
  primaryActionLabel: string;
  hoursTodayLabel: string;
  todayWageBreakdown: WorkerTodayWageBreakdown;
  tasks: WorkerTodayTaskSummary[];
  minTouchTargetPx: number;
}

/**
 * Menyusun model layar tukang "Hari Ini" yang ringkas (maks 2 ketukan check-in,
 * 0 ketik angka, pre-fill jadwal PM, dan rincian upah sehari-hari).
 */
export function buildWorkerTodayView(input: WorkerTodayViewInput): WorkerTodayView {
  const projectsById = new Map(input.projects.map((p) => [p.id, p]));
  const validAssignments = input.dailyAssignments.filter((a) => projectsById.has(a.projectId));
  const selectedId = input.selectedProjectId?.trim() || null;

  const resolution = resolveAttendanceProjectFromSchedule(
    input.workerId,
    input.workDate,
    validAssignments,
    selectedId,
  );

  let projectId: string | null = null;
  let projectAutoFilledFromPlan = false;
  let requiresExplicitProjectChoice = false;

  if (resolution.source === 'pm_schedule' && resolution.resolvedProjectId) {
    projectId = resolution.resolvedProjectId;
    projectAutoFilledFromPlan = !selectedId || selectedId === resolution.resolvedProjectId;
    requiresExplicitProjectChoice = false;
  } else if (selectedId && projectsById.has(selectedId)) {
    projectId = selectedId;
    projectAutoFilledFromPlan = false;
    requiresExplicitProjectChoice = false;
  } else {
    // Jangan pernah menebak proyek aktif pertama saat tidak ada jadwal!
    projectId = null;
    projectAutoFilledFromPlan = false;
    requiresExplicitProjectChoice = true;
  }

  const projectName = projectId
    ? projectsById.get(projectId)?.name ??
      validAssignments.find((a) => a.projectId === projectId)?.projectName ??
      'Proyek Terjadwal'
    : null;

  const candidateIds =
    resolution.plannedProjectIds.length > 0
      ? resolution.plannedProjectIds
      : input.projects.map((p) => p.id);

  const availableProjectChoices: WorkerTodayProjectChoice[] = candidateIds
    .filter((id, idx, arr) => arr.indexOf(id) === idx && projectsById.has(id))
    .map((id) => ({
      projectId: id,
      projectName: projectsById.get(id)!.name,
    }));

  const tapsToCheckIn = projectId ? 1 : 2;
  const workedHours = Math.max(0, Number(input.workedHoursToday ?? 0));
  const hoursTodayLabel = input.checkedOut
    ? `Selesai kerja (${formatNumberId(workedHours)} jam)`
    : input.checkedIn
      ? `Sedang kerja (${formatNumberId(workedHours)} jam)`
      : workedHours > 0
        ? `${formatNumberId(workedHours)} jam hari ini`
        : 'Belum masuk hari ini';

  const workedDaysRaw =
    input.workedDaysInPeriod != null
      ? Math.max(0, Number(input.workedDaysInPeriod))
      : workedHours > 0
        ? Math.round((workedHours / 8) * 100) / 100
        : 0;

  const dailyRateRupiah = Math.max(0, toRupiah(input.dailyRateRupiah));
  const grossWageRupiah = Math.max(0, toRupiah(workedDaysRaw * dailyRateRupiah));
  const openingKasbonRupiah = Math.max(0, toRupiah(input.openingKasbonRupiah));

  let kasbonDeductionRupiah = 0;
  let netTakeHomeRupiah = grossWageRupiah;
  let remainingKasbonRupiah = openingKasbonRupiah;

  if (input.kasbonDeductionRupiah != null) {
    kasbonDeductionRupiah = Math.min(
      openingKasbonRupiah,
      grossWageRupiah,
      Math.max(0, toRupiah(input.kasbonDeductionRupiah)),
    );
    netTakeHomeRupiah = grossWageRupiah - kasbonDeductionRupiah;
    remainingKasbonRupiah = openingKasbonRupiah - kasbonDeductionRupiah;
  } else {
    const settlement = computeKasbonSettlement(
      openingKasbonRupiah,
      grossWageRupiah,
      input.maxKasbonDeductionPct ?? 50,
    );
    kasbonDeductionRupiah = settlement.deductedAmount;
    netTakeHomeRupiah = settlement.netCashPayout;
    remainingKasbonRupiah = settlement.remainingKasbonBalance;
  }

  const formulaLabel = `${formatNumberId(workedDaysRaw)} hari × ${formatRupiahId(
    dailyRateRupiah,
  )} − potongan kasbon ${formatRupiahId(
    kasbonDeductionRupiah,
  )} = terima bersih ${formatRupiahId(netTakeHomeRupiah)}`;
  const remainingKasbonLabel = `Sisa kasbon: ${formatRupiahId(remainingKasbonRupiah)}`;

  const primaryActionLabel = input.checkedIn
    ? 'Pulang Kerja (Check-Out)'
    : projectId
      ? `Masuk Kerja di ${projectName}`
      : 'Pilih Proyek Lalu Masuk Kerja';

  const projectPromptLabel = projectAutoFilledFromPlan
    ? `Jadwal hari ini: ${projectName}`
    : projectId
      ? `Proyek dipilih: ${projectName}`
      : 'Pilih lokasi proyek hari ini';

  return {
    workerId: input.workerId,
    workerName: input.workerName,
    workDate: input.workDate,
    projectId,
    projectName,
    projectAutoFilledFromPlan,
    requiresExplicitProjectChoice,
    projectPromptLabel,
    availableProjectChoices,
    tapsToCheckIn,
    requiresNumericTyping: false,
    primaryActionLabel,
    hoursTodayLabel,
    todayWageBreakdown: {
      workedDays: workedDaysRaw,
      dailyRateRupiah,
      grossWageRupiah,
      kasbonDeductionRupiah,
      netTakeHomeRupiah,
      remainingKasbonRupiah,
      formulaLabel,
      remainingKasbonLabel,
      summaryLines: [formulaLabel, remainingKasbonLabel],
    },
    tasks: input.assignedTasks ?? [],
    minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
  };
}

export type OfflineActionType = 'check_in' | 'check_out' | 'progress_photo' | 'daily_progress';
export type OfflineActionStatus = 'queued' | 'synced' | 'failed';

export interface OfflineQueuedAction<TPayload = Record<string, unknown>> {
  id: string;
  idempotencyKey: string;
  orgId: string;
  actorId: string;
  actionType: OfflineActionType;
  payload: TPayload;
  createdAt: string;
  sequence: number;
  status: OfflineActionStatus;
  attempts: number;
  syncedAt?: string;
  lastError?: string | null;
}

export interface OfflineActionQueueState {
  items: OfflineQueuedAction[];
  syncedKeys: string[];
  nextSequence: number;
}

export interface EnqueueOfflineActionInput<TPayload = Record<string, unknown>> {
  id?: string;
  idempotencyKey: string;
  orgId: string;
  actorId: string;
  actionType: OfflineActionType;
  payload: TPayload;
  createdAt: string;
}

export interface EnqueueOfflineActionResult {
  queue: OfflineActionQueueState;
  enqueued: boolean;
  duplicate: boolean;
  item: OfflineQueuedAction;
}

function sortActionsChronologically(items: OfflineQueuedAction[]): OfflineQueuedAction[] {
  return [...items].sort((a, b) => {
    const timeCmp = a.createdAt.localeCompare(b.createdAt);
    if (timeCmp !== 0) return timeCmp;
    return a.sequence - b.sequence;
  });
}

/**
 * Membuat antrean aksi offline sinyal lemah dengan pengurutan kronologis & pelacakan idempotencyKey.
 */
export function createOfflineActionQueue(
  initialItems: OfflineQueuedAction[] = [],
): OfflineActionQueueState {
  const sorted = sortActionsChronologically(initialItems);
  const syncedKeys = Array.from(
    new Set(sorted.filter((item) => item.status === 'synced').map((item) => item.idempotencyKey)),
  );
  const maxSeq = sorted.reduce((acc, item) => Math.max(acc, item.sequence), 0);
  return {
    items: sorted,
    syncedKeys,
    nextSequence: maxSeq + 1,
  };
}

/**
 * Menambahkan aksi check-in / foto progres ke antrean offline secara idempoten dan kronologis.
 */
export function enqueueOfflineAction<TPayload = Record<string, unknown>>(
  queue: OfflineActionQueueState,
  input: EnqueueOfflineActionInput<TPayload>,
): EnqueueOfflineActionResult {
  const key = String(input.idempotencyKey ?? '').trim();
  if (!key) {
    throw new Error('idempotencyKey wajib diisi untuk antrean aksi offline.');
  }

  const existing = queue.items.find((item) => item.idempotencyKey === key);
  if (existing) {
    return {
      queue,
      enqueued: false,
      duplicate: true,
      item: existing,
    };
  }

  if (queue.syncedKeys.includes(key)) {
    const syntheticExisting: OfflineQueuedAction = {
      id: input.id || `offline-${queue.nextSequence}`,
      idempotencyKey: key,
      orgId: input.orgId,
      actorId: input.actorId,
      actionType: input.actionType,
      payload: input.payload as Record<string, unknown>,
      createdAt: input.createdAt,
      sequence: queue.nextSequence,
      status: 'synced',
      attempts: 1,
    };
    return {
      queue,
      enqueued: false,
      duplicate: true,
      item: syntheticExisting,
    };
  }

  const newItem: OfflineQueuedAction = {
    id: input.id || `offline-${queue.nextSequence}`,
    idempotencyKey: key,
    orgId: input.orgId,
    actorId: input.actorId,
    actionType: input.actionType,
    payload: input.payload as Record<string, unknown>,
    createdAt: input.createdAt,
    sequence: queue.nextSequence,
    status: 'queued',
    attempts: 0,
    lastError: null,
  };

  return {
    queue: {
      items: sortActionsChronologically([...queue.items, newItem]),
      syncedKeys: [...queue.syncedKeys],
      nextSequence: queue.nextSequence + 1,
    },
    enqueued: true,
    duplicate: false,
    item: newItem,
  };
}

export interface FlushOfflineQueueOptions {
  isOnline: boolean;
  nowIso?: string;
  sender: (
    action: OfflineQueuedAction,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

export interface FlushOfflineQueueResult {
  queue: OfflineActionQueueState;
  online: boolean;
  sentCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  remainingQueuedCount: number;
  dispatchedOrder: string[];
}

/**
 * Mengirim antrean offline saat sinyal kembali dalam urutan kronologis tanpa duplikasi.
 * Ketika `isOnline: false`, seluruh item tetap aman berstatus `'queued'`.
 */
export async function flushOfflineActionQueue(
  queue: OfflineActionQueueState,
  options: FlushOfflineQueueOptions,
): Promise<FlushOfflineQueueResult> {
  const ordered = sortActionsChronologically(queue.items);

  if (!options.isOnline) {
    return {
      queue: {
        ...queue,
        items: ordered,
      },
      online: false,
      sentCount: 0,
      skippedDuplicateCount: 0,
      failedCount: 0,
      remainingQueuedCount: ordered.filter((i) => i.status === 'queued').length,
      dispatchedOrder: [],
    };
  }

  const nowIso = options.nowIso ?? new Date().toISOString();
  const syncedSet = new Set(queue.syncedKeys);
  const updatedItems: OfflineQueuedAction[] = [];
  const dispatchedOrder: string[] = [];
  let sentCount = 0;
  let skippedDuplicateCount = 0;
  let failedCount = 0;

  for (const item of ordered) {
    if (item.status === 'synced' || syncedSet.has(item.idempotencyKey)) {
      skippedDuplicateCount += 1;
      updatedItems.push({
        ...item,
        status: 'synced',
        syncedAt: item.syncedAt ?? nowIso,
      });
      continue;
    }

    try {
      const res = await options.sender(item);
      if (res.ok) {
        syncedSet.add(item.idempotencyKey);
        sentCount += 1;
        dispatchedOrder.push(item.idempotencyKey);
        updatedItems.push({
          ...item,
          status: 'synced',
          attempts: item.attempts + 1,
          syncedAt: nowIso,
          lastError: null,
        });
      } else {
        failedCount += 1;
        updatedItems.push({
          ...item,
          status: 'failed',
          attempts: item.attempts + 1,
          lastError: res.error ?? 'Gagal mengirim aksi lapangan.',
        });
      }
    } catch (err) {
      failedCount += 1;
      updatedItems.push({
        ...item,
        status: 'failed',
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : 'Gagal mengirim aksi lapangan.',
      });
    }
  }

  const finalItems = sortActionsChronologically(updatedItems);
  return {
    queue: {
      items: finalItems,
      syncedKeys: Array.from(syncedSet),
      nextSequence: queue.nextSequence,
    },
    online: true,
    sentCount,
    skippedDuplicateCount,
    failedCount,
    remainingQueuedCount: finalItems.filter((i) => i.status === 'queued').length,
    dispatchedOrder,
  };
}

export interface MandorTeamMemberInput {
  workerId: string;
  workerName: string;
  projectId: string;
  projectName?: string;
  attendanceStatus: 'present' | 'absent' | 'late';
  checkInTimeLabel?: string | null;
  dayFraction?: number | null;
  needsDayApproval?: boolean;
  approvalReason?: string | null;
  dailyRate?: number | null;
  grossSalary?: number | null;
  netSalary?: number | null;
  kasbonBalance?: number | null;
}

export interface MandorTeamTodayInput {
  orgId: string;
  mandorId: string;
  mandorName: string;
  projectId: string;
  projectName: string;
  workDate: string;
  members: MandorTeamMemberInput[];
}

export interface MandorTeamMemberView {
  workerId: string;
  workerName: string;
  projectId: string;
  attendanceStatus: 'present' | 'absent' | 'late';
  attendanceLabel: string;
  checkInTimeLabel: string | null;
  dayFraction: number;
  needsDayApproval: boolean;
  approvalReason: string | null;
  dailyRate: null;
  grossSalary: null;
  netSalary: null;
  kasbonBalance: null;
}

export interface MandorPendingDayApproval {
  workerId: string;
  workerName: string;
  dayFraction: number;
  reason: string;
  actions: readonly ['Setujui Hari Kerja', 'Tolak'];
  minTouchTargetPx: number;
}

export interface MandorTeamTodayView {
  orgId: string;
  mandorId: string;
  mandorName: string;
  projectId: string;
  projectName: string;
  workDate: string;
  summaryBanner: string;
  presentCount: number;
  absentCount: number;
  presentWorkers: MandorTeamMemberView[];
  absentWorkers: MandorTeamMemberView[];
  members: MandorTeamMemberView[];
  pendingDayApprovals: MandorPendingDayApproval[];
  addWorkerToProjectAction: {
    label: string;
    enabled: true;
    minTouchTargetPx: number;
  };
  reportProgressWithPhotoAction: {
    label: string;
    requiresPhoto: true;
    singleButton: true;
    minTouchTargetPx: number;
  };
  wageHiddenForTeam: true;
  minTouchTargetPx: number;
}

/**
 * Menyusun layar terpadu Mandor "Tim Hari Ini":
 * siapa hadir / belum hadir, persetujuan hari kerja, tombol tambah orang ke proyek,
 * dan satu tombol lapor progres + foto tanpa membocorkan tarif/gaji pekerja lain (RBAC G8).
 */
export function buildMandorTeamTodayView(input: MandorTeamTodayInput): MandorTeamTodayView {
  const payRecords: HrdWorkerPayRecord[] = input.members.map((m) => ({
    orgId: input.orgId,
    workerId: m.workerId,
    workerName: m.workerName,
    projectId: m.projectId,
    projectName: m.projectName ?? input.projectName,
    workDate: input.workDate,
    dayFraction: m.dayFraction ?? (m.attendanceStatus === 'absent' ? 0 : 1),
    dailyRate: m.dailyRate ?? null,
    grossSalary: m.grossSalary ?? null,
    netSalary: m.netSalary ?? null,
    kasbonBalance: m.kasbonBalance ?? null,
  }));

  // Pastikan isolasi orgId & redaksi gaji tim melewati gate RBAC G8
  const teamWorkerIds = input.members
    .map((m) => m.workerId)
    .filter((id) => id !== input.mandorId);

  const filtered = filterHrdRecordsByRole(
    {
      userId: input.mandorId,
      orgId: input.orgId,
      role: 'mandor',
      teamWorkerIds,
    },
    payRecords,
  );

  const allowedWorkerIds = new Set(filtered.records.map((r) => r.workerId));
  const byWorkerId = new Map(input.members.map((m) => [m.workerId, m]));

  const members: MandorTeamMemberView[] = [];
  for (const rec of filtered.records) {
    if (!allowedWorkerIds.has(rec.workerId)) continue;
    const raw = byWorkerId.get(rec.workerId);
    if (!raw) continue;
    const attendanceLabel =
      raw.attendanceStatus === 'present'
        ? 'Hadir'
        : raw.attendanceStatus === 'late'
          ? 'Hadir (Terlambat)'
          : 'Belum Hadir';

    // Demi keamanan G8 + zero leakage, layar Tim Hari Ini selalu menyembunyikan seluruh nominal gaji/tarif/kasbon
    members.push({
      workerId: raw.workerId,
      workerName: raw.workerName,
      projectId: raw.projectId,
      attendanceStatus: raw.attendanceStatus,
      attendanceLabel,
      checkInTimeLabel: raw.checkInTimeLabel ?? null,
      dayFraction: rec.dayFraction,
      needsDayApproval: Boolean(raw.needsDayApproval),
      approvalReason: raw.approvalReason ?? null,
      dailyRate: null,
      grossSalary: null,
      netSalary: null,
      kasbonBalance: null,
    });
  }

  const presentWorkers = members.filter(
    (m) => m.attendanceStatus === 'present' || m.attendanceStatus === 'late',
  );
  const absentWorkers = members.filter((m) => m.attendanceStatus === 'absent');
  const pendingDayApprovals: MandorPendingDayApproval[] = members
    .filter((m) => m.needsDayApproval)
    .map((m) => ({
      workerId: m.workerId,
      workerName: m.workerName,
      dayFraction: m.dayFraction,
      reason: m.approvalReason || 'Perlu cek hari kerja oleh mandor',
      actions: ['Setujui Hari Kerja', 'Tolak'] as const,
      minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
    }));

  const summaryBanner = `Tim ${input.projectName}: ${presentWorkers.length} hadir, ${absentWorkers.length} belum hadir, ${pendingDayApprovals.length} perlu cek hari kerja`;

  return {
    orgId: input.orgId,
    mandorId: input.mandorId,
    mandorName: input.mandorName,
    projectId: input.projectId,
    projectName: input.projectName,
    workDate: input.workDate,
    summaryBanner,
    presentCount: presentWorkers.length,
    absentCount: absentWorkers.length,
    presentWorkers,
    absentWorkers,
    members,
    pendingDayApprovals,
    addWorkerToProjectAction: {
      label: 'Tambah Orang ke Proyek',
      enabled: true,
      minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
    },
    reportProgressWithPhotoAction: {
      label: 'Lapor Progres + Foto',
      requiresPhoto: true,
      singleButton: true,
      minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
    },
    wageHiddenForTeam: true,
    minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
  };
}

export type MorningDecisionPriority = 'critical' | 'high' | 'medium' | 'low';

const PRIORITY_SCORE: Record<MorningDecisionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface MorningFeedItemInput {
  id: string;
  orgId: string;
  title: string;
  summaryReason: string;
  category: 'kasbon' | 'progres' | 'belanja' | 'tagihan' | 'absensi' | 'kas' | 'lainnya';
  requiresHumanDecision: boolean;
  handledByAgent?: boolean;
  priority?: MorningDecisionPriority;
  amountRupiah?: number | null;
  projectName?: string | null;
  createdAt?: string;
}

export interface MorningDecisionCard {
  id: string;
  title: string;
  summaryReason: string;
  category: MorningFeedItemInput['category'];
  priority: MorningDecisionPriority;
  amountLabel: string | null;
  projectName: string | null;
  actions: readonly ['Setujui', 'Tolak'];
  oneTapActions: true;
  minTouchTargetPx: number;
}

export interface MorningDecisionsView {
  orgId: string;
  asOfDate: string;
  headline: string;
  decisions: MorningDecisionCard[];
  totalNeedingHumanCount: number;
  overflowCount: number;
  handledByAgentCount: number;
  handledByAgentSummary: string;
  maxDecisionsLimit: typeof MAX_MORNING_DECISIONS;
  minTouchTargetPx: number;
}

/**
 * Menyaring dan mengurutkan hanya hal yang butuh keputusan manusia (MAKSIMAL 5 item)
 * untuk layar pagi PM/pemilik; item rutin yang ditangani asisten diringkas dalam `handledByAgentCount`.
 */
export function buildMorningDecisionsView(input: {
  orgId: string;
  asOfDate: string;
  items: MorningFeedItemInput[];
}): MorningDecisionsView {
  const scopedItems = input.items.filter((item) => item.orgId === input.orgId);

  const handledByAgentItems = scopedItems.filter(
    (item) => Boolean(item.handledByAgent) || !item.requiresHumanDecision,
  );
  const humanItems = scopedItems.filter(
    (item) => item.requiresHumanDecision && !item.handledByAgent,
  );

  const sortedHuman = [...humanItems].sort((a, b) => {
    const prioA = PRIORITY_SCORE[a.priority ?? 'medium'];
    const prioB = PRIORITY_SCORE[b.priority ?? 'medium'];
    if (prioA !== prioB) return prioB - prioA;

    const amtA = Math.abs(toRupiah(a.amountRupiah ?? 0));
    const amtB = Math.abs(toRupiah(b.amountRupiah ?? 0));
    if (amtA !== amtB) return amtB - amtA;

    const timeA = a.createdAt ?? '';
    const timeB = b.createdAt ?? '';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    return a.id.localeCompare(b.id);
  });

  const topDecisions = sortedHuman.slice(0, MAX_MORNING_DECISIONS);
  const decisions: MorningDecisionCard[] = topDecisions.map((item) => ({
    id: item.id,
    title: item.title,
    summaryReason: item.summaryReason,
    category: item.category,
    priority: item.priority ?? 'medium',
    amountLabel:
      item.amountRupiah != null && Number.isFinite(item.amountRupiah)
        ? formatRupiahId(item.amountRupiah)
        : null,
    projectName: item.projectName ?? null,
    actions: ['Setujui', 'Tolak'] as const,
    oneTapActions: true,
    minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
  }));

  const overflowCount = Math.max(0, sortedHuman.length - decisions.length);
  const handledByAgentCount = handledByAgentItems.length;
  const headline =
    decisions.length === 0
      ? 'Semua aman pagi ini, belum ada hal yang perlu keputusan Anda'
      : `${decisions.length} hal penting menunggu keputusan Anda pagi ini`;
  const handledByAgentSummary =
    handledByAgentCount > 0
      ? `${handledByAgentCount} hal rutin sudah dibereskan asisten otomatis`
      : 'Belum ada catatan rutin otomatis pagi ini';

  return {
    orgId: input.orgId,
    asOfDate: input.asOfDate,
    headline,
    decisions,
    totalNeedingHumanCount: sortedHuman.length,
    overflowCount,
    handledByAgentCount,
    handledByAgentSummary,
    maxDecisionsLimit: MAX_MORNING_DECISIONS,
    minTouchTargetPx: RECOMMENDED_TOUCH_TARGET_PX,
  };
}

export interface UxTaskBurdenInput {
  taskKey:
    | 'absen_tukang'
    | 'laporan_progres_mandor'
    | 'persetujuan_pagi_pemilik'
    | 'cek_rincian_upah';
  taskLabel: string;
  oldTaps: number;
  newTaps: number;
  oldMessagesPerDay: number;
  newMessagesPerDay: number;
  oldMinutesPerDay: number;
  newMinutesPerDay: number;
}

export interface UxTaskBurdenMetric extends UxTaskBurdenInput {
  tapsSaved: number;
  tapsSavedPct: number;
  messagesSavedPerDay: number;
  minutesSavedPerDay: number;
  reduced: boolean;
}

export interface UxBurdenReductionReport {
  tasks: UxTaskBurdenMetric[];
  totalOldTaps: number;
  totalNewTaps: number;
  overallTapsSavedPct: number;
  totalOldMessagesPerDay: number;
  totalNewMessagesPerDay: number;
  estimatedMinutesSavedPerDay: number;
  allReduced: boolean;
}

export const DEFAULT_UX_BURDEN_BENCHMARKS: UxTaskBurdenInput[] = [
  {
    taskKey: 'absen_tukang',
    taskLabel: 'Absen harian tukang',
    oldTaps: 6,
    newTaps: 1,
    oldMessagesPerDay: 3,
    newMessagesPerDay: 0,
    oldMinutesPerDay: 4,
    newMinutesPerDay: 0.5,
  },
  {
    taskKey: 'laporan_progres_mandor',
    taskLabel: 'Laporan progres + foto mandor',
    oldTaps: 9,
    newTaps: 2,
    oldMessagesPerDay: 5,
    newMessagesPerDay: 0,
    oldMinutesPerDay: 8,
    newMinutesPerDay: 1.5,
  },
  {
    taskKey: 'persetujuan_pagi_pemilik',
    taskLabel: 'Persetujuan pagi pemilik / PM',
    oldTaps: 18,
    newTaps: 5,
    oldMessagesPerDay: 12,
    newMessagesPerDay: 1,
    oldMinutesPerDay: 15,
    newMinutesPerDay: 2,
  },
  {
    taskKey: 'cek_rincian_upah',
    taskLabel: 'Cek rincian upah & kasbon tukang',
    oldTaps: 5,
    newTaps: 1,
    oldMessagesPerDay: 2,
    newMessagesPerDay: 0,
    oldMinutesPerDay: 5,
    newMinutesPerDay: 0.5,
  },
];

/**
 * Mengukur pengurangan beban ketukan, pesan harian, dan menit kerja per hari
 * dibanding cara manual lama untuk 4 tugas lapangan utama G11.
 */
export function measureUxBurdenReduction(
  customTasks?: UxTaskBurdenInput[],
): UxBurdenReductionReport {
  const source = customTasks && customTasks.length > 0 ? customTasks : DEFAULT_UX_BURDEN_BENCHMARKS;
  const tasks: UxTaskBurdenMetric[] = source.map((t) => {
    const tapsSaved = t.oldTaps - t.newTaps;
    const tapsSavedPct = t.oldTaps > 0 ? Math.round((tapsSaved / t.oldTaps) * 100) : 0;
    const messagesSavedPerDay = t.oldMessagesPerDay - t.newMessagesPerDay;
    const minutesSavedPerDay = Math.round((t.oldMinutesPerDay - t.newMinutesPerDay) * 10) / 10;
    const reduced =
      t.newTaps < t.oldTaps &&
      t.newMessagesPerDay < t.oldMessagesPerDay &&
      t.newMinutesPerDay < t.oldMinutesPerDay;
    return {
      ...t,
      tapsSaved,
      tapsSavedPct,
      messagesSavedPerDay,
      minutesSavedPerDay,
      reduced,
    };
  });

  const totalOldTaps = tasks.reduce((sum, t) => sum + t.oldTaps, 0);
  const totalNewTaps = tasks.reduce((sum, t) => sum + t.newTaps, 0);
  const overallTapsSavedPct =
    totalOldTaps > 0 ? Math.round(((totalOldTaps - totalNewTaps) / totalOldTaps) * 100) : 0;
  const totalOldMessagesPerDay = tasks.reduce((sum, t) => sum + t.oldMessagesPerDay, 0);
  const totalNewMessagesPerDay = tasks.reduce((sum, t) => sum + t.newMessagesPerDay, 0);
  const estimatedMinutesSavedPerDay =
    Math.round(tasks.reduce((sum, t) => sum + t.minutesSavedPerDay, 0) * 10) / 10;

  return {
    tasks,
    totalOldTaps,
    totalNewTaps,
    overallTapsSavedPct,
    totalOldMessagesPerDay,
    totalNewMessagesPerDay,
    estimatedMinutesSavedPerDay,
    allReduced: tasks.length > 0 && tasks.every((t) => t.reduced),
  };
}

export interface G11ChecklistItem {
  key:
    | 'worker_checkin_max_2_taps'
    | 'worker_schedule_prefill_not_first_project'
    | 'zero_accounting_jargon'
    | 'morning_decisions_max_5'
    | 'worker_wage_transparency'
    | 'mandor_rbac_no_other_wage_leak'
    | 'offline_queue_idempotent_chronological'
    | 'accessible_touch_targets_44px'
    | 'ux_burden_reduced';
  label: string;
  passed: boolean;
  detail: string;
}

export interface EvaluateG11UxChecklistInput {
  workerView: WorkerTodayView;
  workerUnassignedView?: WorkerTodayView;
  mandorView: MandorTeamTodayView;
  morningView: MorningDecisionsView;
  offlineQueueCheck: {
    queuedWhileOffline: boolean;
    syncedWhenOnline: boolean;
    idempotentNoDuplicate: boolean;
    chronologicalOrderPreserved: boolean;
  };
  burdenReport: UxBurdenReductionReport;
}

export interface G11UxChecklistResult {
  ok: boolean;
  passedCount: number;
  totalCount: number;
  items: G11ChecklistItem[];
  jargonViolations: AccountingJargonTerm[];
}

/**
 * Pemeriksa otomatis seluruh standar gerbang UX G11.
 */
export function evaluateG11UxChecklist(
  input: EvaluateG11UxChecklistInput,
): G11UxChecklistResult {
  const allVisibleTexts = [
    ...collectVisibleStrings(input.workerView),
    ...(input.workerUnassignedView ? collectVisibleStrings(input.workerUnassignedView) : []),
    ...collectVisibleStrings(input.mandorView),
    ...collectVisibleStrings(input.morningView),
  ].join(' ');

  const jargonRes = assertNoAccountingJargon(allVisibleTexts);
  const minTouch = Math.min(
    input.workerView.minTouchTargetPx,
    input.mandorView.minTouchTargetPx,
    input.mandorView.addWorkerToProjectAction.minTouchTargetPx,
    input.mandorView.reportProgressWithPhotoAction.minTouchTargetPx,
    input.morningView.minTouchTargetPx,
    ...input.morningView.decisions.map((d) => d.minTouchTargetPx),
  );

  const unassignedClean = input.workerUnassignedView
    ? input.workerUnassignedView.projectId === null &&
      input.workerUnassignedView.projectAutoFilledFromPlan === false &&
      input.workerUnassignedView.requiresExplicitProjectChoice === true
    : true;

  const noOtherWageLeak =
    input.mandorView.wageHiddenForTeam === true &&
    input.mandorView.members.every(
      (m) =>
        m.dailyRate === null &&
        m.grossSalary === null &&
        m.netSalary === null &&
        m.kasbonBalance === null,
    );

  const offlineOk =
    input.offlineQueueCheck.queuedWhileOffline &&
    input.offlineQueueCheck.syncedWhenOnline &&
    input.offlineQueueCheck.idempotentNoDuplicate &&
    input.offlineQueueCheck.chronologicalOrderPreserved;

  const items: G11ChecklistItem[] = [
    {
      key: 'worker_checkin_max_2_taps',
      label: 'Absen tukang maksimal 2 ketukan tanpa ketik angka',
      passed:
        input.workerView.tapsToCheckIn <= 2 && input.workerView.requiresNumericTyping === false,
      detail: `tapsToCheckIn=${input.workerView.tapsToCheckIn}, requiresNumericTyping=${input.workerView.requiresNumericTyping}`,
    },
    {
      key: 'worker_schedule_prefill_not_first_project',
      label: 'Pre-fill proyek dari jadwal PM & tidak menebak proyek pertama saat kosong',
      passed: input.workerView.projectAutoFilledFromPlan === true && unassignedClean,
      detail: `autoFilled=${input.workerView.projectAutoFilledFromPlan}, unassignedClean=${unassignedClean}`,
    },
    {
      key: 'zero_accounting_jargon',
      label: '0 istilah akuntansi teknis di layar tukang, mandor, dan keputusan pagi',
      passed: jargonRes.ok,
      detail: jargonRes.ok
        ? '0 jargon akuntansi ditemukan'
        : `Ditemukan: ${jargonRes.forbiddenTermsFound.join(', ')}`,
    },
    {
      key: 'morning_decisions_max_5',
      label: 'Layar pagi PM/pemilik maksimal 5 keputusan dengan tombol 1-ketukan Setujui/Tolak',
      passed:
        input.morningView.decisions.length <= MAX_MORNING_DECISIONS &&
        input.morningView.decisions.every(
          (d) =>
            d.oneTapActions &&
            d.actions[0] === 'Setujui' &&
            d.actions[1] === 'Tolak',
        ),
      detail: `decisions=${input.morningView.decisions.length}/${MAX_MORNING_DECISIONS}, handledByAgent=${input.morningView.handledByAgentCount}`,
    },
    {
      key: 'worker_wage_transparency',
      label: 'Transparansi upah tukang lengkap dalam bilangan bulat rupiah',
      passed:
        Boolean(input.workerView.todayWageBreakdown.formulaLabel) &&
        Number.isInteger(input.workerView.todayWageBreakdown.netTakeHomeRupiah) &&
        Number.isInteger(input.workerView.todayWageBreakdown.remainingKasbonRupiah),
      detail: input.workerView.todayWageBreakdown.formulaLabel,
    },
    {
      key: 'mandor_rbac_no_other_wage_leak',
      label: 'Layar mandor terpadu tanpa membocorkan tarif/gaji/kasbon orang lain',
      passed: noOtherWageLeak,
      detail: `members=${input.mandorView.members.length}, wageHiddenForTeam=${input.mandorView.wageHiddenForTeam}`,
    },
    {
      key: 'offline_queue_idempotent_chronological',
      label: 'Antrean offline sinyal lemah aman, idempoten, dan urut kronologis',
      passed: offlineOk,
      detail: `offlineOk=${offlineOk}`,
    },
    {
      key: 'accessible_touch_targets_44px',
      label: 'Seluruh tombol utama memenuhi target sentuh >= 44px',
      passed: minTouch >= MIN_TOUCH_TARGET_PX,
      detail: `minTouchTargetPx=${minTouch}`,
    },
    {
      key: 'ux_burden_reduced',
      label: 'Semua tugas lapangan menunjukkan pengurangan ketukan, pesan, & waktu',
      passed: input.burdenReport.allReduced && input.burdenReport.overallTapsSavedPct > 0,
      detail: `overallTapsSavedPct=${input.burdenReport.overallTapsSavedPct}%, minutesSaved=${input.burdenReport.estimatedMinutesSavedPerDay}`,
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  return {
    ok: passedCount === items.length,
    passedCount,
    totalCount: items.length,
    items,
    jargonViolations: jargonRes.forbiddenTermsFound,
  };
}
