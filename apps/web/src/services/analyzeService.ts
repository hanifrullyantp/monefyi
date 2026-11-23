import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { isDemoOrInvalidUuid } from '../lib/demo/demoMode';
import { useAppStore } from '../store/appStore';

export interface AnalyzeRecommendation {
  type: string;
  severity: string;
  title: string;
  message: string;
  description?: string;
  category?: string;
  priority?: string;
  action?: string;
}

export interface AnalyzeResult {
  evm: {
    pv: number;
    ev: number;
    ac: number;
    spi: number;
    cpi: number;
    eac: number;
    etc: number;
    planned_progress: number;
    actual_progress: number;
    planned_value?: number;
    earned_value?: number;
    actual_cost?: number;
    schedule_variance?: number;
    cost_variance?: number;
    total_budget?: number;
    elapsed_days?: number;
    total_duration?: number;
  };
  recommendations: AnalyzeRecommendation[];
}

function toFiniteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeAnalyzeResult(raw: unknown): AnalyzeResult | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const hasEvmObj = Boolean(obj.evm && typeof obj.evm === 'object');
  const hasFlatSnapshotFields =
    'pv' in obj ||
    'planned_value' in obj ||
    'ev' in obj ||
    'ac' in obj ||
    'spi' in obj ||
    'cpi' in obj ||
    'recommendations' in obj;

  if (!hasEvmObj && !hasFlatSnapshotFields) {
    return null;
  }

  const evmSrc = (hasEvmObj ? obj.evm : obj) as Record<string, unknown>;

  const pv = toFiniteNumber(evmSrc.pv ?? evmSrc.planned_value);
  const ev = toFiniteNumber(evmSrc.ev ?? evmSrc.earned_value);
  const ac = toFiniteNumber(evmSrc.ac ?? evmSrc.actual_cost);
  const spi = toFiniteNumber(evmSrc.spi);
  const cpi = toFiniteNumber(evmSrc.cpi);
  const eac = toFiniteNumber(evmSrc.eac);
  const etc = toFiniteNumber(evmSrc.etc);
  const plannedProgress = toFiniteNumber(evmSrc.planned_progress);
  const actualProgress = toFiniteNumber(evmSrc.actual_progress);

  const plannedValue = toOptionalFiniteNumber(evmSrc.planned_value) ?? pv;
  const earnedValue = toOptionalFiniteNumber(evmSrc.earned_value);
  const actualCost = toOptionalFiniteNumber(evmSrc.actual_cost);
  const scheduleVariance = toOptionalFiniteNumber(evmSrc.schedule_variance ?? evmSrc.sv);
  const costVariance = toOptionalFiniteNumber(evmSrc.cost_variance ?? evmSrc.cv);
  const totalBudget = toOptionalFiniteNumber(evmSrc.total_budget);
  const elapsedDays = toOptionalFiniteNumber(evmSrc.elapsed_days);
  const totalDuration = toOptionalFiniteNumber(evmSrc.total_duration);

  const rawRecs = Array.isArray(obj.recommendations) ? obj.recommendations : [];
  const recommendations: AnalyzeRecommendation[] = rawRecs
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(rec => {
      const type = String(rec.type ?? rec.category ?? 'general');
      const severity = String(rec.severity ?? rec.priority ?? 'info');
      const category =
        typeof rec.category === 'string' && rec.category.length > 0 ? rec.category : type;
      const priority =
        typeof rec.priority === 'string' && rec.priority.length > 0 ? rec.priority : severity;
      const rawMessage = typeof rec.message === 'string' ? rec.message : '';
      const rawDescription = typeof rec.description === 'string' ? rec.description : '';
      const message = rawMessage.length > 0 ? rawMessage : rawDescription;
      const description = rawDescription.length > 0 ? rawDescription : message;

      return {
        type,
        severity,
        title: String(rec.title ?? ''),
        message,
        description,
        category,
        priority,
        ...(typeof rec.action === 'string' && rec.action.length > 0 ? { action: rec.action } : {}),
      };
    });

  return {
    evm: {
      pv,
      ev,
      ac,
      spi,
      cpi,
      eac,
      etc,
      planned_progress: plannedProgress,
      actual_progress: actualProgress,
      planned_value: plannedValue,
      ...(earnedValue !== undefined ? { earned_value: earnedValue } : {}),
      ...(actualCost !== undefined ? { actual_cost: actualCost } : {}),
      ...(scheduleVariance !== undefined ? { schedule_variance: scheduleVariance } : {}),
      ...(costVariance !== undefined ? { cost_variance: costVariance } : {}),
      ...(totalBudget !== undefined ? { total_budget: totalBudget } : {}),
      ...(elapsedDays !== undefined ? { elapsed_days: elapsedDays } : {}),
      ...(totalDuration !== undefined ? { total_duration: totalDuration } : {}),
    },
    recommendations,
  };
}

