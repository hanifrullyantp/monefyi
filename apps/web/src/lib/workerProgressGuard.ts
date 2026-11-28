import {
  evaluateProgressUpdateRequest,
  type PmActorRole,
  type ProgressUpdateEvaluationResult,
} from '@domain/projectManagerAgent';
import type { WorkItem, WorkItemAttachment, WorkItemNote } from '../services/workItemService';
import type { UserRole } from '../store/appStore';

export function mapUserRoleToPmActorRole(role?: UserRole | PmActorRole | null): PmActorRole {
  if (role === 'owner' || role === 'admin') return 'owner';
  if (role === 'pm' || role === 'manager') return 'pm';
  if (role === 'mandor') return 'mandor';
  return 'worker';
}

export interface ValidateWorkerProgressInput {
  workItem: Pick<WorkItem, 'id' | 'name' | 'progress_pct' | 'status' | 'attachments' | 'notes'>;
  requestedProgressPct: number;
  actorId: string;
  actorRole?: UserRole | PmActorRole | null;
  photoAttachmentHash?: string | null;
  photoUrl?: string | null;
  photoFileName?: string | null;
  approvedBy?: string | null;
  approvedByRole?: PmActorRole | null;
  asOfDate?: string;
}

export interface WorkerProgressGuardDecision {
  evaluation: ProgressUpdateEvaluationResult;
  allowedToPersist: boolean;
  requiresPhotoModal: boolean;
  nextProgressPct: number;
  nextStatus: 'pending' | 'in_progress' | 'completed';
  nextAttachments?: WorkItemAttachment[];
  nextNotes?: WorkItemNote[];
}

/**
 * Guard UI karyawan/pekerja sebelum menyimpan perubahan progres `WorkItem`.
 * Menegakkan aturan deterministik yang sama persis dengan `evaluateProgressUpdateRequest`:
 * - Pekerja tidak dapat langsung menandai selesai 100% tanpa bukti foto valid atau persetujuan mandor/PM.
 * - Unggahan foto oleh pekerja tanpa persetujuan supervisor masuk ke status `pending_supervisor_verification`
 *   (tidak pernah langsung menjadi `100%` / `'completed'`).
 */
export function validateWorkerProgressUpdate(
  input: ValidateWorkerProgressInput,
): WorkerProgressGuardDecision {
  const currentPct = Math.min(100, Math.max(0, Math.round(Number(input.workItem.progress_pct) || 0)));
  const clampedRequested = Math.min(100, Math.max(0, Math.round(input.requestedProgressPct)));
  const pmRole = mapUserRoleToPmActorRole(input.actorRole);

  const evaluation = evaluateProgressUpdateRequest({
    workItemId: input.workItem.id,
    workItemName: input.workItem.name,
    currentProgressPct: currentPct,
    requestedProgressPct: clampedRequested,
    actorId: input.actorId,
    actorRole: pmRole,
    photoAttachmentHash: input.photoAttachmentHash,
    photoUrl: input.photoUrl,
    approvedBy: input.approvedBy,
    approvedByRole: input.approvedByRole,
    asOfDate: input.asOfDate,
  });

  if (!evaluation.ok) {
    const currentStatus: 'pending' | 'in_progress' | 'completed' =
      currentPct >= 100 ? 'completed' : currentPct > 0 ? 'in_progress' : 'pending';
    return {
      evaluation,
      allowedToPersist: false,
      requiresPhotoModal: evaluation.status === 'rejected_requires_proof',
      nextProgressPct: currentPct,
      nextStatus: currentStatus,
    };
  }

  const nowIso = new Date().toISOString();
  const nextProgressPct = Math.round(evaluation.effectiveProgressPct);
  const nextStatus: 'pending' | 'in_progress' | 'completed' =
    evaluation.canMarkCompleted && nextProgressPct >= 100
      ? 'completed'
      : nextProgressPct > 0
        ? 'in_progress'
        : 'pending';

  let nextAttachments: WorkItemAttachment[] | undefined;
  let nextNotes: WorkItemNote[] | undefined;

  if (evaluation.hasValidPhotoProof) {
    const existingAttachments = Array.isArray(input.workItem.attachments)
      ? input.workItem.attachments
      : [];
    const proofUrl =
      input.photoUrl?.trim() ||
      `proof://sha256/${input.photoAttachmentHash?.trim() || 'photo'}`;
    nextAttachments = [
      ...existingAttachments,
      {
        id: `proof-${Date.now()}`,
        name: input.photoFileName?.trim() || 'Bukti Foto Selesai 100%',
        url: proofUrl,
        addedAt: nowIso,
      },
    ];
  }

  if (evaluation.status === 'pending_supervisor_verification') {
    const existingNotes = Array.isArray(input.workItem.notes) ? input.workItem.notes : [];
    nextNotes = [
      ...existingNotes,
      {
        id: `verify-${Date.now()}`,
        text: `[MENUNGGU VERIFIKASI MANDOR/PM] Pekerja mengajukan penyelesaian 100% dengan bukti foto (${input.photoAttachmentHash || input.photoUrl || 'foto'}).`,
        createdAt: nowIso,
      },
    ];
  }

  return {
    evaluation,
    allowedToPersist: true,
    requiresPhotoModal: false,
    nextProgressPct,
    nextStatus,
    nextAttachments,
    nextNotes,
  };
}
