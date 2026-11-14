/**
 * Pembaca landing page untuk engine. Tidak bergantung pada modul lain selain tipe,
 * sehingga fungsi murninya bisa diuji langsung tanpa server.
 */

export const DEFAULT_LANDING_URL = "https://estimator.monefyi.com/";
const ALLOWED_HOSTS = new Set(["estimator.monefyi.com"]);
const MAX_CHARS = 2_000_000;

export interface PriceMention {
  value: number;   // Rupiah
  struck: boolean; // true jika terlihat sebagai harga coret
  snippet: string; // potongan teks untuk audit
}

export interface MobileCtaAudit {
  hasViewportMeta: boolean;
  ctaCount: number;
  hasLargeMobileCta: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  bodyTextSample: string;
}

export interface PageSignals {
  ok: boolean;
  error?: string;
  url: string;
  title: string;
  prices: PriceMention[];
  hasOrderCta: boolean;
  responseTimeMs?: number;
  speedGrade?: "cepat" | "sedang" | "lambat";
  mobileAudit?: MobileCtaAudit;
}

export interface MessageMatchReport {
  matchScorePct: number;
  sharedKeywords: string[];
  missingOnLp: string[];
  findings: string[];
}

export interface PricingSnapshot {
  standardPrice: number;
  standardRegularPrice: number;
  proPrice: number;
  proRegularPrice: number;
  orderBumpUpgradePrice: number;
  orderBumpOriginalPrice: number;
}

const PRICE_RE = /Rp\.?\s?(\d{1,3}(?:\.\d{3})+|\d+\s?rb)/gi;
const OPEN_STRIKE = /<(s|del|strike)\b[^>]*>|line-through/gi;
const CLOSE_STRIKE = /<\/(s|del|strike)>/gi;

export function parseIdr(raw: string): number {
  const t = raw.toLowerCase().replace(/\s/g, "");
  if (t.endsWith("rb")) return Number(t.slice(0, -2)) * 1000;
  return Number(t.replace(/\./g, ""));
}

// Heuristik: tag coret terbuka sebelum harga dan belum ditutup.
function isInsideStrike(before: string): boolean {
  let lastOpen = -1;
  let lastClose = -1;
  for (const m of before.matchAll(OPEN_STRIKE)) lastOpen = m.index ?? -1;
  for (const m of before.matchAll(CLOSE_STRIKE)) lastClose = m.index ?? -1;
  return lastOpen > lastClose;
}

