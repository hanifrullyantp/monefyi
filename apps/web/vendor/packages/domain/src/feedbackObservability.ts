import { computeDeterministicSha256 } from './receiptExtraction';

/**
 * Domain Umpan Balik Terpadu, Observabilitas Lintas Aplikasi, Anonimisasi PII,
 * Penggabungan Laporan Otomatis, Kandidat Evaluasi, & Dasbor Mutu (G7).
 *
 * Prinsip keras:
 * 1. Tidak ada PII atau kredensial mentah yang boleh masuk ke antrean umpan balik.
 * 2. Sistem hanya mengumpulkan, menganonimkan, mengelompokkan, dan memprioritaskan laporan;
 *    sistem TIDAK PERNAH mengubah kode atau prompt secara otomatis (`autoModifyCodeOrPromptAllowed: false`).
 * 3. Data perilaku (`behavior_friction`) tunduk penuh pada opt-out organisasi (`behaviorTelemetryOptOut`).
 * 4. Kandidat eval dari jawaban/aksi agent bermasalah selalu berstatus `'pending_human_review'`.
 */

export const FEEDBACK_MODULES = ['keuangan', 'proyek', 'sdm', 'ui', 'agent'] as const;
export type FeedbackModule = (typeof FEEDBACK_MODULES)[number];

export const FEEDBACK_SEVERITIES = ['kritis', 'sedang', 'ringan'] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const FEEDBACK_SIGNAL_CATEGORIES = [
  'user_bug_report',
  'agent_rating',
  'ui_confused',
  'runtime_error',
  'behavior_friction',
  'silent_correction',
  'data_invariant_failure',
  'agent_unanswered_or_tool_fail',
] as const;
export type FeedbackSignalCategory = (typeof FEEDBACK_SIGNAL_CATEGORIES)[number];

export const FEEDBACK_ISSUE_STATUSES = [
  'open',
  'triaged',
  'pr_linked',
  'resolved',
  'wont_fix',
] as const;
export type FeedbackIssueStatus = (typeof FEEDBACK_ISSUE_STATUSES)[number];

export const REDACTION_TAGS = {
  EMAIL: '[REDACTED_EMAIL]',
  PHONE: '[REDACTED_PHONE]',
  NIK: '[REDACTED_NIK]',
  BANK_ACCOUNT: '[REDACTED_BANK_ACCOUNT]',
  SECRET: '[REDACTED_SECRET]',
  PII: '[REDACTED_PII]',
} as const;

const BASE_SEVERITY_WEIGHT: Record<FeedbackSeverity, number> = {
  kritis: 120,
  sedang: 60,
  ringan: 10,
};

const SEVERITY_RANK: Record<FeedbackSeverity, number> = {
  ringan: 1,
  sedang: 2,
  kritis: 3,
};

const DEFAULT_SEVERITY_BY_CATEGORY: Record<FeedbackSignalCategory, FeedbackSeverity> = {
  data_invariant_failure: 'kritis',
  runtime_error: 'sedang',
  agent_unanswered_or_tool_fail: 'sedang',
  user_bug_report: 'sedang',
  silent_correction: 'sedang',
  agent_rating: 'ringan',
  ui_confused: 'ringan',
  behavior_friction: 'ringan',
};

const SENSITIVE_SECRET_KEY_RE =
  /^(?:password|passwd|pwd|passphrase|secret|client_?secret|webhook_?secret|api_?key|x_?api_?key|authorization|auth_?header|cookie|set_?cookie|session_?id|jwt|private_?key|signing_?key|service_?key|anon_?key|(?:access_?|refresh_?|id_?|auth_?|bearer_?|csrf_?|session_?|prepare_?)?token)$/i;
const SENSITIVE_EMAIL_KEY_RE = /^(?:email|e_?mail|user_?email|contact_?email|reporter_?email)$/i;
const SENSITIVE_PHONE_KEY_RE =
  /^(?:phone|phone_?number|mobile|hp|no_?hp|no_?telp|telp|telephone|whatsapp|wa_?number|contact_?phone)$/i;
const SENSITIVE_NIK_KEY_RE = /^(?:nik|no_?nik|ktp|no_?ktp|npwp|identity_?number)$/i;
const SENSITIVE_BANK_KEY_RE =
  /^(?:bank_?account|rekening|no_?rek|no_?rekening|account_?number|virtual_?account|iban)$/i;
