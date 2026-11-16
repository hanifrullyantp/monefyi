const INTENT_KEY = 'monefyi_password_recovery';
const ERROR_KEY = 'monefyi_password_recovery_error';

export interface RecoveryLocationSignal {
  recovery: boolean;
  error: string | null;
}

function paramsFrom(raw: string): URLSearchParams {
  return new URLSearchParams(raw.replace(/^[#?]/, ''));
}

/** Reads a Supabase recovery redirect without touching storage. */
export function recoverySignalFromLocation(hash: string, search: string): RecoveryLocationSignal {
  const hashParams = paramsFrom(hash);
  const searchParams = paramsFrom(search);
  const type = hashParams.get('type') || searchParams.get('type');
  const errorFlag = hashParams.get('error') || searchParams.get('error');
  const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
  const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

  let error: string | null = null;
  if (errorFlag || errorCode) {
    if (errorCode === 'otp_expired') {
      error = 'Tautan reset sudah kedaluwarsa. Minta tautan baru.';
    } else if (errorDescription) {
      error = errorDescription;
    } else {
      error = 'Tautan reset tidak valid. Minta tautan baru.';
    }
  }

  return { recovery: type === 'recovery', error };
}

function writeStorage(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Remember a recovery redirect before the Supabase client strips the URL hash. */
export function capturePasswordRecoveryIntent(): void {
  if (typeof window === 'undefined') return;
  const signal = recoverySignalFromLocation(window.location.hash, window.location.search);
  if (signal.recovery) writeStorage(INTENT_KEY, '1');
  if (signal.error) writeStorage(ERROR_KEY, signal.error);
}

export function markPasswordRecoveryIntent(): void {
  writeStorage(INTENT_KEY, '1');
}

export function hasPasswordRecoveryIntent(): boolean {
  if (typeof window === 'undefined') return false;
  if (recoverySignalFromLocation(window.location.hash, window.location.search).recovery) return true;
  return readStorage(INTENT_KEY) === '1';
}

export function readPasswordRecoveryError(): string | null {
  if (typeof window === 'undefined') return null;
  const live = recoverySignalFromLocation(window.location.hash, window.location.search).error;
  return live || readStorage(ERROR_KEY);
}

export function clearPasswordRecoveryIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
    sessionStorage.removeItem(ERROR_KEY);
  } catch {
    /* ignore */
  }
}

capturePasswordRecoveryIntent();
