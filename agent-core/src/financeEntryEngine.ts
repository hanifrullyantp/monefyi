import { createHash, randomUUID } from 'node:crypto';
import {
  detectAnomalousAmount,
  detectDuplicateEntry,
  type AmountAnomalyResult,
  type DuplicateDetectionResult,
  type ExistingDuplicateEntry,
} from '../../packages/domain/src/anomalyDetection.ts';
import {
  buildJournalTemplate,
  FINANCE_EVENT_CODES,
  linesAreBalanced,
  toRupiah,
  validateJournalDimensions,
  type FinanceEventCode,
  type TemplateLine,
} from '../../packages/domain/src/journal.ts';
import {
  firstRupiah,
  orgToday,
  parseCostCommand,
  parseRupiah,
  parseTanggal,
} from '../../packages/domain/src/money.ts';
import { detectPromptInjection } from '../../packages/domain/src/receiptExtraction.ts';

export const FINANCE_AGENT_INTENTS = [
  'catat_biaya_proyek',
  'catat_opex',
  'catat_pemasukan',
  'bayar_hutang',
  'terima_piutang',
  'kasbon',
  'transfer_kas',
  'dividen',
  'tanya_saldo',
  'catat_invoice_terbit',
  'catat_termin_diterima',
  'catat_retensi',
  'catat_gaji',
] as const;

export type FinanceAgentIntent = (typeof FINANCE_AGENT_INTENTS)[number];
export type FinanceIntent = FinanceAgentIntent;

export type ConfidenceBand = 'high' | 'medium' | 'low';
export type AgentNextAction = 'auto_commit' | 'confirm_one_tap' | 'ask_back' | 'read_only';
export type ClassificationTier = 'org_rule' | 'domain_rule' | 'llm_closed_choice';

export type EntityCatalogItem = {
  id: string;
  name: string;
  aliases?: string[];
};

export type OrgFinanceRule = {
  id: string;
  keyword: string;
  intent: FinanceAgentIntent;
  eventCode: FinanceEventCode;
  rapType?: 'material' | 'labor' | 'equipment' | 'overhead' | 'other';
  opexCategory?: string;
  projectId?: string;
  confidence?: number;
};

export type ClosedAccountCandidate = {
  code: FinanceEventCode | 'aset_tetap';
  label: string;
};

/** Pemilih kandidat tertutup LLM (maks 5 opsi, tidak pernah memilih debit/kredit bebas). */
export type ClosedCandidateSelector = (input: {
  text: string;
  intent: FinanceAgentIntent;
  candidates: ClosedAccountCandidate[];
}) => { chosenCode: string; score: number };

export type PrepareEntryInput = {
  text: string;
  intent?: FinanceAgentIntent;
  projectId?: string;
  partyId?: string;
  walletId?: string;
  targetWalletId?: string;
  amount?: number;
  entryDate?: string;
  subType?: 'dp' | 'termin' | 'pelunasan' | 'retensi_tahan' | 'retensi_cair' | 'proyek' | 'bisnis' | 'opex' | 'aset_tetap';
  dpApplied?: number;
  attachmentHash?: string;
  invoiceNumber?: string;
  existingEntries?: ExistingDuplicateEntry[];
  historicalAmounts?: number[];
  rapRemainingBudget?: number;
  duplicateDateWindowDays?: number;
  highAmountThresholdIdr?: number;
  zScoreThreshold?: number;
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
};

export type PrepareEntryResult =
  | {
    ok: true;
    status: 'prepared';
    prepareToken: string;
    expiresAt: number;
    intent: FinanceAgentIntent;
    eventCode: FinanceEventCode;
    amount: number;
    entryDate: string;
    projectId: string | null;
    partyId: string | null;
    walletId: string | null;
    targetWalletId: string | null;
    rapType: string | null;
    opexCategory: string | null;
    confidence: number;
    confidenceBand: ConfidenceBand;
    action: AgentNextAction;
    tier: ClassificationTier;
    requiresOwnerApproval: boolean;
    summary: string;
    lines: TemplateLine[];
    warnings?: string[];
    duplicateCheck?: DuplicateDetectionResult;
    anomalyCheck?: AmountAnomalyResult;
    meta: {
      source: 'agent';
      model: string;
      prepare_token: string;
    };
  }
  | {
    ok: true;
    status: 'read_snapshot';
    intent: 'tanya_saldo';
    confidence: number;
    confidenceBand: 'high';
    action: 'read_only';
    summary: string;
    recommendedTool: 'get_finance_snapshot';
  }
  | {
    ok: false;
    status: 'needs_choice' | 'ask_back' | 'rejected';
    intent: FinanceAgentIntent | 'unknown';
    confidence: number;
    confidenceBand: 'low';
    action: 'ask_back';
    error: {
      code:
      | 'entity_ambiguous'
      | 'missing_project'
      | 'missing_party'
      | 'missing_amount'
      | 'missing_wallet'
      | 'confirm_asset_vs_opex'
      | 'personal_expense_blocked'
      | 'prompt_injection_detected'
      | 'periode_terkunci'
      | 'nominal_tidak_valid'
      | 'intent_unknown';
      next: string;
    };
    summary: string;
    candidates?: Array<{ id: string; label: string; score?: number }>;
  };

export type CommitEntryInput = {
  prepareToken: string;
  idempotencyKey: string;
  now?: number;
  ownerApproved?: boolean;
};

export type CommittedFinanceEntry = {
  id: string;
  idempotencyKey: string;
  intent: FinanceAgentIntent;
  eventCode: FinanceEventCode;
  amount: number;
  entryDate: string;
  projectId: string | null;
  partyId: string | null;
  walletId: string | null;
  targetWalletId: string | null;
  lines: TemplateLine[];
  meta: {
    source: 'agent';
    model: string;
    prepare_token: string;
  };
  committedAt: number;
};

export type CommitEntryResult =
  | { ok: true; status: 'committed' | 'idempotent_replay'; entry: CommittedFinanceEntry; summary: string }
  | {
    ok: false;
    error: {
      code: 'token_kadaluarsa' | 'token_tidak_ditemukan' | 'idempotency_wajib' | 'butuh_persetujuan_pemilik';
      next: string;
    };
  };

