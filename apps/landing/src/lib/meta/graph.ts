import { createHmac } from "crypto";

/**
 * Mengekstrak kandidat token dari input (mengatasi masalah penggabungan token
 * saat pengguna melakukan paste berulang ke kolom input bertipe password, misal "EAAB...EAAG...").
 */
export function extractCandidateTokens(...rawInputs: (string | undefined)[]): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (val: string) => {
    const cleaned = val
      .replace(/^Bearer\s+/i, "")
      .replace(/["'\s\r\n]+/g, "")
      .trim();
    if (cleaned && cleaned.length >= 10 && !seen.has(cleaned)) {
      seen.add(cleaned);
      candidates.push(cleaned);
    }
  };

  for (const raw of rawInputs) {
    if (!raw) continue;
    const trimmed = raw.replace(/^Bearer\s+/i, "").replace(/["'\s\r\n]+/g, "").trim();
    if (!trimmed) continue;

    const eaaSegments = trimmed.match(/EAA[A-Za-z0-9+/=_|-]+?(?=EAA|$)/g);
    if (eaaSegments && eaaSegments.length > 1) {
      for (let i = eaaSegments.length - 1; i >= 0; i--) {
        addCandidate(eaaSegments[i]);
      }
    }
    addCandidate(trimmed);
  }

  return candidates;
}

/**
 * Membangun URL Meta Graph API v20.0 lengkap dengan access_token dan appsecret_proof opsional.
 */
export function buildGraphUrl(baseUrl: string, token: string, appSecret?: string): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  let url = `${baseUrl}${sep}access_token=${encodeURIComponent(token)}`;
  if (appSecret) {
    const proof = createHmac("sha256", appSecret).update(token).digest("hex");
    url += `&appsecret_proof=${proof}`;
  }
  return url;
}

/**
 * Wrapper fetch ke Meta Graph API dengan retry otomatis saat terkena rate-limit sementara.
 */
export async function graphFetchJson(
  baseUrl: string,
  token: string,
  options?: RequestInit,
  appSecret?: string,
  maxRetries: number = 2
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = buildGraphUrl(baseUrl, token, appSecret);
  let lastData: any = {};
  let lastStatus = 500;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        cache: "no-store",
      });
      lastStatus = res.status;
      lastData = await res.json().catch(() => ({}));

      const errCode = lastData?.error?.code;
      const isRateLimit = errCode === 4 || errCode === 17 || errCode === 32 || errCode === 613;
      if (res.ok && !lastData?.error) {
        return { ok: true, status: res.status, data: lastData };
      }
      if (!isRateLimit || attempt === maxRetries) {
        return { ok: false, status: res.status, data: lastData };
      }

      // Tunggu sebentar sebelum retry jika rate limit
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    } catch (err: any) {
      lastData = { error: { message: err?.message || "Network error contacting Meta Graph API" } };
      if (attempt === maxRetries) {
        return { ok: false, status: 500, data: lastData };
      }
    }
  }

  return { ok: false, status: lastStatus, data: lastData };
}

