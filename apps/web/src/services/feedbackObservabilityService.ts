import {
  aggregateFeedbackQueue,
  anonymizeFeedbackPayload,
  buildEvalCandidateFromFailedAgent,
  ingestFeedbackSignal,
  type AggregatedFeedbackIssue,
  type EvalCaseCandidate,
  type FailedAgentEvalInput,
  type FeedbackModule,
  type FeedbackQueueItem,
  type FeedbackSeverity,
  type FeedbackSignalCategory,
  type IngestFeedbackSignalResult,
  type OrgTelemetryConsent,
} from '../../../../packages/domain/src/feedbackObservability';

export interface FeedbackPersistAdapter {
  insertFeedbackEvent: (item: FeedbackQueueItem) => Promise<{ error: string | null }>;
  fetchOrgConsent?: (orgId: string) => Promise<OrgTelemetryConsent | null>;
}

export interface FeedbackReportResult {
  accepted: boolean;
  reason: IngestFeedbackSignalResult['reason'];
  autoModifyCodeOrPromptAllowed: false;
  queueItem: FeedbackQueueItem | null;
  persisted: boolean;
  persistError: string | null;
}

const inMemoryQueue: FeedbackQueueItem[] = [];
const inMemoryEvalCandidates: EvalCaseCandidate[] = [];
const orgConsentOverrides = new Map<string, OrgTelemetryConsent>();

