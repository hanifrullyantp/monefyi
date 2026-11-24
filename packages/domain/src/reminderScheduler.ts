import { toRupiah } from './journal';
import type { ClientRiskBand } from './proactiveFinance';

const MS_PER_DAY = 86_400_000;
const DEFAULT_MISSING_RECEIPT_THRESHOLD_RUPIAH = 500_000;
const PAYABLE_DUE_SOON_DAYS = 3;

function parseYmdUtcMs(ymd: string, fieldName = 'tanggal'): number {
  const raw = String(ymd ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Format ${fieldName} tidak valid (harus YYYY-MM-DD): ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal ${fieldName} tidak valid: ${ymd}`);
  }
  return utc;
}

function diffDaysUtc(fromYmd: string, toYmd: string, fromLabel = 'dueDate', toLabel = 'asOfDate'): number {
  const fromMs = parseYmdUtcMs(fromYmd, fromLabel);
  const toMs = parseYmdUtcMs(toYmd, toLabel);
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}

function formatRupiahLabel(amount: number): string {
  const integer = toRupiah(amount);
  const absFormatted = Math.abs(integer)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return integer < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

function requireNonEmptyId(value: string, label: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${label} wajib diisi`);
  }
  return normalized;
}

// ============================================================================
// 1. Mesin Pengingat Proaktif Multitenant (5 Jenis Deterministik + Dedupe)
// ============================================================================

export const PROACTIVE_REMINDER_TYPES = [
  'payable_due',
  'receivable_overdue',
  'termin_ready_to_bill',
  'missing_receipt_attachment',
  'journal_needs_review',
] as const;

export type ProactiveReminderType = (typeof PROACTIVE_REMINDER_TYPES)[number];
export type ProactiveReminderSeverity = 'info' | 'warning' | 'critical';

export type PayableReminderInput = {
  id: string;
  orgId: string;
  partyId?: string | null;
  partyName: string;
  projectId?: string | null;
  dueDate: string;
  outstandingAmount: number;
  status?: string | null;
};

export type ReceivableReminderInput = {
  id: string;
  orgId: string;
  partyId?: string | null;
  partyName: string;
  projectId?: string | null;
  invoiceNumber?: string | null;
  dueDate: string;
  outstandingAmount: number;
  status?: string | null;
};

export type TerminReadyReminderInput = {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  terminName: string;
  targetProgressPct: number;
  actualProgressPct: number;
  terminAmount: number;
  isBilled: boolean;
  partyId?: string | null;
  partyName?: string | null;
};

export type ExpenseReceiptCheckInput = {
  id: string;
  orgId: string;
  projectId?: string | null;
  description: string;
  entryDate: string;
  amount: number;
  hasAttachment: boolean;
  attachmentCount?: number;
};

export type JournalNeedsReviewInput = {
  id: string;
  orgId: string;
  journalEntryId?: string | null;
  projectId?: string | null;
  entryDate: string;
  description: string;
  amount: number;
  needsReview: boolean;
  reason?: string | null;
};

export type TenantProactiveReminderInput = {
  payables?: PayableReminderInput[];
  receivables?: ReceivableReminderInput[];
  termins?: TerminReadyReminderInput[];
  expenses?: ExpenseReceiptCheckInput[];
  journalLines?: JournalNeedsReviewInput[];
};

export type BuildTenantRemindersOptions = {
  payableDueSoonDays?: number;
  missingReceiptThresholdRupiah?: number;
};

export type ProactiveReminderItem = {
  orgId: string;
  reminderType: ProactiveReminderType;
  dedupeKey: string;
  severity: ProactiveReminderSeverity;
  entityId: string;
  title: string;
  amountRupiah: number;
  detail: Record<string, unknown>;
  provenance: {
    orgId: string;
    asOfDate: string;
    reminderType: ProactiveReminderType;
    entityId: string;
    dedupeKey: string;
  };
};

