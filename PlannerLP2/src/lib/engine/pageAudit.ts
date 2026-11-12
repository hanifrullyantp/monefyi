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

export interface PageSignals {
  ok: boolean;
  error?: string;
  url: string;
  title: string;
  prices: PriceMention[];
  hasOrderCta: boolean;
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
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { "User-Agent": "MonefyiEngine/1.0 (page audit)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fail(url.toString(), `Halaman mengembalikan status ${res.status}.`);
    const finalHost = new URL(res.url || url.toString()).hostname;
    if (!allowedHosts.has(finalHost)) return fail(url.toString(), "Redirect mengarah ke host yang tidak diizinkan.");

    const html = (await res.text()).slice(0, MAX_CHARS);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim().slice(0, 200);
    const hasOrderCta = /<(a|button)\b[^>]*>[^<]{0,60}(beli|order|pesan|checkout|daftar|mulai)/i.test(html);
    return { ok: true, url: url.toString(), title, prices: extractPagePrices(html), hasOrderCta };
  } catch (err: any) {
    return fail(
      url.toString(),
      err?.name === "TimeoutError" ? "Halaman tidak merespons dalam 8 detik." : "Gagal membaca halaman."
    );
  }
}