async function tryPersistToSupabase(item: FeedbackQueueItem): Promise<{ persisted: boolean; persistError: string | null }> {
  try {
    const mod = await import('../lib/supabase');
    const { error } = await mod.supabase.from('planner_feedback_events').insert({
      org_id: item.orgId,
      module: item.module,
      category: item.category,
      severity: item.severity,
      fingerprint: item.fingerprint,
      title: item.title,
      anonymized_context_json: item.anonymizedContextJson,
      app_version: item.appVersion,
      device_info: item.deviceInfo,
      model: item.model,
      prompt_version: item.promptVersion,
      reporter_count: 1,
      priority_score: 0,
      status: item.status,
      notify_reporters_on_resolve: item.notifyReportersOnResolve,
    });
    if (error) {
      return { persisted: false, persistError: error.message };
    }
    return { persisted: true, persistError: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { persisted: false, persistError: message };
  }
}

function resolveConsent(orgId: string, override?: OrgTelemetryConsent): OrgTelemetryConsent {
  if (override) return override;
  return orgConsentOverrides.get(orgId) ?? { behaviorTelemetryOptOut: false };
}

export function setOrgBehaviorTelemetryOptOut(orgId: string, behaviorTelemetryOptOut: boolean): void {
  orgConsentOverrides.set(orgId, { behaviorTelemetryOptOut: Boolean(behaviorTelemetryOptOut) });
}

export function getOrgBehaviorTelemetryConsent(orgId: string): OrgTelemetryConsent {
  return orgConsentOverrides.get(orgId) ?? { behaviorTelemetryOptOut: false };
}

export function getFeedbackQueue(orgId?: string): FeedbackQueueItem[] {
  if (!orgId) return [...inMemoryQueue];
  return inMemoryQueue.filter((item) => item.orgId === orgId);
}

export function getAggregatedFeedbackIssues(orgId?: string): AggregatedFeedbackIssue[] {
  return aggregateFeedbackQueue(getFeedbackQueue(orgId));
}

export function getEvalCandidates(orgId?: string): EvalCaseCandidate[] {
  if (!orgId) return [...inMemoryEvalCandidates];
  return inMemoryEvalCandidates.filter((cand) => cand.orgId === orgId);
}

export function clearFeedbackObservabilityStoreForTests(): void {
  inMemoryQueue.length = 0;
  inMemoryEvalCandidates.length = 0;
  orgConsentOverrides.clear();
}

async function dispatchSignal(params: {
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
  orgConsent?: OrgTelemetryConsent;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
}): Promise<FeedbackReportResult> {
  const consent = resolveConsent(params.orgId, params.orgConsent);
  const ingested = ingestFeedbackSignal(
    {
      orgId: params.orgId,
      reporterId: params.reporterId,
      module: params.module,
      category: params.category,
      severity: params.severity,
      title: params.title,
      errorOrScreenKey: params.errorOrScreenKey,
      context: params.context,
      appVersion: params.appVersion,
      deviceInfo: params.deviceInfo,
      model: params.model,
      promptVersion: params.promptVersion,
      notifyReportersOnResolve: params.notifyReportersOnResolve,
      createdAt: params.createdAt,
    },
    consent,
  );

  if (!ingested.accepted) {
    return {
      accepted: false,
      reason: ingested.reason,
      autoModifyCodeOrPromptAllowed: false,
      queueItem: null,
      persisted: false,
      persistError: null,
    };
  }

  inMemoryQueue.push(ingested.queueItem);

  let persisted = false;
  let persistError: string | null = null;
  if (params.adapter) {
    const res = await params.adapter.insertFeedbackEvent(ingested.queueItem);
    persisted = res.error === null;
    persistError = res.error;
  } else if (params.persist) {
    const res = await tryPersistToSupabase(ingested.queueItem);
    persisted = res.persisted;
    persistError = res.persistError;
  }

  return {
    accepted: true,
    reason: null,
    autoModifyCodeOrPromptAllowed: false,
    queueItem: ingested.queueItem,
    persisted,
    persistError,
  };
}

export interface ReportUserFeedbackParams {
  orgId: string;
  reporterId?: string | null;
  module: FeedbackModule;
  category?: 'user_bug_report' | 'agent_rating' | 'ui_confused';
  severity?: FeedbackSeverity;
  title: string;
  screenKey?: string;
  rating?: 'up' | 'down';
  reason?: string;
  context?: Record<string, unknown>;
  appVersion?: string | null;
  deviceInfo?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  notifyReportersOnResolve?: boolean;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
  evalCandidateInput?: Omit<FailedAgentEvalInput, 'orgId' | 'module' | 'category'>;
}

/**
 * Mencatat umpan balik eksplisit pengguna: tombol "Laporkan masalah", 👍/👎 jawaban agent,
 * maupun tombol "Saya bingung" di setiap layar.
 */
export async function reportUserFeedback(
  params: ReportUserFeedbackParams,
): Promise<FeedbackReportResult> {
  const category = params.category ?? 'user_bug_report';
  const mergedContext: Record<string, unknown> = {
    ...(params.context ?? {}),
    ...(params.screenKey ? { screenKey: params.screenKey } : {}),
    ...(params.rating ? { rating: params.rating } : {}),
    ...(params.reason ? { reason: params.reason } : {}),
  };

  const result = await dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module,
    category,
    severity: params.severity,
    title: params.title,
    errorOrScreenKey: params.screenKey ?? `${category}:${params.title}`,
    context: mergedContext,
    appVersion: params.appVersion,
    deviceInfo: params.deviceInfo,
    model: params.model,
    promptVersion: params.promptVersion,
    notifyReportersOnResolve: params.notifyReportersOnResolve,
    persist: params.persist,
    adapter: params.adapter,
  });

  if (
    result.accepted &&
    category === 'agent_rating' &&
    params.rating === 'down' &&
    params.evalCandidateInput
  ) {
    const cand = buildEvalCandidateFromFailedAgent({
      orgId: params.orgId,
      module: params.module,
      category: 'agent_rating',
      model: params.model,
      promptVersion: params.promptVersion,
      ...params.evalCandidateInput,
    });
    inMemoryEvalCandidates.push(cand);
  }

  return result;
}

export interface ReportRuntimeErrorParams {
  orgId: string;
  reporterId?: string | null;
  module: FeedbackModule;
  error: unknown;
  operation: string;
  screenKey?: string;
  severity?: FeedbackSeverity;
  durationMs?: number;
  slowQueryThresholdMs?: number;
  context?: Record<string, unknown>;
  appVersion?: string | null;
  deviceInfo?: string | null;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
}

