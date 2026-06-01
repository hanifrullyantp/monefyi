import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import {
  DEFAULT_LANDING_CONTENT,
  mergeLandingContent,
  type LandingContent,
} from '../types/landingContent';

export const LANDING_SLUG = 'planner';

function landingFunctionHint(status: number): string {
  if (status === 404 || status === 502) {
    return ' Pastikan edge function monefyi-landing-config sudah di-deploy (./scripts/deploy-planner-supabase.sh).';
  }
  return '';
}

export async function fetchLandingContent(slug = LANDING_SLUG): Promise<LandingContent> {
  const base = config.supabaseUrl.replace(/\/$/, '');
  const res = await fetch(
    `${base}/functions/v1/monefyi-landing-config?slug=${encodeURIComponent(slug)}`,
    {
      headers: {
        apikey: config.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    },
  );
  if (!res.ok) {
    const hint = landingFunctionHint(res.status);
    if (import.meta.env.DEV) {
      console.warn(
        `[landing] GET monefyi-landing-config failed (HTTP ${res.status}).${hint} Using default content.`,
      );
    }
    if (res.status === 404 || res.status === 502) {
      throw new Error(`Landing config tidak tersedia (HTTP ${res.status}).${hint}`);
    }
    return { ...DEFAULT_LANDING_CONTENT };
  }
  const data = (await res.json()) as { content?: Partial<LandingContent> | null };
  return mergeLandingContent(data.content);
}

export async function saveLandingContent(
  content: LandingContent,
  slug = LANDING_SLUG,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('monefyi-landing-config', {
    body: { slug, content },
  });
  if (error) {
    const msg = error.message || 'Edge function error';
    const hint =
      /not found|failed to send|404|502/i.test(msg)
        ? ' Pastikan edge function monefyi-landing-config sudah di-deploy (./scripts/deploy-planner-supabase.sh).'
        : '';
    throw new Error(`${msg}${hint}`);
  }
  if (data?.error) throw new Error(String(data.error));
}