export type TenantProactiveRemindersResult = {
  orgId: string;
  asOfDate: string;
  reminders: ProactiveReminderItem[];
  countsByType: Record<ProactiveReminderType, number>;
  crossTenantRejectedCount: number;
  provenance: {
    orgId: string;
    asOfDate: string;
    payableDueSoonDays: number;
    missingReceiptThresholdRupiah: number;
    totalInputItems: number;
    acceptedInputItems: number;
    crossTenantRejectedCount: number;
    generatedCount: number;
    schedulerVersion: 'deterministic_proactive_reminders_v1';
  };
};

function makeDedupeKey(
  orgId: string,
  reminderType: ProactiveReminderType,
  entityId: string,
  asOfDate: string,
): string {
  return `${orgId}:${reminderType}:${entityId}:${asOfDate}`;
}

function emptyCountsByType(): Record<ProactiveReminderType, number> {
  return {
    payable_due: 0,
    receivable_overdue: 0,
    termin_ready_to_bill: 0,
    missing_receipt_attachment: 0,
    journal_needs_review: 0,
  };
}

function filterOwnedItems<T extends { orgId: string }>(
  items: readonly T[] | undefined,
  targetOrgId: string,
): { owned: T[]; rejectedCount: number } {
  const owned: T[] = [];
  let rejectedCount = 0;
  for (const item of items ?? []) {
    const itemOrgId = String(item?.orgId ?? '').trim();
    if (!itemOrgId || itemOrgId !== targetOrgId) {
      rejectedCount += 1;
      continue;
    }
    owned.push(item);
  }
  return { owned, rejectedCount };
}

/**
 * Membangun 5 jenis pengingat keuangan proaktif secara deterministik untuk tepat satu `orgId`.
 * Seluruh item dengan `orgId` berbeda ditolak secara ketat dan dicatat pada `crossTenantRejectedCount`.
 */