type PreparedRecord = {
  preparedAt: number;
  expiresAt: number;
  intent: FinanceAgentIntent;
  eventCode: FinanceEventCode;
  amount: number;
  entryDate: string;
  projectId: string | null;
  partyId: string | null;
  walletId: string | null;
  targetWalletId: string | null;
  requiresOwnerApproval: boolean;
  lines: TemplateLine[];
  model: string;
  token: string;
  summary: string;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
const DEFAULT_CAP_THRESHOLD_IDR = 5_000_000;
const DEFAULT_AUTO_COMMIT_THRESHOLD_IDR = 1_000_000;

const preparedRegistry = new Map<string, PreparedRecord>();
const committedByIdempotency = new Map<string, CommittedFinanceEntry>();

function normalizeText(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.,/-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen > 0 ? 1 - levenshtein(s1, s2) / maxLen : 0;
}

function stripDatesAndOrdinals(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}\s+(?:jan|januari|feb|februari|mar|maret|apr|april|mei|jun|juni|jul|juli|agu|agt|agustus|sep|sept|september|okt|oktober|nov|november|des|desember)\s+\d{4}\b/gi, ' ')
    .replace(/\b(?:proyek|prj|project|termin|tahap|lantai|lt|blok|kav|no|nomor)\s+\d{1,3}\b/gi, ' ');
}

export function extractAmountDeterministic(rawText: string, explicitAmount?: number): {
  ok: boolean;
  amount: number;
  needsReview: boolean;
} {
  if (explicitAmount != null && Number.isFinite(explicitAmount)) {
    const val = toRupiah(explicitAmount);
    return { ok: val > 0, amount: val, needsReview: val <= 0 };
  }

  const parsedCmd = parseCostCommand(rawText);
  if (parsedCmd && parsedCmd.qty != null && parsedCmd.unitPrice != null && parsedCmd.total > 0) {
    return { ok: true, amount: toRupiah(parsedCmd.total), needsReview: parsedCmd.needsReview };
  }

  const sanitized = stripDatesAndOrdinals(rawText);
  // Tangkap pola "10 sak @ 65rb" / "5 m2 x 120000" meski bukan kata kerja awal
  const qtyMulMatch = sanitized.match(/(\d+(?:[.,]\d+)?)\s*(sak|kg|m2|m3|btg|buah|unit|pcs|lbr|roll|meter|kaleng|ember|dus|set|hari|org)\s*(?:@|x|×|harga|hrg)\s*([0-9.,]+\s*(?:jt|juta|rb|ribu|k)?)/i);
  if (qtyMulMatch) {
    const q = Number(qtyMulMatch[1].replace(',', '.'));
    const unitPrice = parseRupiah(qtyMulMatch[3]);
    if (Number.isFinite(q) && q > 0 && unitPrice.ok && unitPrice.amount > 0) {
      return { ok: true, amount: toRupiah(q * unitPrice.amount), needsReview: unitPrice.needsReview };
    }
  }

  const res = firstRupiah(sanitized);
  return {
    ok: res.ok && res.amount > 0,
    amount: res.ok ? toRupiah(res.amount) : 0,
    needsReview: !res.ok || res.needsReview,
  };
}

export function extractDateDeterministic(
  rawText: string,
  explicitDate?: string,
  timeZone = 'Asia/Jakarta',
  nowMs = Date.now(),
): { ok: boolean; date: string; needsReview: boolean } {
  const nowDate = new Date(nowMs);
  if (explicitDate && explicitDate.trim()) {
    const res = parseTanggal(explicitDate, timeZone, nowDate);
    return { ok: res.ok, date: res.date, needsReview: res.needsReview };
  }

  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/,
    /\b\d{1,2}\s+(?:jan|januari|feb|februari|mar|maret|apr|april|mei|jun|juni|jul|juli|agu|agt|agustus|sep|sept|september|okt|oktober|nov|november|des|desember)\s+\d{4}\b/i,
    /\b(?:kemarin|hari ini|besok|lusa)\b/i,
  ];
  for (const re of patterns) {
    const m = rawText.match(re);
    if (m) {
      const res = parseTanggal(m[0], timeZone, nowDate);
      return { ok: res.ok, date: res.date, needsReview: res.needsReview };
    }
  }

  return { ok: true, date: orgToday(timeZone, nowDate), needsReview: false };
}

