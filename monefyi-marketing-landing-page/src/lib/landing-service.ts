import { MONEFYI_CONFIG } from './monefyi-config';
import { supabase } from './supabase';
import { INITIAL_SETTINGS } from '../data/initial-site-settings';
import { mergeSiteSettings } from './merge-site-settings';
import type { LandingCmsPayload } from '../types/landing-cms';

export const LANDING_SLUG = 'monefyi';
export const LANDING_CACHE_KEY = 'monefyi_landing_cache_v1';

export function buildDefaultPayload(): LandingCmsPayload {
  return {
    version: 1,
    settings: INITIAL_SETTINGS,
    textOverrides: {},
  };
}

export function mergeLandingPayload(raw: Partial<LandingCmsPayload> | null | undefined): LandingCmsPayload {
  const base = buildDefaultPayload();
  if (!raw || typeof raw !== 'object') return base;

  return {
    version: 1,
    settings: mergeSiteSettings(raw.settings),
    textOverrides: {
      ...base.textOverrides,
      ...(raw.textOverrides && typeof raw.textOverrides === 'object' ? raw.textOverrides : {}),
    },
  };
}

/** One-time read of legacy localStorage CMS (pre-Supabase). */
export function readLegacyLocalPayload(): LandingCmsPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const settingsRaw = localStorage.getItem('monefyi_v6_settings');
    const textRaw = localStorage.getItem('monefyi_lp_draft_v2');
    if (!settingsRaw && !textRaw) return null;
    return mergeLandingPayload({
      version: 1,
      settings: settingsRaw ? JSON.parse(settingsRaw) : undefined,
      textOverrides: textRaw ? JSON.parse(textRaw) : {},
    });
  } catch {
    return null;
  }
}

export function readCachedPayload(): LandingCmsPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LANDING_CACHE_KEY);
    if (!raw) return null;
    return mergeLandingPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeCachedPayload(payload: LandingCmsPayload): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANDING_CACHE_KEY, JSON.stringify(payload));
}

function landingFunctionHint(status: number): string {
  if (status === 404 || status === 502) {
    return ' Pastikan edge function monefyi-landing-config sudah di-deploy.';
  }
  return '';
}

export async function fetchLandingContent(slug = LANDING_SLUG): Promise<LandingCmsPayload | null> {
  const base = MONEFYI_CONFIG.supabaseUrl.replace(/\/$/, '');
  const res = await fetch(
    `${base}/functions/v1/monefyi-landing-config?slug=${encodeURIComponent(slug)}`,
    {
      headers: {
        apikey: MONEFYI_CONFIG.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn(
        `[landing] GET failed (HTTP ${res.status}).${landingFunctionHint(res.status)} Using cache/defaults.`
      );
    }
    return null;
  }

  const data = (await res.json()) as { content?: Partial<LandingCmsPayload> | null };
  if (!data.content) return null;
  return mergeLandingPayload(data.content);
}

export async function saveLandingContent(
  payload: LandingCmsPayload,
  slug = LANDING_SLUG
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('monefyi-landing-config', {
    body: { slug, content: payload },
  });

  if (error) {
    const msg = error.message || 'Edge function error';
    const hint = /not found|failed to send|404|502/i.test(msg) ? landingFunctionHint(502) : '';
    throw new Error(`${msg}${hint}`);
  }
  if (data?.error) throw new Error(String(data.error));
}