export function buildTenantProactiveReminders(
  orgId: string,
  input: TenantProactiveReminderInput,
  asOfDate: string,
  options: BuildTenantRemindersOptions = {},
): TenantProactiveRemindersResult {
  const normalizedOrgId = requireNonEmptyId(orgId, 'orgId');
  parseYmdUtcMs(asOfDate, 'asOfDate');
  const normalizedAsOfDate = String(asOfDate).trim();

  const payableDueSoonDays = Math.max(
    0,
    Math.floor(options.payableDueSoonDays ?? PAYABLE_DUE_SOON_DAYS),
  );
  const missingReceiptThreshold = Math.max(
    1,
    toRupiah(options.missingReceiptThresholdRupiah ?? DEFAULT_MISSING_RECEIPT_THRESHOLD_RUPIAH),
  );

  const payablesFiltered = filterOwnedItems(input.payables, normalizedOrgId);
  const receivablesFiltered = filterOwnedItems(input.receivables, normalizedOrgId);
  const terminsFiltered = filterOwnedItems(input.termins, normalizedOrgId);
  const expensesFiltered = filterOwnedItems(input.expenses, normalizedOrgId);
  const journalLinesFiltered = filterOwnedItems(input.journalLines, normalizedOrgId);

  const crossTenantRejectedCount =
    payablesFiltered.rejectedCount
    + receivablesFiltered.rejectedCount
    + terminsFiltered.rejectedCount
    + expensesFiltered.rejectedCount
    + journalLinesFiltered.rejectedCount;

  const acceptedInputItems =
    payablesFiltered.owned.length
    + receivablesFiltered.owned.length
    + terminsFiltered.owned.length
    + expensesFiltered.owned.length
    + journalLinesFiltered.owned.length;

  const totalInputItems = acceptedInputItems + crossTenantRejectedCount;

  const reminders: ProactiveReminderItem[] = [];
  const countsByType = emptyCountsByType();
  const seenDedupeKeys = new Set<string>();

  const pushReminder = (item: ProactiveReminderItem) => {
    if (seenDedupeKeys.has(item.dedupeKey)) return;
    seenDedupeKeys.add(item.dedupeKey);
    reminders.push(item);
    countsByType[item.reminderType] += 1;
  };

  // 1. payable_due: hutang jatuh tempo <= 3 hari atau sudah lewat
  for (const payable of payablesFiltered.owned) {
    const status = String(payable.status ?? 'open').trim().toLowerCase();
    if (status === 'paid' || status === 'cancelled') continue;
    const amountRupiah = toRupiah(payable.outstandingAmount);
    if (amountRupiah <= 0) continue;

    const entityId = requireNonEmptyId(payable.id, 'payable.id');
    const daysUntilDue = diffDaysUtc(normalizedAsOfDate, payable.dueDate, 'asOfDate', 'dueDate');
    if (daysUntilDue > payableDueSoonDays) continue;

    const severity: ProactiveReminderSeverity = daysUntilDue <= 0 ? 'critical' : 'warning';
    const partyName = String(payable.partyName ?? '').trim() || payable.partyId || entityId;
    const title =
      daysUntilDue < 0
        ? `Hutang lewat jatuh tempo ${Math.abs(daysUntilDue)} hari: ${partyName} (${formatRupiahLabel(amountRupiah)})`
        : daysUntilDue === 0
          ? `Hutang jatuh tempo hari ini: ${partyName} (${formatRupiahLabel(amountRupiah)})`
          : `Hutang jatuh tempo dalam ${daysUntilDue} hari: ${partyName} (${formatRupiahLabel(amountRupiah)})`;

    const dedupeKey = makeDedupeKey(normalizedOrgId, 'payable_due', entityId, normalizedAsOfDate);
    pushReminder({
      orgId: normalizedOrgId,
      reminderType: 'payable_due',
      dedupeKey,
      severity,
      entityId,
      title,
      amountRupiah,
      detail: {
        partyId: payable.partyId ?? null,
        partyName,
        projectId: payable.projectId ?? null,
        dueDate: payable.dueDate,
        daysUntilDue,
        daysOverdue: Math.max(0, -daysUntilDue),
        outstandingAmountRupiah: amountRupiah,
      },
      provenance: {
        orgId: normalizedOrgId,
        asOfDate: normalizedAsOfDate,
        reminderType: 'payable_due',
        entityId,
        dedupeKey,
      },
    });
  }

  // 2. receivable_overdue: tagihan/piutang klien jatuh tempo (> 0 hari)
  for (const receivable of receivablesFiltered.owned) {
    const status = String(receivable.status ?? 'open').trim().toLowerCase();
    if (status === 'paid' || status === 'cancelled') continue;
    const amountRupiah = toRupiah(receivable.outstandingAmount);
    if (amountRupiah <= 0) continue;

    const entityId = requireNonEmptyId(receivable.id, 'receivable.id');
    const daysOverdue = diffDaysUtc(receivable.dueDate, normalizedAsOfDate, 'dueDate', 'asOfDate');
    if (daysOverdue <= 0) continue;

    const severity: ProactiveReminderSeverity = daysOverdue >= 30 ? 'critical' : 'warning';
    const partyName = String(receivable.partyName ?? '').trim() || receivable.partyId || entityId;
    const invoiceLabel = receivable.invoiceNumber ? ` [${receivable.invoiceNumber}]` : '';
    const title = `Piutang jatuh tempo ${daysOverdue} hari${invoiceLabel}: ${partyName} (${formatRupiahLabel(amountRupiah)})`;

    const dedupeKey = makeDedupeKey(
      normalizedOrgId,
      'receivable_overdue',
      entityId,
      normalizedAsOfDate,
    );
    pushReminder({
      orgId: normalizedOrgId,
      reminderType: 'receivable_overdue',
      dedupeKey,
      severity,
      entityId,
      title,
      amountRupiah,
      detail: {
        partyId: receivable.partyId ?? null,
        partyName,
        projectId: receivable.projectId ?? null,
        invoiceNumber: receivable.invoiceNumber ?? null,
        dueDate: receivable.dueDate,
        daysOverdue,
        outstandingAmountRupiah: amountRupiah,
      },
      provenance: {
        orgId: normalizedOrgId,
        asOfDate: normalizedAsOfDate,
        reminderType: 'receivable_overdue',
        entityId,
        dedupeKey,
      },
    });
  }

  // 3. termin_ready_to_bill: progres proyek mencapai target termin tetapi belum ditagih
  for (const termin of terminsFiltered.owned) {
    if (termin.isBilled) continue;
    const amountRupiah = toRupiah(termin.terminAmount);
    if (amountRupiah <= 0) continue;
    if (!Number.isFinite(termin.targetProgressPct) || termin.targetProgressPct <= 0) continue;
    if (!Number.isFinite(termin.actualProgressPct) || termin.actualProgressPct < termin.targetProgressPct) {
      continue;
    }

    const entityId = requireNonEmptyId(termin.id, 'termin.id');
    const dedupeKey = makeDedupeKey(
      normalizedOrgId,
      'termin_ready_to_bill',
      entityId,
      normalizedAsOfDate,
    );
    const title = `Termin siap ditagih: ${termin.projectName} — ${termin.terminName} (${formatRupiahLabel(amountRupiah)})`;

    pushReminder({
      orgId: normalizedOrgId,
      reminderType: 'termin_ready_to_bill',
      dedupeKey,
      severity: 'warning',
      entityId,
      title,
      amountRupiah,
      detail: {
        projectId: termin.projectId,
        projectName: termin.projectName,
        terminName: termin.terminName,
        targetProgressPct: termin.targetProgressPct,
        actualProgressPct: termin.actualProgressPct,
        terminAmountRupiah: amountRupiah,
        partyId: termin.partyId ?? null,
        partyName: termin.partyName ?? null,
      },
      provenance: {
        orgId: normalizedOrgId,
        asOfDate: normalizedAsOfDate,
        reminderType: 'termin_ready_to_bill',
        entityId,
        dedupeKey,
      },
    });
  }

  // 4. missing_receipt_attachment: biaya di atas ambang tanpa lampiran nota
  for (const expense of expensesFiltered.owned) {
    const attachmentCount = Math.max(0, Math.floor(expense.attachmentCount ?? 0));
    if (expense.hasAttachment || attachmentCount > 0) continue;

    const amountRupiah = toRupiah(expense.amount);
    if (amountRupiah < missingReceiptThreshold) continue;

    parseYmdUtcMs(expense.entryDate, 'expense.entryDate');
    const entityId = requireNonEmptyId(expense.id, 'expense.id');
    const dedupeKey = makeDedupeKey(
      normalizedOrgId,
      'missing_receipt_attachment',
      entityId,
      normalizedAsOfDate,
    );
    const severity: ProactiveReminderSeverity = amountRupiah >= 5_000_000 ? 'critical' : 'warning';
    const title = `Biaya tanpa lampiran nota: ${expense.description} (${formatRupiahLabel(amountRupiah)})`;

    pushReminder({
      orgId: normalizedOrgId,
      reminderType: 'missing_receipt_attachment',
      dedupeKey,
      severity,
      entityId,
      title,
      amountRupiah,
      detail: {
        projectId: expense.projectId ?? null,
        description: expense.description,
        entryDate: expense.entryDate,
        amountRupiah,
        thresholdRupiah: missingReceiptThreshold,
      },
      provenance: {
        orgId: normalizedOrgId,
        asOfDate: normalizedAsOfDate,
        reminderType: 'missing_receipt_attachment',
        entityId,
        dedupeKey,
      },
    });
  }

  // 5. journal_needs_review: baris jurnal bertanda needs_review = true
  for (const line of journalLinesFiltered.owned) {
    if (!line.needsReview) continue;

    parseYmdUtcMs(line.entryDate, 'journalLine.entryDate');
    const entityId = requireNonEmptyId(line.id, 'journalLine.id');
    const amountRupiah = Math.max(0, toRupiah(line.amount));
    const dedupeKey = makeDedupeKey(
      normalizedOrgId,
      'journal_needs_review',
      entityId,
      normalizedAsOfDate,
    );
    const title = `Baris jurnal perlu tinjauan: ${line.description} (${formatRupiahLabel(amountRupiah)})`;

    pushReminder({
      orgId: normalizedOrgId,
      reminderType: 'journal_needs_review',
      dedupeKey,
      severity: 'warning',
      entityId,
      title,
      amountRupiah,
      detail: {
        journalEntryId: line.journalEntryId ?? null,
        projectId: line.projectId ?? null,
        entryDate: line.entryDate,
        description: line.description,
        amountRupiah,
        reason: line.reason ?? 'needs_review_flag',
      },
      provenance: {
        orgId: normalizedOrgId,
        asOfDate: normalizedAsOfDate,
        reminderType: 'journal_needs_review',
        entityId,
        dedupeKey,
      },
    });
  }

  return {
    orgId: normalizedOrgId,
    asOfDate: normalizedAsOfDate,
    reminders,
    countsByType,
    crossTenantRejectedCount,
    provenance: {
      orgId: normalizedOrgId,
      asOfDate: normalizedAsOfDate,
      payableDueSoonDays,
      missingReceiptThresholdRupiah: missingReceiptThreshold,
      totalInputItems,
      acceptedInputItems,
      crossTenantRejectedCount,
      generatedCount: reminders.length,
      schedulerVersion: 'deterministic_proactive_reminders_v1',
    },
  };
}

