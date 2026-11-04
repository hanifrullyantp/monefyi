function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function mayarApiBaseUrl(): string {
  return pickEnv("MAYAR_API_URL", "https://api.mayar.id").replace(/\/$/, "");
}

function mayarApiKey(): string {
  return pickEnv("MAYAR_API_KEY");
}

export type MayarApiResult = {
  ok: boolean;
  status: number;
  body: Record<string, unknown> | null;
  error?: string;
};

export async function mayarApiRequest(
  method: string,
  pathname: string,
  body?: Record<string, unknown>,
): Promise<MayarApiResult> {
  const apiKey = mayarApiKey();
  if (!apiKey) {
    return { ok: false, status: 500, body: null, error: "MAYAR_API_KEY not configured" };
  }

  const url = `${mayarApiBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let parsed: Record<string, unknown> | null = null;
  try {
    const raw = await res.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      parsed = raw as Record<string, unknown>;
    }
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg = String(parsed?.message ?? parsed?.error ?? res.statusText);
    return { ok: false, status: res.status, body: parsed, error: msg };
  }

  return { ok: true, status: res.status, body: parsed };
}

/** Extract checkout / payment URL from Mayar create-payment responses. */
export function extractMayarPaymentUrl(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const data = (body.data && typeof body.data === "object")
    ? body.data as Record<string, unknown>
    : body;
  const candidates = [
    data.linkPayment,
    data.paymentLink,
    data.link,
    data.url,
    data.checkoutUrl,
    data.redirectUrl,
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s.startsWith("http")) return s;
  }
  return "";
}

export function extractMayarPaymentId(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const data = (body.data && typeof body.data === "object")
    ? body.data as Record<string, unknown>
    : body;
  return String(data.id ?? data.paymentId ?? body.id ?? "").trim();
}
