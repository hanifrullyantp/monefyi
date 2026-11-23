import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();
const mockFrom = vi.fn();
const mockStoreState = {
  isDemoMode: false,
  tenant: { id: '11111111-1111-1111-1111-111111111111' },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => (mockInvoke as (...a: unknown[]) => unknown)(...args) },
    from: (...args: unknown[]) => (mockFrom as (...a: unknown[]) => unknown)(...args),
  },
}));

vi.mock('../store/appStore', () => ({
  useAppStore: {
    getState: () => mockStoreState,
  },
}));

import {
  analyzeProject,
  AnalyzeProjectError,
  isOfflineOrNetworkError,
  loadLatestAnalysisSnapshot,
  normalizeAnalyzeResult,
} from './analyzeService';

describe('analyzeService network/offline & demo guard (F-10 / F-37)', () => {
  beforeEach(() => {
    mockStoreState.isDemoMode = false;
    mockStoreState.tenant = { id: '11111111-1111-1111-1111-111111111111' };
    mockInvoke.mockReset();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects navigator.onLine === false as offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isOfflineOrNetworkError(new Error('anything'))).toBe(true);
  });

  it('detects FunctionsFetchError and network fetch failure messages', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isOfflineOrNetworkError({ name: 'FunctionsFetchError', message: 'Failed' })).toBe(true);
    expect(isOfflineOrNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isOfflineOrNetworkError(new Error('ERR_INTERNET_DISCONNECTED'))).toBe(true);
    expect(isOfflineOrNetworkError(new Error('Invalid project id'))).toBe(false);
  });

  it('constructs AnalyzeProjectError with code and optional cause', () => {
    const rootCause = new Error('Socket closed');
    const err = new AnalyzeProjectError('OFFLINE', 'Koneksi internet terputus.', { cause: rootCause });
    expect(err.name).toBe('AnalyzeProjectError');
    expect(err.code).toBe('OFFLINE');
    expect(err.message).toBe('Koneksi internet terputus.');
    expect(err.cause).toBe(rootCause);
  });

  it('short-circuits demo or non-UUID projectId without calling Supabase', async () => {
    expect(await analyzeProject('demo-proj-1')).toBeNull();
    expect(await analyzeProject('not-a-uuid')).toBeNull();
    mockStoreState.isDemoMode = true;
    expect(await analyzeProject('11111111-1111-1111-1111-111111111111')).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('analyzeService normalization & snapshot hydration (F-08)', () => {
  beforeEach(() => {
    mockStoreState.isDemoMode = false;
    mockStoreState.tenant = { id: '11111111-1111-1111-1111-111111111111' };
    mockInvoke.mockReset();
    mockFrom.mockReset();
  });

  it('normalizes Edge Function payload (planned_value, total_budget, category/priority, description <-> message)', () => {
    const normalized = normalizeAnalyzeResult({
      evm: {
        planned_value: 25_000_000,
        earned_value: 10_000_000,
        actual_cost: 15_000_000,
        spi: 0.4,
        cpi: 0.67,
        eac: 37_500_000,
        etc: 22_500_000,
        planned_progress: 50,
        actual_progress: 20,
        total_budget: 50_000_000,
      },
      recommendations: [
        {
          category: 'schedule',
          priority: 'critical',
          title: 'Progress terlambat ~73 hari',
          description: 'SPI 0.40, aktual 20.0% vs target 50.0%',
        },
      ],
    });

    expect(normalized).not.toBeNull();
    expect(normalized!.evm.pv).toBe(25_000_000);
    expect(normalized!.evm.planned_value).toBe(25_000_000);
    expect(normalized!.evm.ev).toBe(10_000_000);
    expect(normalized!.evm.ac).toBe(15_000_000);
    expect(normalized!.evm.total_budget).toBe(50_000_000);
    expect(normalized!.recommendations[0]).toMatchObject({
      type: 'schedule',
      severity: 'critical',
      category: 'schedule',
      priority: 'critical',
      title: 'Progress terlambat ~73 hari',
      message: 'SPI 0.40, aktual 20.0% vs target 50.0%',
      description: 'SPI 0.40, aktual 20.0% vs target 50.0%',
    });
  });

  it('normalizes legacy payload (pv, type/severity, message -> description & planned_value)', () => {
    const normalized = normalizeAnalyzeResult({
      evm: {
        pv: 12_000_000,
        ev: 12_000_000,
        ac: 10_000_000,
        spi: 1,
        cpi: 1.2,
        eac: 8_333_333,
        etc: 0,
        planned_progress: 30,
        actual_progress: 30,
      },
      recommendations: [
        {
          type: 'cost',
          severity: 'warning',
          title: 'Pantau belanja',
          message: 'Pengeluaran mendekati plafon',
        },
      ],
    });

    expect(normalized).not.toBeNull();
    expect(normalized!.evm.pv).toBe(12_000_000);
    expect(normalized!.evm.planned_value).toBe(12_000_000);
    expect(normalized!.recommendations[0]).toMatchObject({
      type: 'cost',
      severity: 'warning',
      category: 'cost',
      priority: 'warning',
      message: 'Pengeluaran mendekati plafon',
      description: 'Pengeluaran mendekati plafon',
    });
  });

  it('returns null for null/invalid input to normalizeAnalyzeResult', () => {
    expect(normalizeAnalyzeResult(null)).toBeNull();
    expect(normalizeAnalyzeResult(undefined)).toBeNull();
    expect(normalizeAnalyzeResult({})).toBeNull();
  });

  it('normalizes analyzeProject response from Supabase Edge Function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        evm: {
          planned_value: 10_000_000,
          earned_value: 5_000_000,
          actual_cost: 8_000_000,
          spi: 0.5,
          cpi: 0.625,
          eac: 16_000_000,
          etc: 8_000_000,
          planned_progress: 40,
          actual_progress: 20,
          total_budget: 25_000_000,
        },
        recommendations: [
          {
            category: 'cost',
            priority: 'critical',
            title: 'Over budget',
            description: 'CPI 0.63',
          },
        ],
      },
      error: null,
    });

    const result = await analyzeProject('22222222-2222-4222-8222-222222222222');
    expect(result?.evm.pv).toBe(10_000_000);
    expect(result?.evm.total_budget).toBe(25_000_000);
    expect(result?.recommendations[0].message).toBe('CPI 0.63');
    expect(result?.recommendations[0].description).toBe('CPI 0.63');
  });

  it('guards loadLatestAnalysisSnapshot for demo/non-UUID without hitting Supabase', async () => {
    expect(await loadLatestAnalysisSnapshot('demo-proj-1')).toBeNull();
    expect(await loadLatestAnalysisSnapshot('invalid-id')).toBeNull();
    mockStoreState.isDemoMode = true;
    expect(await loadLatestAnalysisSnapshot('22222222-2222-4222-8222-222222222222')).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads and normalizes latest persisted snapshot from planner_analysis_snapshots', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        pv: 20_000_000,
        ev: 8_000_000,
        ac: 14_000_000,
        sv: -12_000_000,
        cv: -6_000_000,
        spi: 0.4,
        cpi: 0.57,
        eac: 35_000_000,
        etc: 21_000_000,
        planned_progress: 45,
        actual_progress: 18,
        recommendations: [
          {
            category: 'schedule',
            priority: 'critical',
            title: 'Progress terlambat ~15 hari',
            description: 'SPI 0.40, aktual 18.0% vs target 45.0%',
          },
        ],
      },
      error: null,
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const projectId = '22222222-2222-4222-8222-222222222222';
    const snapshot = await loadLatestAnalysisSnapshot(projectId);

    expect(mockFrom).toHaveBeenCalledWith('planner_analysis_snapshots');
    expect(eq).toHaveBeenCalledWith('project_id', projectId);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.evm.pv).toBe(20_000_000);
    expect(snapshot!.evm.planned_value).toBe(20_000_000);
    expect(snapshot!.recommendations[0].description).toBe('SPI 0.40, aktual 18.0% vs target 45.0%');
    expect(snapshot!.recommendations[0].message).toBe('SPI 0.40, aktual 18.0% vs target 45.0%');
  });

  it('returns null when snapshot query returns error or empty data', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS' } });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const snapshot = await loadLatestAnalysisSnapshot('22222222-2222-4222-8222-222222222222');
    expect(snapshot).toBeNull();
  });
});