// ============================================================================
// 2. Draf Pesan Penagihan (WA / Email) & Validasi Approval + Audit Trail
// ============================================================================

export type CollectionChannel = 'whatsapp' | 'email';
export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';
export type CollectionDraftStatus =
  | 'pending_approval'
  | 'approved'
  | 'dispatched'
  | 'rejected';

export type CollectionInvoiceInput = {
  id: string;
  orgId?: string;
  invoiceNumber: string;
  dueDate: string;
  outstandingAmount: number;
  daysOverdue?: number;
  projectName?: string | null;
};

export type BuildCollectionDraftInput = {
  id?: string;
  orgId: string;
  partyId: string;
  partyName: string;
  channel: CollectionChannel;
  invoices: CollectionInvoiceInput[];
  riskBand: ClientRiskBand;
  autonomyLevel: AutonomyLevel;
  createdBy: string;
  asOfDate?: string;
  companyName?: string;
};

export type CollectionMessageDraft = {
  id: string | null;
  orgId: string;
  partyId: string;
  partyName: string;
  channel: CollectionChannel;
  subject: string;
  body: string;
  totalAmountRupiah: number;
  riskBand: ClientRiskBand;
  autonomyLevel: AutonomyLevel;
  status: CollectionDraftStatus;
  autoSendAllowed: boolean;
  requiresHumanApproval: boolean;
  createdBy: string;
  approvedBy: string | null;
  auditLogId: string | null;
  dispatchedAt: string | null;
  provenance: {
    orgId: string;
    partyId: string;
    channel: CollectionChannel;
    riskBand: ClientRiskBand;
    autonomyLevel: AutonomyLevel;
    invoiceCount: number;
    invoiceIds: string[];
    invoiceNumbers: string[];
    invoiceAmountsRupiah: number[];
    totalAmountRupiah: number;
    asOfDate: string | null;
    builderVersion: 'deterministic_collection_draft_v1';
  };
};