export type AnalyzeErrorCode = 'OFFLINE' | 'NETWORK_ERROR' | 'API_ERROR';

export class AnalyzeProjectError extends Error {
  readonly code: AnalyzeErrorCode;
  readonly cause?: unknown;

  constructor(code: AnalyzeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AnalyzeProjectError';
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isOfflineOrNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (!error || typeof error !== 'object') {
    return false;
  }
  const errObj = error as { name?: unknown; message?: unknown };
  const name = typeof errObj.name === 'string' ? errObj.name : '';
  const message = typeof errObj.message === 'string' ? errObj.message : '';
  if (name === 'FunctionsFetchError') {
    return true;
  }
  return /failed to send a request|failed to fetch|networkerror|err_internet_disconnected|fetch failed|load failed|network request failed/i.test(
    message,
  );
}

export async function analyzeProject(projectId: string): Promise<AnalyzeResult | null> {
  const state = useAppStore.getState();
  if (isDemoOrInvalidUuid(projectId, Boolean(state.isDemoMode || state.tenant?.id === 'demo'))) {
    return null;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AnalyzeProjectError(
      'OFFLINE',
      'Koneksi internet terputus. Coba lagi saat online.',
    );
  }

  let result: { data: unknown; error: unknown };
  try {
    result = await supabase.functions.invoke(config.fnAnalyze, {
      body: { project_id: projectId },
    });
  } catch (err) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline || isOfflineOrNetworkError(err)) {
      throw new AnalyzeProjectError(
        offline ? 'OFFLINE' : 'NETWORK_ERROR',
        offline
          ? 'Koneksi internet terputus. Coba lagi saat online.'
          : 'Gagal terhubung ke server analisa AI. Periksa koneksi Anda dan coba lagi.',
        { cause: err },
      );
    }
    throw new AnalyzeProjectError(
      'API_ERROR',
      err instanceof Error ? err.message : 'Gagal menjalankan analisa AI proyek.',
      { cause: err },
    );
  }

  if (result.error) {
    console.warn('planner-analyze failed:', result.error);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline || isOfflineOrNetworkError(result.error)) {
      throw new AnalyzeProjectError(
        offline ? 'OFFLINE' : 'NETWORK_ERROR',
        offline
          ? 'Koneksi internet terputus. Coba lagi saat online.'
          : 'Gagal terhubung ke server analisa AI. Periksa koneksi Anda dan coba lagi.',
        { cause: result.error },
      );
    }
    const errMsg =
      typeof result.error === 'object' && result.error && 'message' in result.error
        ? String((result.error as { message?: unknown }).message || '')
        : '';
    throw new AnalyzeProjectError(
      'API_ERROR',
      errMsg || 'Gagal menjalankan analisa AI proyek.',
      { cause: result.error },
    );
  }

  return normalizeAnalyzeResult(result.data);
}

export async function loadLatestAnalysisSnapshot(projectId: string): Promise<AnalyzeResult | null> {
  const state = useAppStore.getState();
  if (isDemoOrInvalidUuid(projectId, Boolean(state.isDemoMode || state.tenant?.id === 'demo'))) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('planner_analysis_snapshots')
      .select('pv, ev, ac, sv, cv, spi, cpi, eac, etc, planned_progress, actual_progress, recommendations, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return normalizeAnalyzeResult(data);
  } catch {
    return null;
  }
}
