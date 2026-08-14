/** Default URL mini app bonus — bisa dioverride per item di Admin → Bonus Apps */

const MONEFYI_ORIGIN = 'https://monefyi.com';

export const DEFAULT_BONUS_APP_URLS: Record<string, string> = {
  'bagi-hasil': `${MONEFYI_ORIGIN}/bonus/bagi-hasil/`,
  salary: `${MONEFYI_ORIGIN}/bonus/gaji/`,
  'debt-free': `${MONEFYI_ORIGIN}/bonus/debt-free/`,
  budget: `${MONEFYI_ORIGIN}/bonus/budget/`,
};

/** Resolve URL mini app: CMS override → default map → kosong */
export function resolveBonusAppUrl(app: { id: string; url?: string }): string {
  const trimmed = app.url?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_BONUS_APP_URLS[app.id] || '';
}