export type CollectionDraftApprovalInput = {
  orgId: string;
  approvedBy: string;
  approvedAt: string;
  auditLogId: string;
};

export type CollectionDispatchRejectCode =
  | 'cross_tenant_forbidden'
  | 'self_approval_forbidden'
  | 'audit_trail_required'
  | 'invalid_status'
  | 'invalid_approval';

export type ApproveAndDispatchCollectionResult =
  | {
      ok: true;
      draft: CollectionMessageDraft;
    }
  | {
      ok: false;
      code: CollectionDispatchRejectCode;
      reason: string;
    };

function resolveToneOpening(riskBand: ClientRiskBand, channel: CollectionChannel): string {
  if (riskBand === 'critical' || riskBand === 'high') {
    return channel === 'whatsapp'
      ? 'Dengan hormat, kami ingin menindaklanjuti secara baik-baik tagihan yang telah melewati tanggal jatuh tempo berikut:'
      : 'Dengan hormat, melalui surat elektronik ini kami mohon perhatian Bapak/Ibu terkait tagihan yang telah melewati jatuh tempo sebagai berikut:';
  }
  return channel === 'whatsapp'
    ? 'Halo, izin mengingatkan dengan hormat mengenai rincian tagihan proyek yang perlu diselesaikan:'
    : 'Dengan hormat, bersama ini kami sampaikan pengingat sopan mengenai rincian tagihan proyek berikut:';
}