/**
 * Pengganti `console.error` diam-diam: menangkap crash, request gagal, maupun query lambat
 * di atas ambang, menganonimkan seluruh stack/konteks, dan memasukkan ke antrean observabilitas.
 */
export async function reportRuntimeError(
  params: ReportRuntimeErrorParams,
): Promise<FeedbackReportResult> {
  const sanitizedError = anonymizeFeedbackPayload(
    params.error instanceof Error
      ? { name: params.error.name, message: params.error.message, stack: params.error.stack }
      : { message: String(params.error ?? 'Unknown runtime error') },
  );
  const isSlowQuery =
    typeof params.durationMs === 'number' &&
    typeof params.slowQueryThresholdMs === 'number' &&
    params.durationMs > params.slowQueryThresholdMs;

  const title = isSlowQuery
    ? `Query lambat pada ${params.operation} (${params.durationMs}ms)`
    : `Runtime error pada ${params.operation}`;

  return dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module,
    category: 'runtime_error',
    severity: params.severity ?? (isSlowQuery ? 'sedang' : 'kritis'),
    title,
    errorOrScreenKey: `${params.screenKey ?? params.operation}::${(sanitizedError as { name?: string }).name ?? 'RuntimeError'}`,
    context: {
      ...(params.context ?? {}),
      operation: params.operation,
      ...(params.screenKey ? { screenKey: params.screenKey } : {}),
      ...(typeof params.durationMs === 'number' ? { durationMs: params.durationMs } : {}),
      ...(typeof params.slowQueryThresholdMs === 'number'
        ? { slowQueryThresholdMs: params.slowQueryThresholdMs }
        : {}),
      isSlowQuery,
      error: sanitizedError,
    },
    appVersion: params.appVersion,
    deviceInfo: params.deviceInfo,
    persist: params.persist,
    adapter: params.adapter,
  });
}

export interface ReportBehaviorFrictionParams {
  orgId: string;
  reporterId?: string | null;
  module: FeedbackModule;
  frictionType: 'rage_click' | 'screen_bounce' | 'form_abandoned' | 'unused_feature';
  screenKey: string;
  title?: string;
  context?: Record<string, unknown>;
  appVersion?: string | null;
  deviceInfo?: string | null;
  orgConsent?: OrgTelemetryConsent;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
}

/**
 * Mencatat sinyal friksi perilaku (rage click, bolak-balik layar, form ditinggalkan,
 * fitur tak pernah dipakai). Ditolak otomatis bila `behaviorTelemetryOptOut === true`.
 */
export async function reportBehaviorFriction(
  params: ReportBehaviorFrictionParams,
): Promise<FeedbackReportResult> {
  return dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module,
    category: 'behavior_friction',
    severity: 'ringan',
    title: params.title ?? `Friksi perilaku (${params.frictionType}) di ${params.screenKey}`,
    errorOrScreenKey: `${params.frictionType}::${params.screenKey}`,
    context: {
      ...(params.context ?? {}),
      frictionType: params.frictionType,
      screenKey: params.screenKey,
    },
    appVersion: params.appVersion,
    deviceInfo: params.deviceInfo,
    orgConsent: params.orgConsent,
    persist: params.persist,
    adapter: params.adapter,
  });
}

export interface ReportSilentCorrectionParams {
  orgId: string;
  reporterId?: string | null;
  module: FeedbackModule;
  correctionType:
    | 'agent_entry_edited'
    | 'agent_entry_cancelled'
    | 'post_reversal_added'
    | 'needs_review_changed'
    | 'needs_choice_rejected';
  intent?: string;
  title?: string;
  context?: Record<string, unknown>;
  model?: string | null;
  promptVersion?: string | null;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
  evalCandidateInput?: Omit<FailedAgentEvalInput, 'orgId' | 'module' | 'category'>;
}