const SENSITIVE_GENERAL_PII_KEY_RE =
  /^(?:pii|full_?name|nama_?lengkap|address|alamat|home_?address|birth_?date|tanggal_?lahir|mother_?maiden)$/i;

function classifySensitiveKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (SENSITIVE_SECRET_KEY_RE.test(trimmed)) return REDACTION_TAGS.SECRET;
  if (SENSITIVE_EMAIL_KEY_RE.test(trimmed)) return REDACTION_TAGS.EMAIL;
  if (SENSITIVE_PHONE_KEY_RE.test(trimmed)) return REDACTION_TAGS.PHONE;
  if (SENSITIVE_NIK_KEY_RE.test(trimmed)) return REDACTION_TAGS.NIK;
  if (SENSITIVE_BANK_KEY_RE.test(trimmed)) return REDACTION_TAGS.BANK_ACCOUNT;
  if (SENSITIVE_GENERAL_PII_KEY_RE.test(trimmed)) return REDACTION_TAGS.PII;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('password') ||
    lower.includes('apikey') ||
    lower.includes('api_key') ||
    lower.includes('authorization') ||
    lower.includes('cookie') ||
    lower.includes('secret')
  ) {
    return REDACTION_TAGS.SECRET;
  }
  if (lower.includes('bankaccount') || lower.includes('bank_account') || lower.includes('rekening')) {
    return REDACTION_TAGS.BANK_ACCOUNT;
  }
  if (lower.includes('email')) {
    return REDACTION_TAGS.EMAIL;
  }
  if (lower.includes('phone') || lower.includes('no_hp') || lower.includes('whatsapp')) {
    return REDACTION_TAGS.PHONE;
  }
  return null;
}

/**
 * Menyensor string mentah dari seluruh token/kredensial, email, nomor HP Indonesia,
 * NIK 16 digit, serta nomor rekening bank secara deterministik.
 */
