import { linesAreBalanced, toRupiah } from './journal';
import { computeDeterministicSha256 } from './receiptExtraction';

export type IncidentJournalLine = {
  accountId?: string;
  role?: string;
  debit: number;
  credit: number;
  projectId?: string | null;
  partyId?: string | null;
  memo?: string | null;
};

export type IncidentRootCauseCategory =
  | 'wrong_nominal'
  | 'wrong_party'
  | 'duplicate_posting'
  | 'wrong_direction_or_account'
  | 'prompt_injection_or_policy_bypass'
  | 'misclassification';

export type MispostingIncidentInput = {
  incidentId: string;
  orgId: string;
  originalJournalId: string;
  originalLines: readonly IncidentJournalLine[];
  detectedBy: string;
  reason: string;
  detectedAt: string;
  rootCauseCategory?: IncidentRootCauseCategory;
  mutateOriginalAttempt?: boolean;
};

export type ProposedReversalJournal = {
  orgId: string;
  referenceType: 'reversal';
  referenceId: string;
  lines: IncidentJournalLine[];
  linesAreBalanced: boolean;
  totalDebitRupiah: number;
  totalCreditRupiah: number;
  requiresHumanApproval: true;
  immutableOriginalPreserved: true;
  createdBy: string;
  approvedBy: null;
};

export type IncidentPostmortemDocument = {
  incidentId: string;
  orgId: string;
  originalJournalId: string;
  rootCauseCategory: IncidentRootCauseCategory;
  impactRupiah: number;
  affectedAccounts: string[];
  autonomyDemotionTriggered: true;
  autonomyDemotionAction: {
    previousLevel: 'L2';
    targetLevel: 'L1';
    reason: string;
  };
  preventiveActions: string[];
  status: 'awaiting_approval' | 'approved' | 'rejected';
  detectedBy: string;
  detectedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  reason: string;
  deterministicHash: string;
};

export type MispostingReversalProposalResult =
  | {
      ok: true;
      proposedReversal: ProposedReversalJournal;
      postmortem: IncidentPostmortemDocument;
    }
  | {
      ok: false;
      code:
        | 'jurnal_tidak_boleh_diubah'
        | 'invalid_incident_input'
        | 'original_journal_unbalanced';
      reason: string;
    };

function classifyRootCause(reason: string, explicit?: IncidentRootCauseCategory): IncidentRootCauseCategory {
  if (explicit) return explicit;
  const norm = String(reason ?? '').toLowerCase();
  if (/\b(duplikat|duplicate|ganda|double)\b/.test(norm)) return 'duplicate_posting';
  if (/\b(nominal|angka|jumlah|amount|nol|typo)\b/.test(norm)) return 'wrong_nominal';
  if (/\b(pihak|supplier|klien|vendor|party)\b/.test(norm)) return 'wrong_party';
  if (/\b(injeksi|injection|bypass|serangan|unauthorized)\b/.test(norm)) return 'prompt_injection_or_policy_bypass';
  if (/\b(arah|debit|kredit|credit|akun|account|terbalik)\b/.test(norm)) return 'wrong_direction_or_account';
  return 'misclassification';
}

function buildPreventiveActions(category: IncidentRootCauseCategory): string[] {
  const baseActions = [
    'Turunkan level otonomi slice terkait ke L1 (wajib konfirmasi manusia) sampai sampel bayangan ulang memenuhi syarat.',
    'Tambahkan kasus insiden ini ke held-out adversarial & regression eval set.',
  ];

  switch (category) {
    case 'duplicate_posting':
      return [
        ...baseActions,
        'Verifikasi penegakan idempotencyKey serta pemeriksaan hash lampiran/nomor faktur di detectDuplicateEntry.',
      ];
    case 'wrong_nominal':
      return [
        ...baseActions,
        'Aktifkan ambang anomali nominal lebih ketat dan wajibkan review manusia untuk selisih item vs total nota.',
      ];
    case 'wrong_party':
      return [
        ...baseActions,
        'Perketat resolusi party_id eksplisit dan tolak auto-commit bila skor kemiripan pihak ambigu.',
      ];
    case 'prompt_injection_or_policy_bypass':
      return [
        ...baseActions,
        'Perbarui pola deteksi prompt injection dan audit seluruh log otorisasi lintas-tenant/peran.',
      ];
    case 'wrong_direction_or_account':
      return [
        ...baseActions,
        'Tinjau ulang pemetaan template kejadian tertutup tanpa membiarkan LLM menyentuh debit/kredit.',
      ];
    default:
      return [
        ...baseActions,
        'Catat koreksi slot/kategori ke memori organisasi melalui recordUserCorrectionSignal.',
      ];
  }
}

/**
 * Menangani insiden salah posting (misposting) secara append-only:
 * - Memvalidasi jurnal asli tidak pernah di-edit atau dihapus (append-only).
 * - Menyusun usulan jurnal pembalik seimbang (`debit <-> credit`) dengan `requiresHumanApproval: true`.
 * - Menghasilkan dokumen post-mortem terstruktur dan memicu penurunan otonomi otomatis ke L1.
 */
