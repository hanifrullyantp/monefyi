import { supabase } from '../../lib/supabase';
import {
  buildPrepareEntryFromReceipt,
  extractReceiptFields,
  type ExtractReceiptOptions,
  type PrepareEntryFromReceiptResult,
  type ReceiptAttachmentMeta,
  type ReceiptExtractionResult,
} from '../../../../../packages/domain/src/receiptExtraction';
import {
  prepareFinanceEntry,
  type AgentNextAction,
  type ClosedCandidateSelector,
  type EntityCatalogItem,
  type FinanceAgentIntent,
  type OrgFinanceRule,
  type PrepareEntryInput,
  type PrepareEntryResult,
} from '../../lib/financeEntryEngine';

export type ReceiptPrepareContext = {
  intent?: FinanceAgentIntent;
  projectId?: string;
  partyId?: string;
  walletId?: string;
  targetWalletId?: string;
  subType?: PrepareEntryInput['subType'];
  projects?: EntityCatalogItem[];
  parties?: EntityCatalogItem[];
  wallets?: EntityCatalogItem[];
  orgRules?: OrgFinanceRule[];
  lockedPeriods?: string[];
  timeZone?: string;
  now?: number;
  capitalizationThresholdIdr?: number;
  autoCommitThresholdIdr?: number;
  model?: string;
  candidateSelector?: ClosedCandidateSelector;
  extractionOptions?: ExtractReceiptOptions;
};

export type ReceiptDraftResult = {
  status: 'draft';
  requiresReview: true;
  autoCommitted: false;
  action: Exclude<AgentNextAction, 'auto_commit' | 'read_only'>;
  prepareToken: string | null;
  expiresAt: number | null;
  extraction: ReceiptExtractionResult;
  prepareInput: PrepareEntryFromReceiptResult;
  prepareResult: PrepareEntryResult;
  attachmentMeta: ReceiptAttachmentMeta;
  provenance: PrepareEntryFromReceiptResult['provenance'];
};

export interface JournalAttachmentRecord {
  id: string;
  org_id: string;
  journal_entry_id: string | null;
  prepare_token: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number | null;
  sha256_hash: string;
  ocr_raw_text: string | null;
  extracted_json: Record<string, unknown>;
  confidence_score: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface SaveReceiptDraftAttachmentInput {
  orgId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  ocrRawText?: string | null;
  uploadedBy?: string | null;
  draft: ReceiptDraftResult;
}

function mapAttachment(row: Record<string, unknown>): JournalAttachmentRecord {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    journal_entry_id: (row.journal_entry_id as string) || null,
    prepare_token: (row.prepare_token as string) || null,
    storage_path: row.storage_path as string,
    file_name: row.file_name as string,
    mime_type: row.mime_type as string,
    file_size_bytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    sha256_hash: row.sha256_hash as string,
    ocr_raw_text: (row.ocr_raw_text as string) || null,
    extracted_json: (row.extracted_json as Record<string, unknown>) || {},
    confidence_score: row.confidence_score != null ? Number(row.confidence_score) : null,
    uploaded_by: (row.uploaded_by as string) || null,
    created_at: row.created_at as string,
  };
}

/**
 * Mengekstrak teks OCR nota/struk/invoice -> slot `prepare_entry` -> draf ber-token + lampiran terikat.
 * ATURAN KERAS: Selalu mengembalikan `status: 'draft'`, `requiresReview: true`, `autoCommitted: false`.
 * Tidak pernah auto-commit dan tidak pernah memilih debit/kredit.
 */
export function extractReceiptToDraft(
  rawText: string,
  attachmentMeta: ReceiptAttachmentMeta,
  prepareContext: ReceiptPrepareContext = {},
): ReceiptDraftResult {
  const extractionOpts: ExtractReceiptOptions = {
    ...(prepareContext.extractionOptions || {}),
    timeZone: prepareContext.extractionOptions?.timeZone || prepareContext.timeZone || 'Asia/Jakarta',
    now: prepareContext.extractionOptions?.now ?? (prepareContext.now != null ? new Date(prepareContext.now) : undefined),
  };

  const extraction = extractReceiptFields(rawText, extractionOpts);
  const resolvedMeta: ReceiptAttachmentMeta = {
    ...attachmentMeta,
    attachmentHash: attachmentMeta.attachmentHash || extraction.contentHash,
  };
  const prepareInput = buildPrepareEntryFromReceipt(extraction, resolvedMeta);

  const prepareResult = prepareFinanceEntry({
    text: prepareInput.text,
    intent: prepareContext.intent,
    projectId: prepareContext.projectId,
    partyId: prepareContext.partyId,
    walletId: prepareContext.walletId,
    targetWalletId: prepareContext.targetWalletId,
    amount: prepareInput.amount,
    entryDate: prepareInput.entryDate,
    subType: prepareContext.subType,
    projects: prepareContext.projects,
    parties: prepareContext.parties,
    wallets: prepareContext.wallets,
    orgRules: prepareContext.orgRules,
    lockedPeriods: prepareContext.lockedPeriods,
    timeZone: prepareContext.timeZone,
    now: prepareContext.now,
    capitalizationThresholdIdr: prepareContext.capitalizationThresholdIdr,
    autoCommitThresholdIdr: prepareContext.autoCommitThresholdIdr,
    model: prepareContext.model || 'receipt-ocr-v1',
    candidateSelector: prepareContext.candidateSelector,
  });

  const prepareToken = prepareResult.ok && prepareResult.status === 'prepared'
    ? prepareResult.prepareToken
    : null;
  const expiresAt = prepareResult.ok && prepareResult.status === 'prepared'
    ? prepareResult.expiresAt
    : null;

  const hasSeriousWarning =
    extraction.warnings.includes('prompt_injection_detected')
    || extraction.warnings.includes('sum_items_mismatch_total')
    || extraction.warnings.includes('low_confidence_total')
    || extraction.overallConfidence < 0.65;

  // Nota OCR tidak pernah auto-commit: paling tinggi confirm_one_tap, atau ask_back bila ragu/ada peringatan.
  const action: ReceiptDraftResult['action'] =
    !prepareResult.ok || prepareResult.status !== 'prepared' || hasSeriousWarning
      ? 'ask_back'
      : 'confirm_one_tap';

  return {
    status: 'draft',
    requiresReview: true,
    autoCommitted: false,
    action,
    prepareToken,
    expiresAt,
    extraction,
    prepareInput,
    prepareResult,
    attachmentMeta: resolvedMeta,
    provenance: prepareInput.provenance,
  };
}

