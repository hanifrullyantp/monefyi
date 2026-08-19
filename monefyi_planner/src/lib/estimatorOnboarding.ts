const STORAGE_PREFIX = 'monefyi_estimator_onboarding_completed_';

export function getEstimatorOnboardingStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

/** Whether the user has finished (or dismissed) the estimator onboarding wizard. */
export function isEstimatorOnboardingCompleted(userId: string): boolean {
  try {
    return localStorage.getItem(getEstimatorOnboardingStorageKey(userId)) === 'true';
  } catch {
    return false;
  }
}

export function setEstimatorOnboardingCompleted(userId: string, completed = true): void {
  try {
    localStorage.setItem(getEstimatorOnboardingStorageKey(userId), completed ? 'true' : 'false');
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetEstimatorOnboarding(userId: string): void {
  setEstimatorOnboardingCompleted(userId, false);
}