export function proposeMispostingReversalAndPostmortem(
  incident: MispostingIncidentInput,
): MispostingReversalProposalResult {
  if (incident?.mutateOriginalAttempt === true) {
    return {
      ok: false,
      code: 'jurnal_tidak_boleh_diubah',
      reason: 'Jurnal asli bersifat append-only dan tidak boleh di-edit maupun dihapus; wajib buat jurnal pembalik.',
    };
  }

  const incidentId = String(incident?.incidentId ?? '').trim();
  const orgId = String(incident?.orgId ?? '').trim();
  const originalJournalId = String(incident?.originalJournalId ?? '').trim();
  const detectedBy = String(incident?.detectedBy ?? '').trim();
  const reason = String(incident?.reason ?? '').trim();
  const detectedAt = String(incident?.detectedAt ?? '').trim();

  if (!incidentId || !orgId || !originalJournalId || !detectedBy || !reason || !detectedAt) {
    return {
      ok: false,
      code: 'invalid_incident_input',
      reason: 'incidentId, orgId, originalJournalId, detectedBy, reason, dan detectedAt wajib diisi.',
    };
  }

  const originalLines = incident.originalLines ?? [];
  if (originalLines.length === 0 || !linesAreBalanced(originalLines as Array<{ debit: number; credit: number }>)) {
    return {
      ok: false,
      code: 'original_journal_unbalanced',
      reason: 'Jurnal asli kosong atau tidak seimbang sehingga tidak dapat disusun pembalik otomatis.',
    };
  }

  const reversedLines: IncidentJournalLine[] = originalLines.map((line) => ({
    ...(line.accountId !== undefined ? { accountId: line.accountId } : {}),
    ...(line.role !== undefined ? { role: line.role } : {}),
    debit: Math.max(0, toRupiah(line.credit)),
    credit: Math.max(0, toRupiah(line.debit)),
    ...(line.projectId !== undefined ? { projectId: line.projectId } : {}),
    ...(line.partyId !== undefined ? { partyId: line.partyId } : {}),
    ...(line.memo !== undefined ? { memo: line.memo } : {}),
  }));

  const balanced = linesAreBalanced(reversedLines);
  if (!balanced) {
    return {
      ok: false,
      code: 'original_journal_unbalanced',
      reason: 'Hasil pembalikan baris jurnal tidak seimbang.',
    };
  }

  const totalDebitRupiah = reversedLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCreditRupiah = reversedLines.reduce((sum, l) => sum + l.credit, 0);

  const affectedAccounts = Array.from(
    new Set(
      originalLines
        .map((l) => String(l.accountId ?? l.role ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const rootCauseCategory = classifyRootCause(reason, incident.rootCauseCategory);
  const preventiveActions = buildPreventiveActions(rootCauseCategory);

  const proposedReversal: ProposedReversalJournal = {
    orgId,
    referenceType: 'reversal',
    referenceId: originalJournalId,
    lines: reversedLines,
    linesAreBalanced: true,
    totalDebitRupiah,
    totalCreditRupiah,
    requiresHumanApproval: true,
    immutableOriginalPreserved: true,
    createdBy: detectedBy,
    approvedBy: null,
  };

  const postmortemBase = {
    incidentId,
    orgId,
    originalJournalId,
    rootCauseCategory,
    impactRupiah: totalDebitRupiah,
    affectedAccounts,
    autonomyDemotionTriggered: true as const,
    autonomyDemotionAction: {
      previousLevel: 'L2' as const,
      targetLevel: 'L1' as const,
      reason: 'incident_misposting_reversal',
    },
    preventiveActions,
    status: 'awaiting_approval' as const,
    detectedBy,
    detectedAt,
    approvedBy: null,
    approvedAt: null,
    reason,
  };

  const deterministicHash = computeDeterministicSha256(
    JSON.stringify({ proposedReversal, postmortem: postmortemBase }),
  );

  return {
    ok: true,
    proposedReversal,
    postmortem: {
      ...postmortemBase,
      deterministicHash,
    },
  };
}

export type ApproveReversalPostmortemResult =
  | {
      ok: true;
      status: 'approved';
      approvedBy: string;
      approvedAt: string;
    }
  | {
      ok: false;
      code: 'self_approval_forbidden' | 'invalid_approval';
      reason: string;
    };

/**
 * Memvalidasi persetujuan manusia atas usulan jurnal pembalik & post-mortem
 * dengan menegakkan Segregation of Duties (`approvedBy !== detectedBy`).
 */
export function approveMispostingReversalPostmortem(
  postmortem: Pick<IncidentPostmortemDocument, 'detectedBy' | 'status'>,
  approval: { approvedBy: string; approvedAt: string },
): ApproveReversalPostmortemResult {
  const approvedBy = String(approval?.approvedBy ?? '').trim();
  const approvedAt = String(approval?.approvedAt ?? '').trim();
  const detectedBy = String(postmortem?.detectedBy ?? '').trim();

  if (!approvedBy || !approvedAt) {
    return {
      ok: false,
      code: 'invalid_approval',
      reason: 'approvedBy dan approvedAt wajib diisi.',
    };
  }
  if (approvedBy === detectedBy) {
    return {
      ok: false,
      code: 'self_approval_forbidden',
      reason: 'Pelapor/pembuat usulan pembalik tidak boleh menyetujui post-mortemnya sendiri (SoD).',
    };
  }

  return {
    ok: true,
    status: 'approved',
    approvedBy,
    approvedAt,
  };
}
