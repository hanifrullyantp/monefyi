/**
 * Lynk.id webhook signature (official):
 * SHA256( amount + refId + message_id + merchantKey ) as hex
 * Header: X-Lynk-Signature
 * amount = totals.grandTotal (string concatenation)
 */

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

export function lynkMerchantKeys(): string[] {
  const keys = [
    pickEnv("LYNK_MERCHANT_KEY"),
    pickEnv("LYNK_WEBHOOK_SECRET"),
    pickEnv("LYNK_SIGNATURE_TOKEN"),
    pickEnv("PLANNER_LYNK_SIGNATURE_TOKEN"),
  ].filter(Boolean);
  return [...new Set(keys)];
}

export function lynkSignatureFields(payload: Record<string, unknown>): {
  refId: string;
  amount: string;
  messageId: string;
} {
  const data = (payload.data && typeof payload.data === "object")
    ? payload.data as Record<string, unknown>
    : payload;
  const messageData = (data.message_data && typeof data.message_data === "object")
    ? data.message_data as Record<string, unknown>
    : {};
  const totals = (messageData.totals && typeof messageData.totals === "object")
    ? messageData.totals as Record<string, unknown>
    : {};
  const amount = String(
    totals.grandTotal ?? totals.customerPay ?? totals.totalPrice ?? "",
  );
  const refId = String(messageData.refId ?? messageData.ref_id ?? "");
  const messageId = String(data.message_id ?? payload.message_id ?? "");
  return { refId, amount, messageId };
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hitung signature untuk uji curl / Postman. */
export async function computeLynkSignature(
  refId: string,
  amount: string,
  messageId: string,
  merchantKey: string,
): Promise<string> {
  return sha256Hex(`${amount}${refId}${messageId}${merchantKey}`);
}

export async function verifyLynkWebhookPayload(
  payload: Record<string, unknown>,
  req: Request,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const received = (
    req.headers.get("X-Lynk-Signature")
    || req.headers.get("x-lynk-signature")
    || ""
  ).trim().toLowerCase();

  const keys = lynkMerchantKeys();
  const requireSig = pickEnv("REQUIRE_LYNK_SIGNATURE", "true").toLowerCase() === "true";

  if (keys.length === 0) {
    if (requireSig) {
      return { ok: false, status: 500, error: "LYNK_MERCHANT_KEY not configured" };
    }
    console.warn("Lynk webhook: no merchant key — accepting unsigned (dev only)");
    return { ok: true };
  }

  if (!received) {
    return { ok: false, status: 401, error: "Missing X-Lynk-Signature" };
  }

  const { refId, amount, messageId } = lynkSignatureFields(payload);
  if (!refId || !messageId || amount === "") {
    return { ok: false, status: 400, error: "Missing refId, grandTotal, or message_id for signature" };
  }

  for (const key of keys) {
    const calculated = await computeLynkSignature(refId, amount, messageId, key);
    if (calculated === received) return { ok: true };
  }

  return { ok: false, status: 401, error: "Invalid signature" };
}
