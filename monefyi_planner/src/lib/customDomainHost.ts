/**
 * Custom domain host cookie — dibaca saat bootstrap jika hostname bukan default.
 * Edge middleware Vercel tidak diperlukan; SPA resolve via planner-resolve-domain.
 */
export const CUSTOM_HOST_COOKIE = 'monefyi_custom_host';

export function readCustomHostCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CUSTOM_HOST_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
