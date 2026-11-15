import { describe, expect, it } from 'vitest';
import { isExemptFromSingleDeviceSession } from './singleDeviceSessionService';

describe('singleDeviceSession', () => {
  it('super admin tidak dikenai aturan 1 perangkat', () => {
    expect(isExemptFromSingleDeviceSession('admin')).toBe(true);
    expect(isExemptFromSingleDeviceSession('user')).toBe(false);
    expect(isExemptFromSingleDeviceSession('user', 'hanif@monefyi.com')).toBe(false);
  });

  it('akun indra di tim hanif dibebaskan dari pembatasan single-device', () => {
    expect(isExemptFromSingleDeviceSession('user', 'indra@fdfd.com')).toBe(true);
    expect(isExemptFromSingleDeviceSession('user', 'indragunawan.anzon93@gmail.com')).toBe(true);
    expect(isExemptFromSingleDeviceSession('user', 'indra@gmail.com')).toBe(true);
  });

  it('akun dengan flag allow_multi_device atau exempt_single_device dibebaskan', () => {
    expect(isExemptFromSingleDeviceSession('user', 'custom@domain.com', { allow_multi_device: true })).toBe(true);
    expect(isExemptFromSingleDeviceSession('user', 'custom@domain.com', { exempt_single_device: true })).toBe(true);
  });
});