/**
 * Menyusun draf pesan penagihan (WhatsApp / Email) Bahasa Indonesia secara deterministik.
 * Seluruh nominal rupiah dihitung oleh kode deterministik dan menyertakan `provenance`.
 * ATURAN KERAS: Di `L0` dan `L1` (serta untuk seluruh pengiriman eksternal berisiko),
 * `status` SELALU `'pending_approval'` dan `autoSendAllowed: false`.
 */
export function buildCollectionMessageDraft(
  input: BuildCollectionDraftInput,
): CollectionMessageDraft {
  const orgId = requireNonEmptyId(input.orgId, 'orgId');
  const partyId = requireNonEmptyId(input.partyId, 'partyId');
  const partyName = requireNonEmptyId(input.partyName, 'partyName');
  const createdBy = requireNonEmptyId(input.createdBy, 'createdBy');

  if (input.channel !== 'whatsapp' && input.channel !== 'email') {
    throw new Error(`Channel penagihan tidak valid: ${String(input.channel)}`);
  }
  if (
    input.autonomyLevel !== 'L0'
    && input.autonomyLevel !== 'L1'
    && input.autonomyLevel !== 'L2'
    && input.autonomyLevel !== 'L3'
  ) {
    throw new Error(`Autonomy level tidak valid: ${String(input.autonomyLevel)}`);
  }

  const normalizedAsOfDate = input.asOfDate ? String(input.asOfDate).trim() : null;
  if (normalizedAsOfDate) {
    parseYmdUtcMs(normalizedAsOfDate, 'asOfDate');
  }

  const invoices = input.invoices ?? [];
  if (invoices.length === 0) {
    throw new Error('Minimal satu invoice wajib disertakan dalam draf penagihan');
  }

  const normalizedInvoices = invoices.map((inv) => {
    const invOrgId = inv.orgId !== undefined ? String(inv.orgId ?? '').trim() : orgId;
    if (!invOrgId || invOrgId !== orgId) {
      throw new Error('cross_tenant_forbidden: invoice bukan milik organisasi aktif');
    }
    const id = requireNonEmptyId(inv.id, 'invoice.id');
    const invoiceNumber = requireNonEmptyId(inv.invoiceNumber, 'invoice.invoiceNumber');
    parseYmdUtcMs(inv.dueDate, 'invoice.dueDate');
    const amountRupiah = toRupiah(inv.outstandingAmount);
    if (amountRupiah <= 0) {
      throw new Error(`Nominal tagihan invoice ${invoiceNumber} harus > 0`);
    }
    const computedOverdue =
      inv.daysOverdue !== undefined
        ? Math.max(0, Math.floor(inv.daysOverdue))
        : normalizedAsOfDate
          ? Math.max(0, diffDaysUtc(inv.dueDate, normalizedAsOfDate, 'dueDate', 'asOfDate'))
          : 0;

    return {
      id,
      invoiceNumber,
      dueDate: inv.dueDate,
      amountRupiah,
      daysOverdue: computedOverdue,
      projectName: inv.projectName ? String(inv.projectName).trim() : null,
    };
  });

  const totalAmountRupiah = normalizedInvoices.reduce((sum, inv) => sum + inv.amountRupiah, 0);
  const totalFormatted = formatRupiahLabel(totalAmountRupiah);
  const companyLabel = String(input.companyName ?? '').trim() || 'Tim Keuangan Froyek';

  const invoiceLines = normalizedInvoices.map((inv, idx) => {
    const projectPart = inv.projectName ? ` (${inv.projectName})` : '';
    const overduePart =
      inv.daysOverdue > 0
        ? ` — lewat ${inv.daysOverdue} hari dari jatuh tempo ${inv.dueDate}`
        : ` — jatuh tempo ${inv.dueDate}`;
    return `${idx + 1}. No. ${inv.invoiceNumber}${projectPart}: ${formatRupiahLabel(inv.amountRupiah)}${overduePart}`;
  });

  const subject =
    input.channel === 'email'
      ? `Pengingat Pembayaran Tagihan (${normalizedInvoices.length} Invoice) — ${totalFormatted}`
      : `Draf Penagihan WhatsApp — ${partyName} (${totalFormatted})`;

  const opening = resolveToneOpening(input.riskBand, input.channel);
  const body =
    input.channel === 'whatsapp'
      ? [
          `Yth. Bapak/Ibu ${partyName},`,
          '',
          opening,
          ...invoiceLines,
          '',
          `Total tagihan: *${totalFormatted}*`,
          '',
          'Mohon konfirmasi jadwal pembayaran atau kirimkan bukti transfer apabila sudah dibayarkan. Terima kasih atas kerja samanya.',
          `Salam hormat, ${companyLabel}`,
        ].join('\n')
      : [
          `Kepada Yth. Bapak/Ibu ${partyName},`,
          '',
          opening,
          '',
          ...invoiceLines,
          '',
          `Total kewajiban pembayaran: ${totalFormatted}`,
          '',
          'Apabila pembayaran telah dilakukan, mohon abaikan pesan ini dan kirimkan bukti transfer agar dapat kami rekonsiliasi pada buku besar.',
          'Terima kasih atas perhatian dan kerja sama Bapak/Ibu.',
          '',
          `Hormat kami,`,
          companyLabel,
        ].join('\n');

  // ATURAN KERAS: L0 dan L1 selalu pending_approval & autoSendAllowed: false.
  // Pengiriman eksternal ke klien tetap mewajibkan persetujuan manusia + jejak audit.
  const isStrictDraftOnlyLevel =
    input.autonomyLevel === 'L0'
    || input.autonomyLevel === 'L1'
    || input.autonomyLevel === 'L3'
    || input.autonomyLevel === 'L2';

  return {
    id: input.id ?? null,
    orgId,
    partyId,
    partyName,
    channel: input.channel,
    subject,
    body,
    totalAmountRupiah,
    riskBand: input.riskBand,
    autonomyLevel: input.autonomyLevel,
    status: isStrictDraftOnlyLevel ? 'pending_approval' : 'pending_approval',
    autoSendAllowed: false,
    requiresHumanApproval: true,
    createdBy,
    approvedBy: null,
    auditLogId: null,
    dispatchedAt: null,
    provenance: {
      orgId,
      partyId,
      channel: input.channel,
      riskBand: input.riskBand,
      autonomyLevel: input.autonomyLevel,
      invoiceCount: normalizedInvoices.length,
      invoiceIds: normalizedInvoices.map((inv) => inv.id),
      invoiceNumbers: normalizedInvoices.map((inv) => inv.invoiceNumber),
      invoiceAmountsRupiah: normalizedInvoices.map((inv) => inv.amountRupiah),
      totalAmountRupiah,
      asOfDate: normalizedAsOfDate,
      builderVersion: 'deterministic_collection_draft_v1',
    },
  };
}

