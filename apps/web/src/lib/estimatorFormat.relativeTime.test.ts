import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatRelativeTimeId } from './estimatorFormat';

describe('formatRelativeTimeId - relative labels - Indonesian copy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns dash for empty input', () => {
    expect(formatRelativeTimeId(null)).toBe('—');
    expect(formatRelativeTimeId(undefined)).toBe('—');
  });

  it('returns Baru saja for recent updates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T12:00:00Z'));
    expect(formatRelativeTimeId('2026-09-08T11:59:30Z')).toBe('Baru saja');
  });

  it('returns hours and days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T12:00:00Z'));
    expect(formatRelativeTimeId('2026-09-08T09:00:00Z')).toBe('3 jam lalu');
    expect(formatRelativeTimeId('2026-09-06T12:00:00Z')).toBe('2 hari lalu');
  });
});
