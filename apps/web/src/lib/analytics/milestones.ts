const MILESTONE_5_KEY = 'monefyi:milestone_5_shown';

export function isMilestone5Shown(): boolean {
  try {
    return localStorage.getItem(MILESTONE_5_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markMilestone5Shown(): void {
  try {
    localStorage.setItem(MILESTONE_5_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function shouldShowMilestone5Upsell(input: {
  estimationCountLast30Days: number;
  isEstimator: boolean;
  alreadyShown?: boolean;
}): boolean {
  if (!input.isEstimator) return false;
  if (input.alreadyShown ?? isMilestone5Shown()) return false;
  return input.estimationCountLast30Days === 5;
}