/**
 * Mencatat sinyal koreksi diam-diam (pengguna mengedit/membatalkan entri agent,
 * membuat jurnal pembalik susulan, mengubah `needs_review`, atau menekan "bukan ini" di `needs_choice`).
 */
export async function reportSilentCorrection(
  params: ReportSilentCorrectionParams,
): Promise<FeedbackReportResult> {
  const result = await dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module,
    category: 'silent_correction',
    severity: 'sedang',
    title: params.title ?? `Koreksi diam-diam: ${params.correctionType}`,
    errorOrScreenKey: `${params.correctionType}::${params.intent ?? 'general'}`,
    context: {
      ...(params.context ?? {}),
      correctionType: params.correctionType,
      ...(params.intent ? { intent: params.intent } : {}),
    },
    model: params.model,
    promptVersion: params.promptVersion,
    persist: params.persist,
    adapter: params.adapter,
  });

  if (result.accepted && params.evalCandidateInput) {
    inMemoryEvalCandidates.push(
      buildEvalCandidateFromFailedAgent({
        orgId: params.orgId,
        module: params.module,
        category: 'silent_correction',
        model: params.model,
        promptVersion: params.promptVersion,
        ...params.evalCandidateInput,
      }),
    );
  }

  return result;
}

export interface ReportDataInvariantFailureParams {
  orgId: string;
  reporterId?: string | null;
  module?: FeedbackModule;
  invariantName: string;
  title?: string;
  context?: Record<string, unknown>;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
}

export async function reportDataInvariantFailure(
  params: ReportDataInvariantFailureParams,
): Promise<FeedbackReportResult> {
  return dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module ?? 'keuangan',
    category: 'data_invariant_failure',
    severity: 'kritis',
    title: params.title ?? `Kegagalan invarian data: ${params.invariantName}`,
    errorOrScreenKey: `invariant::${params.invariantName}`,
    context: {
      ...(params.context ?? {}),
      invariantName: params.invariantName,
    },
    persist: params.persist,
    adapter: params.adapter,
  });
}

export interface ReportAgentUnansweredOrToolFailParams {
  orgId: string;
  reporterId?: string | null;
  module?: FeedbackModule;
  intent: string;
  toolName?: string;
  title?: string;
  userPrompt: string;
  failureReason: string;
  actualToolCalls?: string[];
  model?: string | null;
  promptVersion?: string | null;
  context?: Record<string, unknown>;
  persist?: boolean;
  adapter?: FeedbackPersistAdapter;
}

export async function reportAgentUnansweredOrToolFail(
  params: ReportAgentUnansweredOrToolFailParams,
): Promise<FeedbackReportResult> {
  const result = await dispatchSignal({
    orgId: params.orgId,
    reporterId: params.reporterId,
    module: params.module ?? 'agent',
    category: 'agent_unanswered_or_tool_fail',
    severity: 'sedang',
    title: params.title ?? `Agent gagal/tak terjawab pada ${params.intent}`,
    errorOrScreenKey: `agent_fail::${params.intent}::${params.toolName ?? 'no_tool'}`,
    context: {
      ...(params.context ?? {}),
      intent: params.intent,
      ...(params.toolName ? { toolName: params.toolName } : {}),
      userPrompt: params.userPrompt,
      failureReason: params.failureReason,
    },
    model: params.model,
    promptVersion: params.promptVersion,
    persist: params.persist,
    adapter: params.adapter,
  });

  if (result.accepted) {
    inMemoryEvalCandidates.push(
      buildEvalCandidateFromFailedAgent({
        orgId: params.orgId,
        module: params.module ?? 'agent',
        category: 'agent_unanswered_or_tool_fail',
        intent: params.intent,
        userPrompt: params.userPrompt,
        failureReason: params.failureReason,
        actualToolCalls: params.actualToolCalls,
        model: params.model,
        promptVersion: params.promptVersion,
        context: params.context,
      }),
    );
  }

  return result;
}
