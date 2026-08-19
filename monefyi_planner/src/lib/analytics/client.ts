import posthog from 'posthog-js';

let initialized = false;
let enabled = false;

function pickEnv(...keys: string[]): string {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export function resolvePostHogKey(): string {
  return pickEnv('VITE_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_KEY');
}

export function resolvePostHogHost(): string {
  return pickEnv('VITE_POSTHOG_HOST', 'NEXT_PUBLIC_POSTHOG_HOST') || 'https://app.posthog.com';
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function initAnalytics(
  userId: string,
  orgId: string,
  traits?: Record<string, unknown>,
): void {
  const key = resolvePostHogKey();
  if (!key) return;
  if (initialized) {
    posthog.identify(userId, { org_id: orgId, ...traits });
    posthog.group('organization', orgId, { org_id: orgId });
    return;
  }

  posthog.init(key, {
    api_host: resolvePostHogHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
  });

  posthog.identify(userId, { org_id: orgId, ...traits });
  posthog.group('organization', orgId, { org_id: orgId });
  initialized = true;
  enabled = true;
}

export function resetAnalytics(): void {
  if (enabled) posthog.reset();
  initialized = false;
  enabled = false;
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!enabled) {
    if (import.meta.env.DEV) {
      console.debug('[analytics]', event, properties);
    }
    return;
  }
  posthog.capture(event, properties);
}