export function anonymizeString(raw: string): string {
  let text = String(raw);

  // 1. Bearer & JWT & API/Service token prefixes terlebih dulu agar tidak terpecah regex angka
  text = text.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, REDACTION_TAGS.SECRET);
  text = text.replace(
    /\beyJ[A-Za-z0-9_-]{6,}(?:\.[A-Za-z0-9_-]{4,}){1,2}\b/g,
    REDACTION_TAGS.SECRET,
  );
  text = text.replace(
    /\b(?:sk-(?:live-|test-|proj-)?[A-Za-z0-9_-]{6,}|sb_[A-Za-z0-9_-]{6,}|ghp_[A-Za-z0-9]{8,}|xox[baprs]-[A-Za-z0-9-]{8,}|AIza[0-9A-Za-z_-]{16,})\b/g,
    REDACTION_TAGS.SECRET,
  );

  // 2. Pasangan kunci=nilai sensitif di dalam URL/header/log string
  text = text.replace(
    /(\b(?:apikey|api_key|api-key|password|passwd|pwd|secret|client_secret|authorization|cookie|set-cookie|access_token|refresh_token|token)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/gi,
    `$1${REDACTION_TAGS.SECRET}`,
  );

  // 3. Alamat email
  text = text.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    REDACTION_TAGS.EMAIL,
  );

  // 4. Nomor HP Indonesia (+62 / 62 / 08...) sebelum regex rekening
  text = text.replace(
    /(?<![0-9a-zA-Z-])(?:\+62|62|0)[\s-]?8[1-9][0-9](?:[\s-]?[0-9]){6,11}(?![0-9a-zA-Z-])/g,
    REDACTION_TAGS.PHONE,
  );

  // 5. NIK 16 digit (atau didahului label NIK/KTP)
  text = text.replace(
    /(\b(?:nik|no\.?\s*nik|ktp|no\.?\s*ktp)\b\s*[:#-]?\s*)\d{16}\b/gi,
    `$1${REDACTION_TAGS.NIK}`,
  );
  text = text.replace(/(?<![0-9a-fA-F-])\b\d{16}\b(?![0-9a-fA-F-])/g, REDACTION_TAGS.NIK);

  // 6. Nomor rekening bank (eksplisit dengan kata kunci bank/rekening maupun 10–15 digit berdiri sendiri)
  text = text.replace(
    /(\b(?:no\.?\s*rek(?:ening)?|rekening|bank[_\s]?account|account[_\s]?(?:no|number)|virtual[_\s]?account|bca|mandiri|bri|bni|bsi|cimb|permata)\b\s*[:#-]?\s*)\d[\d\s-]{6,17}\d/gi,
    `$1${REDACTION_TAGS.BANK_ACCOUNT}`,
  );
  text = text.replace(
    /(?<![0-9a-fA-F-.])\b\d{10,15}\b(?![0-9a-fA-F-.])/g,
    REDACTION_TAGS.BANK_ACCOUNT,
  );

  return text;
}

function anonymizeRecursive(
  value: unknown,
  inheritedTag: string | null,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) {
    return inheritedTag ?? value;
  }

  if (typeof value === 'string') {
    if (inheritedTag) return inheritedTag;
    return anonymizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    if (inheritedTag) return inheritedTag;
    return value;
  }

  if (value instanceof Date) {
    if (inheritedTag) return inheritedTag;
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (value instanceof Error) {
    if (inheritedTag) return inheritedTag;
    return {
      name: anonymizeString(value.name || 'Error'),
      message: anonymizeString(value.message || ''),
      ...(value.stack ? { stack: anonymizeString(value.stack) } : {}),
    };
  }

  if (typeof value !== 'object') {
    return inheritedTag ?? String(value);
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => anonymizeRecursive(item, inheritedTag, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, rawChild] of Object.entries(value as Record<string, unknown>)) {
    const keyTag = classifySensitiveKey(key) ?? inheritedTag;
    if (
      keyTag &&
      (rawChild === null ||
        rawChild === undefined ||
        typeof rawChild === 'string' ||
        typeof rawChild === 'number' ||
        typeof rawChild === 'boolean')
    ) {
      out[key] = keyTag;
    } else {
      out[key] = anonymizeRecursive(rawChild, keyTag, seen);
    }
  }
  return out;
}

/**
 * Menyapu dan menyensor PII, email, HP, NIK, nomor rekening bank, dan token/rahasia
 * secara rekursif sebelum payload masuk ke antrean umpan balik maupun kandidat eval.
 */
export function anonymizeFeedbackPayload<T>(payload: T): T {
  return anonymizeRecursive(payload, null, new WeakSet<object>()) as T;
}

export interface OrgTelemetryConsent {
  behaviorTelemetryOptOut: boolean;
}

export interface FeedbackSignalInput {
  id?: string;
  orgId: string;
  reporterId?: string | null;
  module: FeedbackModule;
  category: FeedbackSignalCategory;
  severity?: FeedbackSeverity;
  title: string;
  errorOrScreenKey?: string;
  context?: Record<string, unknown>;
  appVersion?: string | null;
  deviceInfo?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  notifyReportersOnResolve?: boolean;
  createdAt?: string;
}

export interface FeedbackQueueItem {
  id: string;
  orgId: string;
  reporterHash: string | null;
  module: FeedbackModule;
  category: FeedbackSignalCategory;
  severity: FeedbackSeverity;
  fingerprint: string;
  normalizedErrorOrScreenKey: string;
  title: string;
  anonymizedContextJson: Record<string, unknown>;
  appVersion: string | null;
  deviceInfo: string | null;
  model: string | null;
  promptVersion: string | null;
  status: FeedbackIssueStatus;
  notifyReportersOnResolve: boolean;
  autoModifyCodeOrPromptAllowed: false;
  createdAt: string;
}

export type IngestFeedbackSignalResult =
  | {
      accepted: true;
      reason: null;
      autoModifyCodeOrPromptAllowed: false;
      queueItem: FeedbackQueueItem;
    }
  | {
      accepted: false;
      reason: 'behavior_telemetry_opted_out' | 'invalid_signal';
      autoModifyCodeOrPromptAllowed: false;
      queueItem: null;
    };

export function normalizeErrorOrScreenKey(rawKey: string): string {
  const scrubbed = anonymizeString(rawKey || 'unknown');
  return scrubbed
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:t[\d:.]+z?)?\b/gi, '<date>')
    .replace(/\[redacted_[a-z_]+\]/gi, '<redacted>')
    .replace(/\b\d{3,}\b/g, '<n>')
    .replace(/[^a-z0-9_<>/.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

export function computeFeedbackFingerprint(
  module: FeedbackModule,
  category: FeedbackSignalCategory,
  rawErrorOrScreenKey: string,
): string {
  const normalizedKey = normalizeErrorOrScreenKey(rawErrorOrScreenKey);
  const digest = computeDeterministicSha256(`${module}::${category}::${normalizedKey}`);
  return `fb_${module}_${category}_${digest.slice(0, 16)}`;
}

/**
 * Mengingesti sinyal umpan balik/observabilitas lintas modul dengan:
 * - Penolakan otomatis `behavior_friction` bila `behaviorTelemetryOptOut === true`
 * - Anonimisasi PII menyeluruh sebelum masuk antrean
 * - Pembatasan mutlak `autoModifyCodeOrPromptAllowed: false`
 */
export function ingestFeedbackSignal(
  signal: FeedbackSignalInput,
  orgConsent: OrgTelemetryConsent,
): IngestFeedbackSignalResult {
  if (!signal || !signal.orgId || !signal.module || !signal.category) {
    return {
      accepted: false,
      reason: 'invalid_signal',
      autoModifyCodeOrPromptAllowed: false,
      queueItem: null,
    };
  }

  if (signal.category === 'behavior_friction' && orgConsent?.behaviorTelemetryOptOut === true) {
    return {
      accepted: false,
      reason: 'behavior_telemetry_opted_out',
      autoModifyCodeOrPromptAllowed: false,
      queueItem: null,
    };
  }

  const severity: FeedbackSeverity =
    signal.severity ?? DEFAULT_SEVERITY_BY_CATEGORY[signal.category] ?? 'sedang';
  const createdAt = signal.createdAt ?? new Date().toISOString();

  const rawKey = signal.errorOrScreenKey ?? signal.title ?? signal.category;
  const normalizedErrorOrScreenKey = normalizeErrorOrScreenKey(rawKey);
  const fingerprint = computeFeedbackFingerprint(
    signal.module,
    signal.category,
    normalizedErrorOrScreenKey,
  );

  const sanitizedTitle = anonymizeString(signal.title || signal.category);
  const sanitizedContext = anonymizeFeedbackPayload(signal.context ?? {});
  const sanitizedDeviceInfo =
    signal.deviceInfo != null ? anonymizeString(signal.deviceInfo) : null;
  const sanitizedAppVersion =
    signal.appVersion != null ? anonymizeString(signal.appVersion) : null;
  const sanitizedModel = signal.model != null ? anonymizeString(signal.model) : null;
  const sanitizedPromptVersion =
    signal.promptVersion != null ? anonymizeString(signal.promptVersion) : null;

  const reporterHash = signal.reporterId
    ? computeDeterministicSha256(`${signal.orgId}::${signal.reporterId}`).slice(0, 24)
    : null;

  const eventId =
    signal.id ??
    `fbe_${computeDeterministicSha256(
      `${signal.orgId}::${fingerprint}::${reporterHash ?? 'anon'}::${createdAt}::${sanitizedTitle}`,
    ).slice(0, 20)}`;

  return {
    accepted: true,
    reason: null,
    autoModifyCodeOrPromptAllowed: false,
    queueItem: {
      id: eventId,
      orgId: signal.orgId,
      reporterHash,
      module: signal.module,
      category: signal.category,
      severity,
      fingerprint,
      normalizedErrorOrScreenKey,
      title: sanitizedTitle,
      anonymizedContextJson: sanitizedContext,
      appVersion: sanitizedAppVersion,
      deviceInfo: sanitizedDeviceInfo,
      model: sanitizedModel,
      promptVersion: sanitizedPromptVersion,
      status: 'open',
      notifyReportersOnResolve: Boolean(signal.notifyReportersOnResolve),
      autoModifyCodeOrPromptAllowed: false,
      createdAt,
    },
  };
}

export interface AggregatedFeedbackIssue {
  orgId: string;
  fingerprint: string;
  module: FeedbackModule;
  category: FeedbackSignalCategory;
  severity: FeedbackSeverity;
  title: string;
  normalizedErrorOrScreenKey: string;
  reporterCount: number;
  occurrenceCount: number;
  priorityScore: number;
  status: FeedbackIssueStatus;
  notifyReportersOnResolve: boolean;
  autoModifyCodeOrPromptAllowed: false;
  firstSeenAt: string;
  lastSeenAt: string;
  sampleContexts: Record<string, unknown>[];
}

export function computeIssuePriorityScore(
  severity: FeedbackSeverity,
  reporterCount: number,
): number {
  const safeCount = Math.max(1, Math.floor(Number.isFinite(reporterCount) ? reporterCount : 1));
  return BASE_SEVERITY_WEIGHT[severity] + Math.min(50, safeCount * 5);
}

/**
 * Menggabungkan event antrean umpan balik berdasarkan `(orgId, fingerprint)` menjadi
 * isu terpadu beserta jumlah pelapor unik dan `priorityScore` deterministik.
 */
export function aggregateFeedbackQueue(
  events: readonly FeedbackQueueItem[],
): AggregatedFeedbackIssue[] {
  type Bucket = {
    orgId: string;
    fingerprint: string;
    module: FeedbackModule;
    category: FeedbackSignalCategory;
    severity: FeedbackSeverity;
    title: string;
    normalizedErrorOrScreenKey: string;
    reporters: Set<string>;
    occurrenceCount: number;
    status: FeedbackIssueStatus;
    notifyReportersOnResolve: boolean;
    firstSeenAt: string;
    lastSeenAt: string;
    sampleContexts: Record<string, unknown>[];
  };

  const buckets = new Map<string, Bucket>();

  events.forEach((event, idx) => {
    const key = `${event.orgId}::${event.fingerprint}`;
    const reporterToken = event.reporterHash ?? event.id ?? `anon_occ_${idx}`;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        orgId: event.orgId,
        fingerprint: event.fingerprint,
        module: event.module,
        category: event.category,
        severity: event.severity,
        title: event.title,
        normalizedErrorOrScreenKey: event.normalizedErrorOrScreenKey,
        reporters: new Set([reporterToken]),
        occurrenceCount: 1,
        status: event.status,
        notifyReportersOnResolve: event.notifyReportersOnResolve,
        firstSeenAt: event.createdAt,
        lastSeenAt: event.createdAt,
        sampleContexts: [anonymizeFeedbackPayload(event.anonymizedContextJson ?? {})],
      });
      return;
    }

    existing.reporters.add(reporterToken);
    existing.occurrenceCount += 1;
    if (SEVERITY_RANK[event.severity] > SEVERITY_RANK[existing.severity]) {
      existing.severity = event.severity;
    }
    if (event.notifyReportersOnResolve) {
      existing.notifyReportersOnResolve = true;
    }
    if (event.createdAt < existing.firstSeenAt) {
      existing.firstSeenAt = event.createdAt;
    }
    if (event.createdAt > existing.lastSeenAt) {
      existing.lastSeenAt = event.createdAt;
    }
    if (existing.sampleContexts.length < 5) {
      existing.sampleContexts.push(anonymizeFeedbackPayload(event.anonymizedContextJson ?? {}));
    }
  });

  const issues: AggregatedFeedbackIssue[] = [];
  for (const bucket of buckets.values()) {
    const reporterCount = bucket.reporters.size;
    issues.push({
      orgId: bucket.orgId,
      fingerprint: bucket.fingerprint,
      module: bucket.module,
      category: bucket.category,
      severity: bucket.severity,
      title: bucket.title,
      normalizedErrorOrScreenKey: bucket.normalizedErrorOrScreenKey,
      reporterCount,
      occurrenceCount: bucket.occurrenceCount,
      priorityScore: computeIssuePriorityScore(bucket.severity, reporterCount),
      status: bucket.status,
      notifyReportersOnResolve: bucket.notifyReportersOnResolve,
      autoModifyCodeOrPromptAllowed: false,
      firstSeenAt: bucket.firstSeenAt,
      lastSeenAt: bucket.lastSeenAt,
      sampleContexts: bucket.sampleContexts,
    });
  }

  return issues.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (b.lastSeenAt !== a.lastSeenAt) return b.lastSeenAt.localeCompare(a.lastSeenAt);
    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

export interface FailedAgentEvalInput {
  orgId: string;
  module: FeedbackModule;
  category: 'agent_rating' | 'agent_unanswered_or_tool_fail' | 'silent_correction';
  intent: string;
  userPrompt: string;
  agentResponse?: string | null;
  expectedBehavior?: string | null;
  failureReason?: string | null;
  actualToolCalls?: string[];
  model?: string | null;
  promptVersion?: string | null;
  context?: Record<string, unknown>;
  createdAt?: string;
}

export interface EvalCaseCandidate {
  candidateId: string;
  orgId: string;
  sourceCategory: FailedAgentEvalInput['category'];
  module: FeedbackModule;
  intent: string;
  status: 'pending_human_review';
  requiresHumanReview: true;
  autoAddedToEvalSet: false;
  autoModifyCodeOrPromptAllowed: false;
  anonymizedInput: {
    userPrompt: string;
    context: Record<string, unknown>;
  };
  anonymizedOutput: {
    agentResponse: string | null;
    actualToolCalls: string[];
    failureReason: string | null;
  };
  expectedBehavior: string | null;
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
}

/**
 * Mengubah kasus agent gagal / rating buruk menjadi kandidat eval yang telah dianonimkan.
 * Status WAJIB `'pending_human_review'` — tidak pernah masuk set eval tanpa tinjauan manusia.
 */
export function buildEvalCandidateFromFailedAgent(input: FailedAgentEvalInput): EvalCaseCandidate {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const sanitizedPrompt = anonymizeString(input.userPrompt || '');
  const sanitizedContext = anonymizeFeedbackPayload(input.context ?? {});
  const sanitizedResponse =
    input.agentResponse != null ? anonymizeString(input.agentResponse) : null;
  const sanitizedReason =
    input.failureReason != null ? anonymizeString(input.failureReason) : null;
  const sanitizedExpected =
    input.expectedBehavior != null ? anonymizeString(input.expectedBehavior) : null;
  const sanitizedTools = (input.actualToolCalls ?? []).map((t) => anonymizeString(t));
  const sanitizedIntent = anonymizeString(input.intent || 'unknown');

  const candidateId = `evalcand_${computeDeterministicSha256(
    `${input.orgId}::${input.module}::${sanitizedIntent}::${sanitizedPrompt}::${createdAt}`,
  ).slice(0, 20)}`;

  return {
    candidateId,
    orgId: input.orgId,
    sourceCategory: input.category,
    module: input.module,
    intent: sanitizedIntent,
    status: 'pending_human_review',
    requiresHumanReview: true,
    autoAddedToEvalSet: false,
    autoModifyCodeOrPromptAllowed: false,
    anonymizedInput: {
      userPrompt: sanitizedPrompt,
      context: sanitizedContext,
    },
    anonymizedOutput: {
      agentResponse: sanitizedResponse,
      actualToolCalls: sanitizedTools,
      failureReason: sanitizedReason,
    },
    expectedBehavior: sanitizedExpected,
    model: input.model != null ? anonymizeString(input.model) : null,
    promptVersion: input.promptVersion != null ? anonymizeString(input.promptVersion) : null,
    createdAt,
  };
}

export interface QualityMetricObservation {
  module: FeedbackModule;
  intent: string;
  periodWindow?: 'previous' | 'current';
  totalPredictions: number;
  correctPredictions: number;
  mispostingCount: number;
  criticalErrorCount: number;
}

export interface QualityDashboardPolicy {
  minAccuracy?: number;
  maxAccuracyDrop?: number;
  maxCriticalErrors?: number;
  maxMispostingRate?: number;
  maxMispostingRateIncrease?: number;
  currentAutonomyLevel?: 'L0' | 'L1' | 'L2';
}

export interface ModuleQualitySummary {
  module: FeedbackModule;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  previousAccuracy: number | null;
  accuracyDelta: number | null;
  mispostingCount: number;
  mispostingRate: number;
  criticalErrorCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface IntentQualitySummary {
  intent: string;
  module: FeedbackModule;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  previousAccuracy: number | null;
  accuracyDelta: number | null;
  mispostingCount: number;
  mispostingRate: number;
  criticalErrorCount: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface QualityDashboardResult {
  overall: {
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    previousAccuracy: number | null;
    accuracyDelta: number | null;
    mispostingCount: number;
    mispostingRate: number;
    previousMispostingRate: number | null;
    mispostingRateDelta: number | null;
    criticalErrorCount: number;
  };
  byModule: ModuleQualitySummary[];
  byIntent: IntentQualitySummary[];
  mispostingTrend: 'improving' | 'stable' | 'worsening';
  warnings: string[];
  autonomyDemotionRecommended: boolean;
  recommendedAutonomyTransition: 'L2 -> L1' | null;
  demotionReasons: string[];
  autoModifyCodeOrPromptAllowed: false;
}

function round4(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 10000) / 10000;
}

/**
 * Menghitung dasbor mutu per modul dan per intent, tren salah-posting, peringatan
 * penurunan akurasi, serta sinyal rekomendasi penurunan otonomi `L2 -> L1`.
 */
export function computeQualityDashboard(
  metrics: readonly QualityMetricObservation[],
  policy: QualityDashboardPolicy = {},
): QualityDashboardResult {
  const minAccuracy = policy.minAccuracy ?? 0.98;
  const maxAccuracyDrop = policy.maxAccuracyDrop ?? 0.03;
  const maxCriticalErrors = policy.maxCriticalErrors ?? 0;
  const maxMispostingRate = policy.maxMispostingRate ?? 0.02;
  const maxMispostingRateIncrease = policy.maxMispostingRateIncrease ?? 0.01;
  const currentAutonomyLevel = policy.currentAutonomyLevel ?? 'L2';

  type Agg = {
    total: number;
    correct: number;
    misposting: number;
    critical: number;
  };
  const createAgg = (): Agg => ({ total: 0, correct: 0, misposting: 0, critical: 0 });
  const addAgg = (target: Agg, obs: QualityMetricObservation) => {
    const total = Math.max(0, obs.totalPredictions);
    const correct = Math.max(0, Math.min(total, obs.correctPredictions));
    target.total += total;
    target.correct += correct;
    target.misposting += Math.max(0, obs.mispostingCount);
    target.critical += Math.max(0, obs.criticalErrorCount);
  };

  const overallCur = createAgg();
  const overallPrev = createAgg();

  const moduleMap = new Map<FeedbackModule, { cur: Agg; prev: Agg }>();
  const intentMap = new Map<string, { intent: string; module: FeedbackModule; cur: Agg; prev: Agg }>();

  for (const obs of metrics ?? []) {
    const win = obs.periodWindow ?? 'current';
    if (win === 'previous') {
      addAgg(overallPrev, obs);
    } else {
      addAgg(overallCur, obs);
    }

    let modEntry = moduleMap.get(obs.module);
    if (!modEntry) {
      modEntry = { cur: createAgg(), prev: createAgg() };
      moduleMap.set(obs.module, modEntry);
    }
    addAgg(win === 'previous' ? modEntry.prev : modEntry.cur, obs);

    const intentKey = `${obs.module}::${obs.intent}`;
    let intentEntry = intentMap.get(intentKey);
    if (!intentEntry) {
      intentEntry = {
        intent: obs.intent,
        module: obs.module,
        cur: createAgg(),
        prev: createAgg(),
      };
      intentMap.set(intentKey, intentEntry);
    }
    addAgg(win === 'previous' ? intentEntry.prev : intentEntry.cur, obs);
  }

  const accuracy = overallCur.total === 0 ? 1 : round4(overallCur.correct / overallCur.total);
  const previousAccuracy =
    overallPrev.total === 0 ? null : round4(overallPrev.correct / overallPrev.total);
  const accuracyDelta =
    previousAccuracy === null ? null : round4(accuracy - previousAccuracy);

  const mispostingRate =
    overallCur.total === 0 ? 0 : round4(overallCur.misposting / overallCur.total);
  const previousMispostingRate =
    overallPrev.total === 0 ? null : round4(overallPrev.misposting / overallPrev.total);
  const mispostingRateDelta =
    previousMispostingRate === null ? null : round4(mispostingRate - previousMispostingRate);

  let mispostingTrend: QualityDashboardResult['mispostingTrend'] = 'stable';
  if (mispostingRateDelta !== null) {
    if (mispostingRateDelta > 0.002) {
      mispostingTrend = 'worsening';
    } else if (mispostingRateDelta < -0.002) {
      mispostingTrend = 'improving';
    }
  } else if (mispostingRate > maxMispostingRate) {
    mispostingTrend = 'worsening';
  }

  const warnings: string[] = [];
  const demotionReasons: string[] = [];

  if (overallCur.critical > maxCriticalErrors) {
    const msg = `Kesalahan kritis (${overallCur.critical}) melampaui batas (${maxCriticalErrors}).`;
    warnings.push(msg);
    demotionReasons.push('critical_error_threshold_exceeded');
  }

  if (overallCur.total > 0 && accuracy < minAccuracy) {
    const msg = `Akurasi keseluruhan (${(accuracy * 100).toFixed(2)}%) turun di bawah ambang (${(minAccuracy * 100).toFixed(2)}%).`;
    warnings.push(msg);
    demotionReasons.push('accuracy_below_policy_threshold');
  }

  if (accuracyDelta !== null && accuracyDelta < -maxAccuracyDrop) {
    const msg = `Penurunan akurasi signifikan sebesar ${(Math.abs(accuracyDelta) * 100).toFixed(2)} poin persentase dibanding periode sebelumnya.`;
    warnings.push(msg);
    demotionReasons.push('accuracy_drop_exceeded');
  }

  if (mispostingRate > maxMispostingRate) {
    const msg = `Laju salah-posting (${(mispostingRate * 100).toFixed(2)}%) melampaui ambang (${(maxMispostingRate * 100).toFixed(2)}%).`;
    warnings.push(msg);
    demotionReasons.push('misposting_rate_exceeded');
  }

  if (mispostingRateDelta !== null && mispostingRateDelta > maxMispostingRateIncrease) {
    const msg = `Tren salah-posting memburuk (+${(mispostingRateDelta * 100).toFixed(2)} poin persentase).`;
    warnings.push(msg);
    demotionReasons.push('misposting_trend_worsened');
  }

  const computeStatus = (acc: number, misRate: number, critical: number, total: number) => {
    if (critical > maxCriticalErrors) return 'critical' as const;
    if (total > 0 && (acc < minAccuracy || misRate > maxMispostingRate)) return 'warning' as const;
    return 'healthy' as const;
  };

  const byModule: ModuleQualitySummary[] = Array.from(moduleMap.entries())
    .map(([mod, entry]) => {
      const modAcc = entry.cur.total === 0 ? 1 : round4(entry.cur.correct / entry.cur.total);
      const modPrevAcc =
        entry.prev.total === 0 ? null : round4(entry.prev.correct / entry.prev.total);
      const modDelta = modPrevAcc === null ? null : round4(modAcc - modPrevAcc);
      const modMisRate =
        entry.cur.total === 0 ? 0 : round4(entry.cur.misposting / entry.cur.total);
      const status = computeStatus(modAcc, modMisRate, entry.cur.critical, entry.cur.total);
      if (modDelta !== null && modDelta < -maxAccuracyDrop) {
        warnings.push(`Modul '${mod}' mengalami penurunan akurasi ${(Math.abs(modDelta) * 100).toFixed(2)}%.`);
      }
      return {
        module: mod,
        totalPredictions: entry.cur.total,
        correctPredictions: entry.cur.correct,
        accuracy: modAcc,
        previousAccuracy: modPrevAcc,
        accuracyDelta: modDelta,
        mispostingCount: entry.cur.misposting,
        mispostingRate: modMisRate,
        criticalErrorCount: entry.cur.critical,
        status,
      };
    })
    .sort((a, b) => a.module.localeCompare(b.module));

  const byIntent: IntentQualitySummary[] = Array.from(intentMap.values())
    .map((entry) => {
      const intAcc = entry.cur.total === 0 ? 1 : round4(entry.cur.correct / entry.cur.total);
      const intPrevAcc =
        entry.prev.total === 0 ? null : round4(entry.prev.correct / entry.prev.total);
      const intDelta = intPrevAcc === null ? null : round4(intAcc - intPrevAcc);
      const intMisRate =
        entry.cur.total === 0 ? 0 : round4(entry.cur.misposting / entry.cur.total);
      const status = computeStatus(intAcc, intMisRate, entry.cur.critical, entry.cur.total);
      if (intDelta !== null && intDelta < -maxAccuracyDrop) {
        warnings.push(
          `Intent '${entry.intent}' (${entry.module}) mengalami penurunan akurasi ${(Math.abs(intDelta) * 100).toFixed(2)}%.`,
        );
      }
      return {
        intent: entry.intent,
        module: entry.module,
        totalPredictions: entry.cur.total,
        correctPredictions: entry.cur.correct,
        accuracy: intAcc,
        previousAccuracy: intPrevAcc,
        accuracyDelta: intDelta,
        mispostingCount: entry.cur.misposting,
        mispostingRate: intMisRate,
        criticalErrorCount: entry.cur.critical,
        status,
      };
    })
    .sort((a, b) => a.intent.localeCompare(b.intent));

  const uniqueDemotionReasons = Array.from(new Set(demotionReasons));
  const autonomyDemotionRecommended = uniqueDemotionReasons.length > 0;
  const recommendedAutonomyTransition =
    autonomyDemotionRecommended && currentAutonomyLevel === 'L2' ? 'L2 -> L1' : null;

  return {
    overall: {
      totalPredictions: overallCur.total,
      correctPredictions: overallCur.correct,
      accuracy,
      previousAccuracy,
      accuracyDelta,
      mispostingCount: overallCur.misposting,
      mispostingRate,
      previousMispostingRate,
      mispostingRateDelta,
      criticalErrorCount: overallCur.critical,
    },
    byModule,
    byIntent,
    mispostingTrend,
    warnings: Array.from(new Set(warnings)),
    autonomyDemotionRecommended,
    recommendedAutonomyTransition,
    demotionReasons: uniqueDemotionReasons,
    autoModifyCodeOrPromptAllowed: false,
  };
}
