import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import {
  DEFAULT_LANDING_CONTENT,
  mergeLandingContent,
  type LandingContent,
} from '../types/landingContent';

export const LANDING_SLUG = 'planner';

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
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
}
