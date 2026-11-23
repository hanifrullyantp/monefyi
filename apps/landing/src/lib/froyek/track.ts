"use client";

const SESSION_KEY = "froyek_anon_session";

function sessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = `froyek_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function consented(): boolean {
  return localStorage.getItem("froyek_cookie_ok") === "1";
}

/** Event tanpa data pribadi. Email dan telepon tidak ikut kecuali pengunjung mengizinkan cookie. */
export function trackFroyek(event: string, metadata: Record<string, string> = {}): void {
  if (typeof window === "undefined") return;
  const safe: Record<string, string> = { channel: "froyek" };
  const allowPersonal = consented();
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowPersonal && /email|phone|nama|name/i.test(key)) continue;
    safe[key] = value.slice(0, 180);
  }
  void fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId(),
      event,
      plan: "froyek",
      metadata: safe,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
