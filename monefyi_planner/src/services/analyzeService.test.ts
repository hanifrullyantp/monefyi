import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();
const mockStoreState = {
  isDemoMode: false,
  tenant: { id: '11111111-1111-1111-1111-111111111111' },
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => (mockInvoke as (...a: unknown[]) => unknown)(...args) },
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
} from './analyzeService';

describe('analyzeService network/offline & demo guard (F-10 / F-37)', () => {
  beforeEach(() => {
    mockStoreState.isDemoMode = false;
    mockStoreState.tenant = { id: '11111111-1111-1111-1111-111111111111' };
    mockInvoke.mockReset();
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
