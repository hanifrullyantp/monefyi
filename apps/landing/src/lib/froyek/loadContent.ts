import { resolveSupabaseEnv } from "@/lib/supabase/env";
import { defaultFroyekContent } from "./defaultContent";
import { froyekContentSchema, type FroyekContent, type PromoCode } from "./schema";

export const FROYEK_SLUG = "froyek";

export async function loadFroyekPublished(): Promise<FroyekContent> {
  const { url, anonKey } = resolveSupabaseEnv();
  if (!url || !anonKey) return defaultFroyekContent;
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/functions/v1/monefyi-landing-config?slug=${FROYEK_SLUG}`,
      {
        headers: { apikey: anonKey },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return defaultFroyekContent;
    const data = (await res.json()) as { content?: unknown };
    const parsed = froyekContentSchema.safeParse(data.content);
    return parsed.success ? parsed.data : defaultFroyekContent;
  } catch {
    return defaultFroyekContent;
  }
}

export async function loadFroyekPromos(): Promise<PromoCode[]> {
  const content = await loadFroyekPublished();
  return content.promos;
}