/**
 * Memvalidasi persetujuan dan pengiriman draf penagihan secara ketat:
 * (a) Isolasi tenant (`approval.orgId === draft.orgId`),
 * (b) Pemisahan wewenang / SoD (`approvedBy !== draft.createdBy`),
 * (c) Jejak audit wajib (`auditLogId` non-kosong sebelum status berubah ke `'dispatched'`).
 */
export function approveAndDispatchCollectionDraft(
  draft: CollectionMessageDraft,
  approval: CollectionDraftApprovalInput,
): ApproveAndDispatchCollectionResult {
  const approvalOrgId = String(approval?.orgId ?? '').trim();
  const draftOrgId = String(draft?.orgId ?? '').trim();
  if (!approvalOrgId || !draftOrgId || approvalOrgId !== draftOrgId) {
    return {
      ok: false,
      code: 'cross_tenant_forbidden',
      reason: 'Persetujuan lintas organisasi ditolak (cross_tenant_forbidden).',
    };
  }

  if (draft.status !== 'pending_approval' && draft.status !== 'approved') {
    return {
      ok: false,
      code: 'invalid_status',
      reason: `Draf berstatus '${draft.status}' tidak dapat dikirim ulang.`,
    };
  }

  const approvedBy = String(approval?.approvedBy ?? '').trim();
  const createdBy = String(draft?.createdBy ?? '').trim();
  if (!approvedBy) {
    return {
      ok: false,
      code: 'invalid_approval',
      reason: 'approvedBy wajib diisi.',
    };
  }
  if (approvedBy === createdBy) {
    return {
      ok: false,
      code: 'self_approval_forbidden',
      reason: 'Pembuat draf tidak boleh menyetujui drafnya sendiri (pemisahan wewenang / SoD).',
    };
  }

  const auditLogId = String(approval?.auditLogId ?? '').trim();
  if (!auditLogId) {
    return {
      ok: false,
      code: 'audit_trail_required',
      reason: 'Pengiriman draf penagihan wajib memiliki auditLogId non-kosong.',
    };
  }

  const approvedAt = String(approval?.approvedAt ?? '').trim();
  if (!approvedAt) {
    return {
      ok: false,
      code: 'invalid_approval',
      reason: 'approvedAt wajib diisi.',
    };
  }

  return {
    ok: true,
    draft: {
      ...draft,
      status: 'dispatched',
      approvedBy,
      auditLogId,
      dispatchedAt: approvedAt,
    },
  };
}

