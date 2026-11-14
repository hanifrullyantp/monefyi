import { describe, expect, it } from 'vitest';
import { isExemptFromSingleDeviceSession } from './singleDeviceSessionService';

describe('singleDeviceSession', () => {
  it('super admin tidak dikenai aturan 1 perangkat', () => {
    expect(isExemptFromSingleDeviceSession('admin')).toBe(true);
    expect(isExemptFromSingleDeviceSession('user')).toBe(false);
    expect(isExemptFromSingleDeviceSession('user', 'hanif@monefyi.com')).toBe(false);
  });
});