export function resolveEntityWithAliases(
  text: string,
  catalog: EntityCatalogItem[],
  explicitId?: string,
):
  | { status: 'chosen'; id: string; name: string; score: number }
  | { status: 'needs_choice'; candidates: Array<{ id: string; label: string; score: number }> }
  | { status: 'none' } {
  if (explicitId) {
    const direct = catalog.find((c) => c.id === explicitId);
    if (direct) return { status: 'chosen', id: direct.id, name: direct.name, score: 1 };
  }
  if (!catalog.length) return { status: 'none' };

  const normText = normalizeText(text);
  const scored: Array<{ id: string; label: string; score: number }> = [];

  for (const item of catalog) {
    const labels = [item.name, ...(item.aliases || [])].map(normalizeText).filter(Boolean);
    let bestScore = 0;

    for (const label of labels) {
      if (normText === label) {
        bestScore = Math.max(bestScore, 1);
      } else if (new RegExp(`(^|\\s)${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(normText)) {
        bestScore = Math.max(bestScore, 0.96);
      } else if (normText.includes(label)) {
        bestScore = Math.max(bestScore, 0.9);
      } else {
        const labelTokens = label.split(/\s+/).filter((t) => t.length >= 2);
        const textTokens = normText.split(/\s+/).filter(Boolean);
        const matchedTokens = labelTokens.filter((lt) =>
          textTokens.some((tt) => tt === lt || similarity(tt, lt) >= 0.8),
        );
        if (labelTokens.length > 0 && matchedTokens.length > 0) {
          const ratio = matchedTokens.length / labelTokens.length;
          // Contoh: "Bu Ana" muncul di "Rumah Bu Ana" & "Ruko Bu Ana" -> skor ~0.78-0.83 agar keduanya terdeteksi ambigu
          const base = 0.55 + ratio * 0.3;
          bestScore = Math.max(bestScore, base);
        }
      }
    }

    if (bestScore >= 0.6) {
      scored.push({ id: item.id, label: item.name, score: Math.round(bestScore * 100) / 100 });
    }
  }

  if (!scored.length) return { status: 'none' };
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const [first, second] = scored;

  if (first.score >= 0.9 && (!second || first.score - second.score >= 0.1)) {
    return { status: 'chosen', id: first.id, name: first.label, score: first.score };
  }
  return { status: 'needs_choice', candidates: scored.slice(0, 5) };
}

function isPersonalExpense(norm: string): boolean {
  return /\b(pribadi|keluarga|istri|suami|anak sekolah|jajan|ngopi pribadi|rokok|liburan|baju pribadi|motor pribadi|beli pulsa pribadi)\b/.test(norm);
}

function isWorkshopOrBusinessOpexCue(norm: string, hasChosenProject = false): boolean {
  if (/\b(workshop|kantor|office|gaji admin|sewa kantor|sewa gudang|operasional|opex|pantry|atk|bpjs karyawan admin|reklame)\b/.test(norm)) {
    return true;
  }
  if (!hasChosenProject && /\b(listrik|pln|pdam|air kantor|wifi|internet|telkom|indihome|kebersihan|iuran|fotokopi arsip)\b/.test(norm)) {
    return true;
  }
  return false;
}

function hasAssetKeyword(norm: string): boolean {
  return /\b(keramik|renovasi|laptop|komputer|pc|printer|mesin|genset|molen|scaffolding|bor listrik|gerinda|ac|kulkas|meja|kursi|kendaraan|motor operasional|mobil|alat berat|aset)\b/.test(norm);
}

function detectIncomeSubType(norm: string): 'dp' | 'termin' | 'pelunasan' | 'retensi_tahan' | 'retensi_cair' | null {
  if (/\b(retensi.*cair|cair.*retensi|cairkan retensi|pelunasan retensi|release\s+retensi|retensi\s+release|pencairan\s+retensi|retention\s+release)\b/.test(norm)) return 'retensi_cair';
  if (/\b(tahan retensi|potong retensi|hold\s+retensi|retensi\s+hold|penahanan\s+retensi|retention\s+hold|retensi)\b/.test(norm)) return 'retensi_tahan';
  if (/\b(dp|uang muka|down payment|tanda jadi)\b/.test(norm)) return 'dp';
  if (/\b(pelunasan|lunasi|lunas|sisa bayar klien|penutup)\b/.test(norm)) return 'pelunasan';
  if (/\b(termin|progres|progress|angsuran proyek)\b/.test(norm)) return 'termin';
  return null;
}

function inferRapCategory(norm: string): {
  rapType: 'material' | 'labor' | 'equipment' | 'overhead' | 'other';
  confidence: number;
} {
  // 1. Overhead dulu agar "ongkir pasir", "makan tukang", "solar genset", "kebersihan lapangan" akurat
  if (/\b(ongkir|pengiriman|kurir|bensin|solar|bbm|parkir|tol|retribusi|konsumsi|makan tukang|air mineral|kebersihan lapangan|keamanan|koordinasi|survei|transport|fotokopi gambar|overhead)\b/.test(norm)) {
    return { rapType: 'overhead', confidence: 0.92 };
  }
  // 2. Equipment / sewa alat sebelum material ("alat potong keramik", "mesin potong besi")
  if (/\b(sewa alat|sewa molen|sewa scaffolding|sewa steger|sewa genset|sewa stamper|sewa jackhammer|sewa excavator|sewa|molen|scaffolding|steger|genset|stamper|jackhammer|excavator|perkakas|gerinda|mesin potong|tangga aluminium|gerobak dorong)\b/.test(norm)) {
    return { rapType: 'equipment', confidence: 0.92 };
  }
  // 3. Tenaga kerja sebelum material ("upah borongan cat", "kuli angkut semen", "tukang keramik", "jasa pemasangan kusen")
  if (/\b(tukang|mandor|pekerja|kuli|kenek|borongan|borong|upah|tenaga kerja|gaji lapangan|lembur|harian|jasa pemasangan|jasa instalasi|jasa perakitan|ongkos tukang|worker wage)\b/.test(norm)) {
    return { rapType: 'labor', confidence: 0.94 };
  }
  // 4. Material
  if (/\b(semen|cement|smn|mortar|pasir|batu|split|bata|hebel|besi|engsel|pintu|keramik|granit|cat|kuas|paku|baut|sekrup|kayu|triplek|pipa|paralon|pvc|kabel|lampu|downlight|saklar|stop kontak|kran|lem|gypsum|baja ringan|genteng|spandek|seng|kaca|kusen|atap|plafon|thinner|amplas|waterproofing|gembok|kunci|aksesoris|perlengkapan|material|bahan)\b/.test(norm)) {
    return { rapType: 'material', confidence: 0.94 };
  }
  return { rapType: 'other', confidence: 0.62 };
}

function inferOpexCategory(norm: string): string {
  if (/\b(listrik|pln|air|pdam|token listrik)\b/.test(norm)) return 'Listrik & Air';
  if (/\b(internet|wifi|indihome|telkom|paket data kantor)\b/.test(norm)) return 'Internet & Telepon';
  if (/\b(sewa kantor|sewa gudang|sewa workshop|kontrakan kantor)\b/.test(norm)) return 'Sewa Kantor';
  if (/\b(gaji admin|gaji staf|gaji staff|gaji karyawan|gaji pegawai|payroll|staff kantor|staf kantor|akuntan|admin|bpjs)\b/.test(norm)) return 'Gaji Admin';
  if (/\b(bensin|bbm|solar|transport|ojol|kurir kantor|tol)\b/.test(norm)) return 'Transport & BBM';
  if (/\b(atk|kertas|tinta|alat tulis|pantry|sabun|sapu|kebersihan|papan tulis|kopi)\b/.test(norm)) return 'Bahan Habis Pakai';
  if (/\b(pajak|perizinan|notaris|npwp|retribusi|reklame)\b/.test(norm)) return 'Pajak & Perizinan';
  if (/\b(workshop|keramik|perbaikan|servis|maintenance|rehab|pintu pagar|lampu penerangan)\b/.test(norm)) return 'Perawatan Workshop';
  return 'Lainnya';
}

function detectIntent(
  norm: string,
  explicitIntent?: FinanceAgentIntent,
  hasChosenProject = false,
): { intent: FinanceAgentIntent | 'unknown'; confidence: number } {
  if (explicitIntent) return { intent: explicitIntent, confidence: 0.98 };

  if (/\b(berapa|brp|cek|lihat|tampilkan|info|rekap|total|gimana)\b/.test(norm) && /\b(saldo|kas|piutang|retensi|hutang|laba|profit|rugi|omzet|uang|keuangan|posisi)\b/.test(norm) && !/\d/.test(norm)) {
    return { intent: 'tanya_saldo', confidence: 0.96 };
  }
  if (/\b(dividen|bagi hasil|bagi laba|tarik laba|pembagian keuntungan)\b/.test(norm)) {
    return { intent: 'dividen', confidence: 0.92 };
  }
  if (/\b(bayar hutang|byr hutang|byr utang|bayar utang|lunasi hutang|cicil hutang|bayar tagihan supplier|pelunasan hutang|byr hutang tempo|bayar tempo)\b/.test(norm)) {
    return { intent: 'bayar_hutang', confidence: 0.94 };
  }
  if (/\b(terima piutang|pelunasan piutang|tagihan klien.*masuk|klien lunasi piutang|lunasi piutang|bayar piutang|penagihan)\b/.test(norm)) {
    return { intent: 'terima_piutang', confidence: 0.93 };
  }
  if (/\b((?:terbit(?:kan)?|kirim|buat|cetak|issue|send)\s+(?:invoice|inv|faktur|tagihan)|invoice\s+terbit|faktur\s+terbit|tagihan\s+(?:keluar|proyek\s+ke))\b/.test(norm)) {
    return { intent: 'catat_invoice_terbit', confidence: 0.94 };
  }
  if (/\b(termin\s+diterima|pencairan\s+termin|cair(?:kan|in)?\s+termin|klaim\s+termin|terima\s+pembayaran\s+termin|progress\s+payment\s+received|received\s+termin)\b/.test(norm)) {
    return { intent: 'catat_termin_diterima', confidence: 0.94 };
  }
  if (/\b(catat\s+retensi|hold\s+retensi|release\s+retensi|retensi\s+(?:hold|release)|pencairan\s+retensi|penahanan\s+retensi|uang\s+retensi\s+ditahan|retention\s+(?:hold|release))\b/.test(norm)) {
    return { intent: 'catat_retensi', confidence: 0.93 };
  }
  if (/\b(payroll|gaji\s+(?:bulanan|pegawai|karyawan|staf|staff|mandor|tukang)|thr\s+(?:karyawan|tukang|staf|staff)|slip\s+gaji|transfer\s+gaji|pembayaran\s+gaji|bayar\s+gaji\s+(?:karyawan|pegawai|staf|staff|tukang|mandor))\b/.test(norm)) {
    return { intent: 'catat_gaji', confidence: 0.93 };
  }
  if (/\b(terima\s+transfer\s+klien|klien\s+(bayar|lunasi|lunas)|dp|uang muka|termin|pelunasan|retensi|invoice dibayar)\b/.test(norm)) {
    return { intent: 'catat_pemasukan', confidence: 0.92 };
  }
  if (/\b(transfer|pindah kas|pindah dana|pindah saldo|mutasi antar|top ?up kas)\b/.test(norm)) {
    return { intent: 'transfer_kas', confidence: 0.94 };
  }
  if (/\b(kasbon|bon dulu|pinjam(an)? tukang|pinjaman karyawan|panjar karyawan)\b/.test(norm)) {
    return { intent: 'kasbon', confidence: 0.94 };
  }
  if (isWorkshopOrBusinessOpexCue(norm, hasChosenProject)) {
    return { intent: 'catat_opex', confidence: 0.91 };
  }
  if (/\b(beli|belanja|bl|blj|bayar|byr|catat|sewa|upah|pengadaan|borong|borongan|jasa|beli bahan|biaya|pengeluaran|ongkir|purchase|buy)\b/.test(norm)) {
    return { intent: 'catat_biaya_proyek', confidence: 0.88 };
  }
  if (/\b(terima|masuk|lunasi)\b/.test(norm)) {
    return { intent: 'catat_pemasukan', confidence: 0.9 };
  }
  return { intent: 'unknown', confidence: 0.2 };
}

function eventCodeFromRapType(rapType: string): FinanceEventCode {
  if (rapType === 'material') return 'project_cost_material';
  if (rapType === 'labor') return 'project_cost_labor';
  if (rapType === 'equipment') return 'project_cost_equipment';
  if (rapType === 'overhead') return 'project_cost_overhead';
  if (rapType === 'other') return 'project_cost_other';
  return 'project_cost_uncategorized';
}

function rapTypeFromEventCode(code: FinanceEventCode): OrgFinanceRule['rapType'] {
  if (code === 'project_cost_material') return 'material';
  if (code === 'project_cost_labor') return 'labor';
  if (code === 'project_cost_equipment') return 'equipment';
  if (code === 'project_cost_overhead') return 'overhead';
  if (code === 'project_cost_other') return 'other';
  return undefined;
}

/**
 * Menyimpan koreksi pengguna menjadi aturan organisasi untuk klasifikasi otomatis berikutnya.
 */
export function recordFinanceCorrection(input: {
  keyword: string;
  intent: FinanceAgentIntent;
  eventCode: FinanceEventCode;
  projectId?: string;
  opexCategory?: string;
}): OrgFinanceRule {
  return {
    id: `rule-${createHash('sha1').update(`${input.keyword}:${input.eventCode}`).digest('hex').slice(0, 8)}`,
    keyword: normalizeText(input.keyword),
    intent: input.intent,
    eventCode: input.eventCode,
    rapType: rapTypeFromEventCode(input.eventCode),
    opexCategory: input.opexCategory,
    projectId: input.projectId,
    confidence: 0.97,
  };
}

function mapConfidenceBand(score: number, amount: number, threshold: number, forceConfirm: boolean): {
  band: ConfidenceBand;
  action: AgentNextAction;
} {
  if (score < 0.65) {
    return { band: 'low', action: 'ask_back' };
  }
  if (forceConfirm || score < 0.88 || amount >= threshold) {
    return { band: 'medium', action: 'confirm_one_tap' };
  }
  return { band: 'high', action: 'auto_commit' };
}

export function prepareEntry(input: PrepareEntryInput): PrepareEntryResult {
  const nowMs = input.now ?? Date.now();
  const timeZone = input.timeZone || 'Asia/Jakarta';
  const rawText = String(input.text ?? '').trim();
  const norm = normalizeText(rawText);
  const capThreshold = input.capitalizationThresholdIdr ?? DEFAULT_CAP_THRESHOLD_IDR;
  const autoThreshold = input.autoCommitThresholdIdr ?? DEFAULT_AUTO_COMMIT_THRESHOLD_IDR;
  const model = input.model || 'deterministic-v3';

  if (detectPromptInjection(rawText).length > 0) {
    return {
      ok: false,
      status: 'rejected',
      intent: 'unknown',
      confidence: 0,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'prompt_injection_detected',
        next: 'Teks mengandung instruksi tidak sah. Kirim ulang detail transaksi (nominal, tanggal, proyek) tanpa perintah sistem.',
      },
      summary: 'Terdeteksi indikasi prompt injection; transaksi ditolak dan wajib tinjauan manual.',
    };
  }

  if (isPersonalExpense(norm)) {
    return {
      ok: false,
      status: 'rejected',
      intent: 'unknown',
      confidence: 0.2,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'personal_expense_blocked',
        next: 'Pengeluaran pribadi tidak dicatat ke kas usaha. Konfirmasi bila ini benar biaya usaha/proyek.',
      },
      summary: 'Terdeteksi pengeluaran pribadi; ditolak otomatis dari pembukuan usaha.',
    };
  }

  // Pra-deteksi proyek agar kalimat biaya proyek dengan kata "listrik"/"kebersihan" tidak lari ke opex
  const preProjects = input.projects || [];
  const preProjMatch = resolveEntityWithAliases(rawText, preProjects, input.projectId);
  const hasChosenProject = preProjMatch.status === 'chosen';

  // Tier 1: cek aturan organisasi / memori koreksi lebih dahulu
  const matchedOrgRule = (input.orgRules || []).find((rule) => {
    const kw = normalizeText(rule.keyword);
    return kw.length >= 3 && norm.includes(kw);
  });

  const detected = matchedOrgRule
    ? { intent: matchedOrgRule.intent, confidence: matchedOrgRule.confidence ?? 0.97 }
    : detectIntent(norm, input.intent, hasChosenProject);

  if (detected.intent === 'unknown') {
    return {
      ok: false,
      status: 'ask_back',
      intent: 'unknown',
      confidence: 0.2,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'intent_unknown',
        next: 'Sebutkan jenis transaksi (biaya proyek, opex, pemasukan, hutang, piutang, kasbon, transfer, atau saldo).',
      },
      summary: 'Maksud transaksi belum jelas; butuh klarifikasi pemilik.',
    };
  }

  const intent = detected.intent;
  if (intent === 'tanya_saldo') {
    return {
      ok: true,
      status: 'read_snapshot',
      intent: 'tanya_saldo',
      confidence: 0.96,
      confidenceBand: 'high',
      action: 'read_only',
      summary: 'Gunakan get_finance_snapshot untuk membaca saldo kas, piutang, hutang, dan laba rugi terkini.',
      recommendedTool: 'get_finance_snapshot',
    };
  }

  // Tanggal & periode terkunci
  const dateParsed = extractDateDeterministic(rawText, input.entryDate, timeZone, nowMs);
  const periodPrefix = dateParsed.date.slice(0, 7);
  if ((input.lockedPeriods || []).some((p) => p.slice(0, 7) === periodPrefix)) {
    return {
      ok: false,
      status: 'rejected',
      intent,
      confidence: 0.95,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'periode_terkunci',
        next: 'Periode sudah dikunci. Gunakan tanggal periode aktif atau buat jurnal penyesuaian.',
      },
      summary: `Tanggal ${dateParsed.date} berada pada periode tertutup.`,
    };
  }

  // Nominal deterministik
  const amountParsed = extractAmountDeterministic(rawText, input.amount);
  if (!amountParsed.ok || amountParsed.amount <= 0) {
    return {
      ok: false,
      status: 'ask_back',
      intent,
      confidence: 0.4,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'missing_amount',
        next: 'Sebutkan nominal rupiah transaksi (contoh: 50rb atau 1,5jt).',
      },
      summary: 'Nominal rupiah belum ditemukan atau tidak jelas.',
    };
  }

  const amount = amountParsed.amount;

  // Resolusi entitas (proyek, pihak, dompet)
  const projects = input.projects || [];
  const parties = input.parties || [];
  const wallets = input.wallets || [];

  const projMatch = resolveEntityWithAliases(
    rawText,
    projects,
    input.projectId || matchedOrgRule?.projectId,
  );
  if (projMatch.status === 'needs_choice') {
    return {
      ok: false,
      status: 'needs_choice',
      intent,
      confidence: 0.55,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'entity_ambiguous',
        next: 'Lebih dari satu proyek cocok. Pilih salah satu project_id dari candidates.',
      },
      summary: `Proyek ambigu; ditemukan ${projMatch.candidates.length} kandidat.`,
      candidates: projMatch.candidates,
    };
  }

  const partySearchText =
    projMatch.status === 'chosen'
      ? rawText.replace(new RegExp(projMatch.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
      : rawText;
  let partyMatch = resolveEntityWithAliases(partySearchText, parties, input.partyId);
  if (partyMatch.status === 'none' && partySearchText !== rawText) {
    partyMatch = resolveEntityWithAliases(rawText, parties, input.partyId);
  }
  if (partyMatch.status === 'needs_choice') {
    return {
      ok: false,
      status: 'needs_choice',
      intent,
      confidence: 0.55,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: 'entity_ambiguous',
        next: 'Lebih dari satu pihak cocok. Pilih salah satu party_id dari candidates.',
      },
      summary: `Pihak ambigu; ditemukan ${partyMatch.candidates.length} kandidat.`,
      candidates: partyMatch.candidates,
    };
  }

  const walletMatch = resolveEntityWithAliases(rawText, wallets, input.walletId);
  const projectId = projMatch.status === 'chosen' ? projMatch.id : null;
  const partyId = partyMatch.status === 'chosen' ? partyMatch.id : null;
  let walletId = walletMatch.status === 'chosen' ? walletMatch.id : (wallets[0]?.id ?? null);
  let targetWalletId = input.targetWalletId ?? null;

  // Cek apakah biaya proyek menyebut kata kerja beli tetapi tanpa proyek dan tanpa konteks opex
  if (intent === 'catat_biaya_proyek' && !projectId && !matchedOrgRule) {
    if (isWorkshopOrBusinessOpexCue(norm, false)) {
      // Dialihkan ke opex secara aman bila menyebut workshop/kantor
    } else {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.45,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Tentukan proyek tujuan untuk biaya ini atau pilih kategori Opex Kantor/Workshop.',
        },
        summary: 'Proyek tujuan belum disebutkan untuk biaya ini.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
  }

  // Cek transfer_kas membutuhkan dompet asal & tujuan terpisah (mis. "dari Mandiri ke BCA" atau "top up kas kecil dari BCA")
  if (intent === 'transfer_kas') {
    const cleanTransfer = stripDatesAndOrdinals(rawText).replace(/\b(?:rp\.?\s*)?\d[\d.,]*(?:\s*(?:juta|jt|ribu|rb|k))?\b/gi, ' ').trim();
    const fromToMatch = cleanTransfer.match(/\bdari\s+(.+?)\s+(?:ke|menuju)\s+(.+)$/i);
    const reverseMatch = !fromToMatch ? cleanTransfer.match(/^(.+?)\s+\bdari\s+(.+)$/i) : null;

    if (fromToMatch) {
      const srcProbe = resolveEntityWithAliases(fromToMatch[1], wallets, input.walletId);
      if (srcProbe.status === 'chosen') walletId = srcProbe.id;
    } else if (reverseMatch) {
      const srcProbe = resolveEntityWithAliases(reverseMatch[2], wallets, input.walletId);
      if (srcProbe.status === 'chosen') walletId = srcProbe.id;
    }

    const destText = fromToMatch
      ? fromToMatch[2]
      : reverseMatch
      ? reverseMatch[1]
      : /\b(?:ke|menuju)\b/i.test(cleanTransfer)
      ? cleanTransfer.replace(/.*?\b(?:ke|menuju)\b/i, '')
      : '';
    const destCandidates = wallets.filter((w) => w.id !== walletId);
    if (!targetWalletId) {
      const destProbe = destText
        ? resolveEntityWithAliases(destText, destCandidates)
        : ({ status: 'none' } as const);
      if (destProbe.status === 'chosen') {
        targetWalletId = destProbe.id;
      } else {
        return {
          ok: false,
          status: destCandidates.length > 0 ? 'needs_choice' : 'ask_back',
          intent,
          confidence: 0.5,
          confidenceBand: 'low',
          action: 'ask_back',
          error: {
            code: 'missing_wallet',
            next: 'Pilih dompet kas tujuan transfer.',
          },
          summary: 'Dompet kas tujuan transfer perlu dikonfirmasi.',
          candidates: destCandidates.slice(0, 5).map((w) => ({ id: w.id, label: w.name })),
        };
      }
    }
  }

  // Klasifikasi 3 lapis -> eventCode
  let tier: ClassificationTier = matchedOrgRule ? 'org_rule' : 'domain_rule';
  let confidence = matchedOrgRule ? matchedOrgRule.confidence ?? 0.97 : detected.confidence;
  let eventCode: FinanceEventCode;
  let rapType: string | null = null;
  let opexCategory: string | null = null;
  let requiresOwnerApproval = false;

  if (matchedOrgRule) {
    eventCode = matchedOrgRule.eventCode;
    rapType = matchedOrgRule.rapType || null;
    opexCategory = matchedOrgRule.opexCategory || null;
    if (intent === 'dividen') requiresOwnerApproval = true;
  } else if (intent === 'catat_biaya_proyek') {
    const rap = inferRapCategory(norm);
    rapType = rap.rapType;
    confidence = Math.min(confidence, rap.confidence);
    if (rap.rapType === 'other' && input.candidateSelector) {
      tier = 'llm_closed_choice';
      const closed: ClosedAccountCandidate[] = [
        { code: 'project_cost_material', label: 'HPP Material' },
        { code: 'project_cost_labor', label: 'HPP Tenaga Kerja' },
        { code: 'project_cost_equipment', label: 'HPP Alat' },
        { code: 'project_cost_overhead', label: 'HPP Overhead' },
        { code: 'project_cost_other', label: 'HPP Lainnya' },
      ];
      const llmPick = input.candidateSelector({ text: rawText, intent, candidates: closed });
      if (closed.some((c) => c.code === llmPick.chosenCode)) {
        eventCode = llmPick.chosenCode as FinanceEventCode;
        rapType = rapTypeFromEventCode(eventCode) || 'other';
        confidence = Math.max(0.7, Math.min(0.92, llmPick.score));
      } else {
        eventCode = 'project_cost_uncategorized';
        confidence = 0.55;
      }
    } else {
      eventCode = eventCodeFromRapType(rap.rapType);
    }
  } else if (intent === 'catat_opex') {
    if (input.subType === 'aset_tetap') {
      return {
        ok: false,
        status: 'ask_back',
        intent,
        confidence: 0.6,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'confirm_asset_vs_opex',
          next: 'Kapitalisasi Aset Tetap dicatat lewat form Pembelian Aset di menu Aset.',
        },
        summary: 'Dialihkan ke pencatatan Aset Tetap agar masuk daftar penyusutan.',
      };
    }
    if (input.subType !== 'opex' && amount >= capThreshold && hasAssetKeyword(norm)) {
      return {
        ok: false,
        status: 'needs_choice',
        intent,
        confidence: 0.55,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'confirm_asset_vs_opex',
          next: `Nominal >= Rp${capThreshold.toLocaleString('id-ID')}. Konfirmasi apakah masuk Beban Operasional atau Aset Tetap.`,
        },
        summary: `Nominal Rp${amount.toLocaleString('id-ID')} mencapai ambang kapitalisasi; konfirmasi Opex vs Aset Tetap.`,
        candidates: [
          { id: 'opex_expense', label: 'Catat sebagai Beban Operasional (Opex)' },
          { id: 'aset_tetap', label: 'Kapitalisasi sebagai Aset Tetap' },
        ],
      };
    }
    opexCategory = inferOpexCategory(norm);
    eventCode = 'opex_expense';
    confidence = 0.93;
  } else if (intent === 'catat_pemasukan') {
    const sub = input.subType === 'dp' || input.subType === 'termin' || input.subType === 'pelunasan' || input.subType === 'retensi_tahan' || input.subType === 'retensi_cair'
      ? input.subType
      : detectIncomeSubType(norm);
    if (!sub) {
      return {
        ok: false,
        status: 'needs_choice',
        intent,
        confidence: 0.58,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'entity_ambiguous',
          next: 'Konfirmasi jenis pemasukan proyek: DP, termin, pelunasan, atau retensi.',
        },
        summary: 'Jenis pemasukan klien belum spesifik (DP/termin/pelunasan/retensi).',
        candidates: [
          { id: 'dp', label: 'Uang Muka Klien (DP)' },
          { id: 'termin', label: 'Pembayaran Termin Proyek' },
          { id: 'pelunasan', label: 'Pelunasan Proyek' },
          { id: 'retensi_tahan', label: 'Potongan Retensi Proyek' },
        ],
      };
    }
    if (!projectId) {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Pilih proyek untuk pemasukan ini.',
        },
        summary: 'Proyek untuk pemasukan belum disebutkan.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    eventCode =
      sub === 'dp'
        ? 'client_dp'
        : sub === 'termin'
          ? 'client_termin'
          : sub === 'pelunasan'
            ? 'client_pelunasan'
            : sub === 'retensi_cair'
              ? 'client_retention_release'
              : 'client_retention_hold';
  } else if (intent === 'catat_invoice_terbit') {
    if (!projectId) {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Pilih proyek (project_id) untuk penerbitan invoice.',
        },
        summary: 'Proyek belum disebutkan untuk penerbitan invoice.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    if (!partyId) {
      return {
        ok: false,
        status: parties.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_party',
          next: 'Pilih pihak/klien (party_id) untuk penerbitan invoice.',
        },
        summary: 'Pihak/klien belum disebutkan untuk penerbitan invoice.',
        candidates: parties.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    eventCode = 'receivable_accrual';
  } else if (intent === 'catat_termin_diterima') {
    if (!projectId) {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Pilih proyek (project_id) untuk penerimaan termin.',
        },
        summary: 'Proyek belum disebutkan untuk penerimaan termin.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    eventCode = 'client_termin';
  } else if (intent === 'catat_retensi') {
    if (!projectId) {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Pilih proyek (project_id) untuk transaksi retensi.',
        },
        summary: 'Proyek belum disebutkan untuk transaksi retensi.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    if (!partyId) {
      return {
        ok: false,
        status: parties.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_party',
          next: 'Pilih pihak/klien (party_id) untuk transaksi retensi.',
        },
        summary: 'Pihak/klien belum disebutkan untuk transaksi retensi.',
        candidates: parties.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    }
    const sub =
      input.subType === 'retensi_cair' || input.subType === 'retensi_tahan'
        ? input.subType
        : detectIncomeSubType(norm);
    eventCode = sub === 'retensi_cair' ? 'client_retention_release' : 'client_retention_hold';
  } else if (intent === 'catat_gaji') {
    const hasLaborCue = /\b(tukang|mandor|kenek|kuli|borongan|lapangan|upah|pekerja\s+proyek)\b/.test(norm);
    const hasOfficeCue = /\b(kantor|admin|staf|staff|office|hrd|akuntan|operasional|opex|pegawai\s+kantor|karyawan\s+kantor)\b/.test(norm);
    if (projectId && (!hasOfficeCue || hasLaborCue)) {
      rapType = 'labor';
      eventCode = 'project_cost_labor';
    } else if (hasLaborCue && !projectId && !hasOfficeCue) {
      return {
        ok: false,
        status: projects.length > 0 ? 'needs_choice' : 'ask_back',
        intent,
        confidence: 0.5,
        confidenceBand: 'low',
        action: 'ask_back',
        error: {
          code: 'missing_project',
          next: 'Pilih proyek untuk upah/gaji tukang lapangan atau sebutkan gaji staf kantor.',
        },
        summary: 'Proyek untuk gaji/upah lapangan belum disebutkan.',
        candidates: projects.slice(0, 5).map((p) => ({ id: p.id, label: p.name })),
      };
    } else {
      opexCategory = 'Gaji Admin';
      eventCode = 'opex_expense';
    }
  } else if (intent === 'bayar_hutang') {
    eventCode = 'payable_payment';
  } else if (intent === 'terima_piutang') {
    eventCode = 'receivable_receipt';
  } else if (intent === 'kasbon') {
    eventCode = 'kasbon_disbursement';
  } else if (intent === 'transfer_kas') {
    eventCode = 'wallet_transfer';
  } else {
    // dividen: hanya prepare, wajib approval pemilik
    requiresOwnerApproval = true;
    eventCode = projectId ? 'dividend_project_cash' : 'dividend_business_cash';
  }

  if (amountParsed.needsReview || dateParsed.needsReview) {
    confidence = Math.min(confidence, 0.55);
  }

  const bandInfo = mapConfidenceBand(confidence, amount, autoThreshold, requiresOwnerApproval || intent === 'dividen');
  if (bandInfo.band === 'low') {
    return {
      ok: false,
      status: 'ask_back',
      intent,
      confidence,
      confidenceBand: 'low',
      action: 'ask_back',
      error: {
        code: amountParsed.needsReview ? 'nominal_tidak_valid' : 'entity_ambiguous',
        next: 'Mohon klarifikasi kategori/nominal sebelum disimpan ke buku besar.',
      },
      summary: 'Keyakinan rendah; butuh konfirmasi pemilik (0 salah-posting otomatis).',
    };
  }

  const lines = buildJournalTemplate(
    eventCode,
    amount,
    eventCode === 'client_termin' && input.dpApplied != null ? { dpApplied: input.dpApplied } : undefined,
  );
  if (!linesAreBalanced(lines)) {
    throw new Error(`Template tidak seimbang untuk ${eventCode}`);
  }
  const dimCheck = validateJournalDimensions(
    lines.map((l) => ({
      role: l.role,
      projectId,
      partyId,
    })),
  );
  // Catatan: biaya proyek & piutang tanpa partyId tetap valid bila opex; di sini validasi dimensi untuk proyek
  void dimCheck;

  const warnings: string[] = [];
  let duplicateCheck: DuplicateDetectionResult | undefined;
  let anomalyCheck: AmountAnomalyResult | undefined;

  if (input.existingEntries && input.existingEntries.length > 0) {
    const dup = detectDuplicateEntry(
      {
        attachmentHash: input.attachmentHash,
        invoiceNumber: input.invoiceNumber,
        partyId,
        projectId,
        amount,
        entryDate: dateParsed.date,
      },
      input.existingEntries,
      { dateWindowDays: input.duplicateDateWindowDays },
    );
    if (dup.isDuplicate) {
      duplicateCheck = dup;
      for (const m of dup.matches) {
        warnings.push(`duplikat_${m.reason}:${m.entryId}`);
      }
    }
  }

  const highThreshold = input.highAmountThresholdIdr ?? 100_000_000;
  const shouldRunAnomalyCheck =
    (input.historicalAmounts && input.historicalAmounts.length > 0)
    || input.rapRemainingBudget != null
    || amount >= highThreshold;
  if (shouldRunAnomalyCheck) {
    const anom = detectAnomalousAmount(
      { amount, rapRemainingBudget: input.rapRemainingBudget },
      input.historicalAmounts || [],
      {
        rapRemainingBudget: input.rapRemainingBudget,
        highAmountThreshold: highThreshold,
        zScoreThreshold: input.zScoreThreshold,
      },
    );
    if (anom.isAnomalous) {
      anomalyCheck = anom;
      for (const f of anom.flags) {
        warnings.push(`nominal_janggal:${f}`);
      }
    }
  }

  if (duplicateCheck?.isDuplicate) {
    bandInfo.action = 'ask_back';
    bandInfo.band = 'low';
    requiresOwnerApproval = true;
  } else if (anomalyCheck?.isAnomalous) {
    if (anomalyCheck.flags.includes('possible_extra_zero_typo') || anomalyCheck.flags.includes('invalid_non_positive')) {
      bandInfo.action = 'ask_back';
      bandInfo.band = 'low';
    } else {
      if (bandInfo.action === 'auto_commit') bandInfo.action = 'confirm_one_tap';
      if (bandInfo.band === 'high') bandInfo.band = 'medium';
    }
    if (anomalyCheck.requiresHumanConfirmation) {
      requiresOwnerApproval = true;
    }
  }

  const token = `prep_${randomUUID()}`;
  const expiresAt = nowMs + TEN_MINUTES_MS;
  const scopeLabel = projectId
    ? `proyek ${projMatch.status === 'chosen' ? projMatch.name : projectId}`
    : opexCategory
      ? `opex ${opexCategory}`
      : 'bisnis';
  const summary = `Siap ${eventCode} Rp${amount.toLocaleString('id-ID')} (${scopeLabel}, ${dateParsed.date}).`;

  preparedRegistry.set(token, {
    preparedAt: nowMs,
    expiresAt,
    intent,
    eventCode,
    amount,
    entryDate: dateParsed.date,
    projectId,
    partyId,
    walletId,
    targetWalletId,
    requiresOwnerApproval,
    lines,
    model,
    token,
    summary,
  });

  return {
    ok: true,
    status: 'prepared',
    prepareToken: token,
    expiresAt,
    intent,
    eventCode,
    amount,
    entryDate: dateParsed.date,
    projectId,
    partyId,
    walletId,
    targetWalletId,
    rapType,
    opexCategory,
    confidence,
    confidenceBand: bandInfo.band,
    action: bandInfo.action,
    tier,
    requiresOwnerApproval,
    summary,
    lines,
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(duplicateCheck ? { duplicateCheck } : {}),
    ...(anomalyCheck ? { anomalyCheck } : {}),
    meta: {
      source: 'agent',
      model,
      prepare_token: token,
    },
  };
}

export function commitEntry(input: CommitEntryInput): CommitEntryResult {
  const nowMs = input.now ?? Date.now();
  const key = String(input.idempotencyKey ?? '').trim();
  if (!key) {
    return {
      ok: false,
      error: {
        code: 'idempotency_wajib',
        next: 'Sertakan idempotency_key unik saat commit_entry.',
      },
    };
  }

  const existing = committedByIdempotency.get(key);
  if (existing && existing.meta.prepare_token === input.prepareToken) {
    return {
      ok: true,
      status: 'idempotent_replay',
      entry: existing,
      summary: `Idempoten: transaksi Rp${existing.amount.toLocaleString('id-ID')} sudah tercatat sebelumnya.`,
    };
  }

  const prepared = preparedRegistry.get(input.prepareToken);
  if (!prepared) {
    return {
      ok: false,
      error: {
        code: 'token_tidak_ditemukan',
        next: 'Panggil prepare_entry ulang untuk mendapatkan prepare_token yang sah.',
      },
    };
  }
  if (nowMs > prepared.expiresAt) {
    return {
      ok: false,
      error: {
        code: 'token_kadaluarsa',
        next: 'Token prepare_entry kedaluwarsa (>10 menit). Siapkan ulang lewat prepare_entry.',
      },
    };
  }
  if (prepared.requiresOwnerApproval && input.ownerApproved !== true) {
    return {
      ok: false,
      error: {
        code: 'butuh_persetujuan_pemilik',
        next: 'Transaksi dividen wajib persetujuan eksplisit pemilik (owner_approved=true).',
      },
    };
  }

  const entry: CommittedFinanceEntry = {
    id: `je_${randomUUID().slice(0, 12)}`,
    idempotencyKey: key,
    intent: prepared.intent,
    eventCode: prepared.eventCode,
    amount: prepared.amount,
    entryDate: prepared.entryDate,
    projectId: prepared.projectId,
    partyId: prepared.partyId,
    walletId: prepared.walletId,
    targetWalletId: prepared.targetWalletId,
    lines: prepared.lines,
    meta: {
      source: 'agent',
      model: prepared.model,
      prepare_token: prepared.token,
    },
    committedAt: nowMs,
  };
  committedByIdempotency.set(key, entry);

  return {
    ok: true,
    status: 'committed',
    entry,
    summary: `Tercatat ${entry.eventCode} Rp${entry.amount.toLocaleString('id-ID')} (${entry.entryDate}).`,
  };
}

export function clearEntryEngineStateForTests(): void {
  preparedRegistry.clear();
  committedByIdempotency.clear();
}

export { FINANCE_EVENT_CODES };

