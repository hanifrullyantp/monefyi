import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const LIMITS: Record<string, { max: number; windowHours: number }> = {
  invitation_create: { max: 10, windowHours: 24 },
  join_request: { max: 5, windowHours: 24 },
};

export async function checkRateLimit(
  sb: SupabaseClient,
  userId: string,
  action: string,
): Promise<void> {
  const rule = LIMITS[action];
  if (!rule) return;

  const windowStart = new Date();
  windowStart.setUTCHours(Math.floor(windowStart.getUTCHours() / rule.windowHours) * rule.windowHours, 0, 0, 0);

  const { data: existing } = await sb
    .from("planner_rate_limits")
    .select("id, count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (existing && existing.count >= rule.max) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  if (existing) {
    await sb.from("planner_rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await sb.from("planner_rate_limits").insert({
      user_id: userId,
      action,
      count: 1,
      window_start: windowStart.toISOString(),
    });
  }
}
