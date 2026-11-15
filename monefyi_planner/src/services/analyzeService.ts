import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { isDemoOrInvalidUuid } from '../lib/demo/demoMode';
import { useAppStore } from '../store/appStore';

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
  };
  recommendations: Array<{
    type: string;
    severity: string;
    title: string;
    message: string;
    action?: string;
  }>;
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

  return (result.data ?? null) as AnalyzeResult | null;
}