// ============================================================================
// 3. Eksekutor Batch Cron Multitenant Terisolasi
// ============================================================================

export type TenantCronBatchInput = {
  orgId: string;
  input: TenantProactiveReminderInput;
  options?: BuildTenantRemindersOptions;
};

export type MultiTenantCronBatchResult = {
  asOfDate: string;
  resultsByOrg: Record<string, TenantProactiveRemindersResult>;
  tenantCount: number;
  totalRemindersGenerated: number;
  totalCrossTenantRejected: number;
  provenance: {
    asOfDate: string;
    orgIds: string[];
    schedulerVersion: 'deterministic_proactive_reminders_v1';
  };
};

/**
 * Menjalankan mesin pengingat proaktif secara terisolasi per `orgId`.
 * Menjamin 0 kebocoran record/ID lintas tenant di antara organisasi dalam satu batch cron.
 */
export function runMultiTenantCronBatch(
  tenants: readonly TenantCronBatchInput[],
  asOfDate: string,
): MultiTenantCronBatchResult {
  parseYmdUtcMs(asOfDate, 'asOfDate');
  const normalizedAsOfDate = String(asOfDate).trim();

  const resultsByOrg: Record<string, TenantProactiveRemindersResult> = {};
  const orgIds: string[] = [];
  const seenOrgs = new Set<string>();
  let totalRemindersGenerated = 0;
  let totalCrossTenantRejected = 0;

  for (const tenant of tenants ?? []) {
    const orgId = requireNonEmptyId(tenant.orgId, 'tenant.orgId');
    if (seenOrgs.has(orgId)) {
      throw new Error(`Duplikat orgId pada batch cron multitenant: ${orgId}`);
    }
    seenOrgs.add(orgId);
    orgIds.push(orgId);

    const tenantResult = buildTenantProactiveReminders(
      orgId,
      tenant.input,
      normalizedAsOfDate,
      tenant.options,
    );

    // Penjaga isolasi lapis kedua: pastikan setiap reminder hanya membawa orgId tenant bersangkutan
    for (const reminder of tenantResult.reminders) {
      if (reminder.orgId !== orgId || !reminder.dedupeKey.startsWith(`${orgId}:`)) {
        throw new Error(`cross_tenant_leak_detected pada organisasi ${orgId}`);
      }
    }

    resultsByOrg[orgId] = tenantResult;
    totalRemindersGenerated += tenantResult.reminders.length;
    totalCrossTenantRejected += tenantResult.crossTenantRejectedCount;
  }

  return {
    asOfDate: normalizedAsOfDate,
    resultsByOrg,
    tenantCount: orgIds.length,
    totalRemindersGenerated,
    totalCrossTenantRejected,
    provenance: {
      asOfDate: normalizedAsOfDate,
      orgIds,
      schedulerVersion: 'deterministic_proactive_reminders_v1',
    },
  };
}