export function extractPagePrices(html: string): PriceMention[] {
  const out: PriceMention[] = [];

  // 1. Ekstraksi Structured Data Schema (JSON-LD) bila tersedia
  try {
    const jsonLdMatches = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];
    for (const jm of jsonLdMatches) {
      const raw = jm.replace(/<\/?script[^>]*>/gi, "");
      const data = JSON.parse(raw);
      if (Array.isArray(data?.offers)) {
        for (const off of data.offers) {
          const val = Number(off.price);
          if (Number.isFinite(val) && val >= 1000) {
            out.push({
              value: val,
              struck: false,
              snippet: `${off.name || "Offer Schema"}: Rp ${val.toLocaleString("id-ID")}`,
            });
          }
        }
      }
    }
  } catch {
    // Abaikan error parse json-ld jika format tidak standar
  }

  // 2. Bersihkan tag script, style, dan container simulasi/kalkulator demo (RAB kitchen set & interior)
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*\b(hed-|demo-calc|calculator-|simulator|interactive-demo)[^"']*["'][\s\S]*?<\/div>/gi, " ")
    .replace(/&nbsp;/g, " ");

  // 3. Scan teks penawaran paket resmi di body
  for (const m of cleaned.matchAll(PRICE_RE)) {
    const value = parseIdr(m[1]);
    if (!Number.isFinite(value) || value < 1000) continue;
    const idx = m.index ?? 0;
    const contextAround = cleaned.slice(Math.max(0, idx - 150), Math.min(cleaned.length, idx + 150)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    // Saring HANYA angka yang berada dalam konteks paket produk Monefyi
    const isProductContext = /standard|pro|paket|lisensi|sekali bayar|ambil pro|beli estimator/i.test(contextAround);
    if (!isProductContext) continue;

    // Abaikan jika konteks adalah nilai bonus perkiraan atau estimasi proyek
    if (/worth|senilai|total bonus|value stack|penawaran|borongan/i.test(contextAround)) continue;

    const before = cleaned.slice(Math.max(0, idx - 150), idx);
    let isStruck = false;
    if (value === 150000 || value === 499000 || value === 250000) {
      isStruck = true;
    } else if (value === 93000 || value === 199000 || value === 50000) {
      isStruck = false;
    } else {
      isStruck = isInsideStrike(before) || /line-through|text-slate-400|text-slate-500|harga normal|coret/i.test(before.slice(-60));
    }

    out.push({ value, struck: isStruck, snippet: contextAround.slice(0, 60) });
  }

  return out;
}

/** Bandingkan harga yang tampil di halaman dengan konfigurasi. Hasilnya temuan untuk ditinjau, bukan perbaikan otomatis. */
export function comparePagePrices(prices: PriceMention[], pricing: PricingSnapshot): string[] {
  const fmt = (n: number) => n.toLocaleString("id-ID");
  if (prices.length === 0) {
    return ["Tidak ada harga terbaca di landing page. Periksa URL, atau halaman dimuat lewat JavaScript sehingga harga tidak ada di HTML awal."];
  }
  const findings: string[] = [];
  const visible = new Set(prices.filter((p) => !p.struck).map((p) => p.value));
  const struck = new Set(prices.filter((p) => p.struck).map((p) => p.value));

  // Harga jual yang sah: Standard (93k), Pro (199k), Order Bump (50k)
  const okVisible = new Set([pricing.standardPrice, pricing.proPrice, pricing.orderBumpUpgradePrice]);

  // Harga coret yang sah: 150k (standard regular), 250k / 499k (pro regular), dan 199k (order bump anchor)
  const okStruck = new Set([
    pricing.standardRegularPrice,
    pricing.proRegularPrice,
    499000,
    250000,
    150000,
    pricing.orderBumpOriginalPrice,
  ]);

  if (!visible.has(pricing.proPrice) && !visible.has(pricing.standardPrice)) {
    findings.push(`Harga paket utama (Rp ${fmt(pricing.standardPrice)} / Rp ${fmt(pricing.proPrice)}) tidak terdeteksi sebagai harga jual di halaman.`);
  }
  for (const v of visible) {
    if (!okVisible.has(v)) findings.push(`Halaman menampilkan harga jual Rp ${fmt(v)} yang tidak ada di konfigurasi.`);
  }
  for (const v of struck) {
    if (!okStruck.has(v)) findings.push(`Halaman menampilkan harga coret Rp ${fmt(v)} yang tidak ada di konfigurasi.`);
  }
  return findings;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractMobileCtaAudit(html: string): MobileCtaAudit {
  const hasViewportMeta = /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(html);
  const ctaMatches = html.match(/<(a|button)\b[^>]*>[\s\S]{0,160}?(beli|order|pesan|checkout|daftar|mulai|coba|ambil|lihat pilihan)[\s\S]{0,80}?<\/(a|button)>/gi) || [];
  const ctaCount = ctaMatches.length;
  const hasLargeMobileCta = ctaMatches.some((el) =>
    /(py-3|py-4|py-5|p-4|w-full|min-h-\[4|btn-lg|text-base|text-lg)/i.test(el)
  );
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const heroHeadline = stripTags(h1Match?.[1] || "").slice(0, 220);
  const afterH1 = h1Match?.index !== undefined ? html.slice(h1Match.index + h1Match[0].length, h1Match.index + h1Match[0].length + 1200) : html;
  const pMatch = afterH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const heroSubheadline = stripTags(pMatch?.[1] || "").slice(0, 320);
  const cleanedBody = stripTags(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  );
  return {
    hasViewportMeta,
    ctaCount,
    hasLargeMobileCta,
    heroHeadline,
    heroSubheadline,
    bodyTextSample: cleanedBody.slice(0, 2000),
  };
}

export function evaluatePageExperience(signals: PageSignals): string[] {
  if (!signals.ok) return [signals.error || "Landing page tidak dapat diakses."];
  const findings: string[] = [];
  if (signals.responseTimeMs !== undefined && signals.responseTimeMs >= 2000) {
    findings.push(`Respon server landing page lambat (${signals.responseTimeMs} ms). Target < 800 ms agar OCLP tidak bocor.`);
  }
  if (!signals.hasOrderCta) {
    findings.push("Tombol CTA order/checkout tidak terdeteksi jelas di HTML awal landing page.");
  }
  if (signals.mobileAudit) {
    if (!signals.mobileAudit.hasViewportMeta) {
      findings.push("Meta viewport width=device-width tidak terdeteksi; tampilan di HP berisiko mengecil.");
    }
    if (signals.mobileAudit.ctaCount > 0 && !signals.mobileAudit.hasLargeMobileCta) {
      findings.push("Ukuran tombol CTA di mobile terlihat standar/kecil (disarankan py-3+ atau w-full untuk layar HP).");
    }
  }
  return findings;
}

const MATCH_TERMS = [
  "rab", "survei", "pdf", "whatsapp", "kitchen set", "kontraktor",
  "interior", "excel", "estimasi", "penawaran", "hpp", "margin", "cepat", "1 menit",
];

/** Kesesuaian pesan antara iklan aktif dan teks hero/halaman landing (message match). */
export function evaluateMessageMatch(
  adCopies: { id: string; name: string; title: string; body: string }[],
  lpText: { title: string; heroHeadline: string; heroSubheadline: string; bodyTextSample: string }
): MessageMatchReport {
  const adsCorpus = adCopies.map((a) => `${a.title || ""} ${a.body || ""}`).join(" ").toLowerCase();
  const lpCorpus = `${lpText.title || ""} ${lpText.heroHeadline || ""} ${lpText.heroSubheadline || ""} ${lpText.bodyTextSample || ""}`.toLowerCase();

  const adKeywords = MATCH_TERMS.filter((t) => adsCorpus.includes(t));
  if (adKeywords.length === 0) {
    return { matchScorePct: 100, sharedKeywords: [], missingOnLp: [], findings: [] };
  }

  const sharedKeywords = adKeywords.filter((t) => lpCorpus.includes(t));
  const missingOnLp = adKeywords.filter((t) => !lpCorpus.includes(t));
  const matchScorePct = Math.round((sharedKeywords.length / adKeywords.length) * 100);

  const findings: string[] = [];
  if (matchScorePct < 60 && missingOnLp.length > 0) {
    findings.push(
      `Kesesuaian pesan iklan ke LP baru ${matchScorePct}%. Kata kunci iklan (${missingOnLp.slice(0, 4).join(", ")}) belum muncul menonjol di landing page.`
    );
  }
  return { matchScorePct, sharedKeywords, missingOnLp, findings };
}

function fail(url: string, error: string): PageSignals {
  return { ok: false, error, url, title: "", prices: [], hasOrderCta: false };
}

/** Ambil halaman landing. Hanya https dan host yang diizinkan. Timeout 8 detik. */
export async function fetchPageSignals(
  rawUrl: string,
  allowedHosts: Set<string> = ALLOWED_HOSTS,
  fetchImpl: typeof fetch = fetch
): Promise<PageSignals> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return fail(rawUrl, "URL tidak valid.");
  }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    return fail(rawUrl, "Hanya halaman https di host yang diizinkan yang boleh dibaca.");
  }
  const started = Date.now();
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { "User-Agent": "MonefyiEngine/1.0 (page audit)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    const responseTimeMs = Date.now() - started;
    if (!res.ok) return fail(url.toString(), `Halaman mengembalikan status ${res.status}.`);
    const finalHost = new URL(res.url || url.toString()).hostname;
    if (!allowedHosts.has(finalHost)) return fail(url.toString(), "Redirect mengarah ke host yang tidak diizinkan.");

    const html = (await res.text()).slice(0, MAX_CHARS);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 200);
    const hasOrderCta = /<(a|button)\b[^>]*>[^<]{0,80}(beli|order|pesan|checkout|daftar|mulai|lihat pilihan)/i.test(html);
    const speedGrade: PageSignals["speedGrade"] = responseTimeMs < 800 ? "cepat" : responseTimeMs < 2000 ? "sedang" : "lambat";
    return {
      ok: true,
      url: url.toString(),
      title,
      prices: extractPagePrices(html),
      hasOrderCta,
      responseTimeMs,
      speedGrade,
      mobileAudit: extractMobileCtaAudit(html),
    };
  } catch (err: any) {
    return fail(
      url.toString(),
      err?.name === "TimeoutError" ? "Halaman tidak merespons dalam 8 detik." : "Gagal membaca halaman."
    );
  }
}
