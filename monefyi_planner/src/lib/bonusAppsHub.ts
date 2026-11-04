/** Etalase bonus mini app (Planner LP). */
export function bonusAppsHubUrl(): string {
  const fromEnv = import.meta.env.VITE_BONUS_HUB_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin.includes('estimator.')) return `${origin}/bonus`;
  return 'https://estimator.monefyi.com/bonus';
}
