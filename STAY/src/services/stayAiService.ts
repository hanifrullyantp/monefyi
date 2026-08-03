import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { StayAiContext } from '../utils/aiContext';
import { contextToPrompt, buildKeywordReply } from '../utils/aiContext';

function getStayAiFnUrl(): string | undefined {
  const explicit = import.meta.env.VITE_STAY_AI_FN_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/stay-ai`;
  }
  return undefined;
}

/**
 * Ask STAY AI — Gemini via Edge Function when configured, keyword fallback otherwise.
 */
export async function askStayAi(message: string, ctx: StayAiContext): Promise<string> {
  const fnUrl = getStayAiFnUrl();

  if (fnUrl && isSupabaseConfigured && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          context: contextToPrompt(ctx),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) return data.reply as string;
      }
    } catch (err) {
      console.error('stay-ai request failed:', err);
    }
  }

  return buildKeywordReply(message, ctx);
}
