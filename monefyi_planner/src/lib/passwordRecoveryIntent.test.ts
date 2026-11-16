import { describe, expect, it } from 'vitest';
import { recoverySignalFromLocation } from './passwordRecoveryIntent';

describe('recoverySignalFromLocation - recovery hash - opens password form', () => {
  it('recoverySignalFromLocation - type=recovery in hash - marks recovery', () => {
    const signal = recoverySignalFromLocation('#access_token=abc&type=recovery', '');
    expect(signal.recovery).toBe(true);
    expect(signal.error).toBeNull();
  });

  it('recoverySignalFromLocation - expired link - asks for a new link', () => {
    const signal = recoverySignalFromLocation(
      '#error=access_denied&error_code=otp_expired&error_description=expired',
      '',
    );
    expect(signal.recovery).toBe(false);
    expect(signal.error).toBe('Tautan reset sudah kedaluwarsa. Minta tautan baru.');
  });

  it('recoverySignalFromLocation - ordinary login url - stays on login', () => {
    const signal = recoverySignalFromLocation('', '');
    expect(signal.recovery).toBe(false);
    expect(signal.error).toBeNull();
  });
});