/**
 * Menyimpan metadata draf lampiran nota ke `planner_journal_attachments` (sebelum commit).
 */
export async function saveReceiptDraftAttachment(
  input: SaveReceiptDraftAttachmentInput,
): Promise<JournalAttachmentRecord> {
  if (!input.orgId) throw new Error('orgId wajib diisi.');
  if (!input.storagePath || !input.fileName || !input.mimeType) {
    throw new Error('storagePath, fileName, dan mimeType wajib diisi.');
  }

  const sha256Hash = input.draft.attachmentMeta.attachmentHash || input.draft.extraction.contentHash;
  const { data, error } = await supabase
    .from('planner_journal_attachments')
    .insert({
      org_id: input.orgId,
      journal_entry_id: null,
      prepare_token: input.draft.prepareToken,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes ?? null,
      sha256_hash: sha256Hash,
      ocr_raw_text: input.ocrRawText ?? input.draft.extraction.sanitizedText,
      extracted_json: input.draft.extraction as unknown as Record<string, unknown>,
      confidence_score: input.draft.extraction.overallConfidence,
      uploaded_by: input.uploadedBy ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapAttachment(data as Record<string, unknown>);
}

/**
 * Mengecek apakah hash SHA-256 berkas nota sudah pernah diunggah di organisasi ini (deteksi duplikat).
 */
export async function findDuplicateAttachmentByHash(
  orgId: string,
  sha256Hash: string,
): Promise<JournalAttachmentRecord[]> {
  if (!orgId || !sha256Hash) return [];
  const { data, error } = await supabase
    .from('planner_journal_attachments')
    .select('*')
    .eq('org_id', orgId)
    .eq('sha256_hash', sha256Hash)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapAttachment(row as Record<string, unknown>));
}

/**
 * Mengikat lampiran bukti (`journal_entry_id = NULL`) ke jurnal yang telah ter-commit (`NULL -> UUID`).
 * Sekali terikat, lampiran bersifat permanen dan tidak boleh dialihkan ke jurnal lain.
 */
export async function bindAttachmentToJournal(
  orgId: string,
  attachmentId: string,
  journalEntryId: string,
): Promise<JournalAttachmentRecord> {
  if (!orgId || !attachmentId || !journalEntryId) {
    throw new Error('orgId, attachmentId, dan journalEntryId wajib diisi.');
  }

  const { data, error } = await supabase
    .from('planner_journal_attachments')
    .update({ journal_entry_id: journalEntryId })
    .eq('id', attachmentId)
    .eq('org_id', orgId)
    .is('journal_entry_id', null)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) {
    return mapAttachment(data as Record<string, unknown>);
  }

  // Periksa kondisi idempoten vs sudah terikat jurnal lain vs tidak ditemukan
  const { data: existing, error: fetchError } = await supabase
    .from('planner_journal_attachments')
    .select('*')
    .eq('id', attachmentId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) {
    throw new Error('lampiran_tidak_ditemukan: Lampiran bukti tidak ditemukan pada organisasi ini.');
  }

  const mapped = mapAttachment(existing as Record<string, unknown>);
  if (mapped.journal_entry_id === journalEntryId) {
    return mapped;
  }
  throw new Error('lampiran_sudah_terikat_jurnal_lain: Lampiran bukti sudah terikat ke jurnal lain dan tidak boleh diubah.');
}

/**
 * Memuat seluruh lampiran bukti yang terikat pada satu entri jurnal.
 */
export async function loadAttachmentsForJournal(
  orgId: string,
  journalEntryId: string,
): Promise<JournalAttachmentRecord[]> {
  if (!orgId || !journalEntryId) return [];
  const { data, error } = await supabase
    .from('planner_journal_attachments')
    .select('*')
    .eq('org_id', orgId)
    .eq('journal_entry_id', journalEntryId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapAttachment(row as Record<string, unknown>));
}
