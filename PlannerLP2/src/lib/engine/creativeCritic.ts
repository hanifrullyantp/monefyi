/**
 * Kritik kreatif dan copy memakai model vision lewat OpenRouter.
 * Hasilnya adalah HIPOTESIS untuk Anda dan Expert, bukan dasar keputusan eksekusi:
 * keputusan pause tetap dari metrik (creativeAnalyzer).
 */
import type { AdRecord } from "@/lib/engine/adCreativeData";
import type { AdAnalysis } from "@/lib/engine/creativeAnalyzer";

export interface CreativeCritique {
  adId: string;
  adName: string;
  scores: { hook: number; clarity: number; proof: number; mobile: number } | null;
  strengths: string[];
  issues: string[];
  improvements: string[];
  headlineVariants: string[];
  primaryTextVariants: string[];
  model: string;
  error?: string;
}

const clamp10 = (n: unknown) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
const strArr = (v: unknown, max = 5) =>
  (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean).slice(0, max);

/** Ambil objek JSON dari balasan model (boleh dibungkus ```json). Murni, bisa diuji. */
export function parseCritiqueJson(text: string): Omit<CreativeCritique, "adId" | "adName" | "model"> | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(cleaned.slice(start, end + 1));
    const s = j.scores;
    return {
      scores: s ? { hook: clamp10(s.hook), clarity: clamp10(s.clarity), proof: clamp10(s.proof), mobile: clamp10(s.mobile) } : null,
      strengths: strArr(j.strengths),
      issues: strArr(j.issues),
      improvements: strArr(j.improvements),
      headlineVariants: strArr(j.headlineVariants, 5),
      primaryTextVariants: strArr(j.primaryTextVariants, 3),
    };
  } catch {
    return null;
  }
}

const SYSTEM = `Anda adalah creative strategist Meta Ads untuk Monefyi Estimator (estimator.monefyi.com): aplikasi hitung RAB/penawaran untuk kontraktor, interior designer, dan vendor kitchen set. Pesan inti: hitung harga akurat dalam 1 menit di HP saat survei, kirim PDF penawaran ke WhatsApp klien sebelum klien membandingkan dengan vendor lain.
Nilai kreatif dan copy iklan yang diberikan. Aturan:
- Bahasa Indonesia bisnis yang jelas. Tanpa emoji.
- Jangan mengarang angka hasil. Hanya rujuk metrik yang diberikan.
- Skor 0-10: hook (3 detik pertama menarik atau tidak), clarity (manfaat jelas), proof (ada bukti/angka/demonstrasi), mobile (terbaca di layar HP).
- Usulan headline maksimal 40 karakter, primary text maksimal 125 karakter di baris pertama. Pertahankan angle yang terbukti berhasil bila ada.
Balas HANYA JSON: {"scores":{"hook":0,"clarity":0,"proof":0,"mobile":0},"strengths":[],"issues":[],"improvements":[],"headlineVariants":[],"primaryTextVariants":[]}`;

export async function critiqueAd(input: {
  ad: AdRecord;
  analysis: AdAnalysis;
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<CreativeCritique> {
  const model = input.model || process.env.CREATIVE_VISION_MODEL || "google/gemini-2.5-flash";
  const { ad, analysis } = input;
  const out: CreativeCritique = {
    adId: ad.id, adName: ad.name, scores: null, strengths: [], issues: [], improvements: [], headlineVariants: [], primaryTextVariants: [], model,
  };
  if (!input.apiKey) return { ...out, error: "OpenRouter API key belum diisi." };

  const metrics = [
    `Status: ${ad.effectiveStatus}`,
    `Spend: Rp ${Math.round(ad.spend).toLocaleString("id-ID")}`,
    `Impresi: ${ad.impressions}`,
    `CTR link: ${ad.linkCtr.toFixed(2)}%`,
    analysis.hookRatePct !== null ? `Hook rate: ${analysis.hookRatePct}%` : null,
    analysis.holdRatePct !== null ? `Hold rate: ${analysis.holdRatePct}%` : null,
    `Frekuensi: ${ad.frequency.toFixed(1)}`,
    `Pembelian: ${ad.purchases}`,
    `Vonis metrik: ${analysis.verdict.kind}`,
    analysis.flags.length ? `Penanda: ${analysis.flags.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  const userText = `Judul iklan: ${ad.title || "(kosong)"}\nTeks utama: ${ad.body || "(kosong)"}\nCTA: ${ad.callToAction || "-"}\nJenis: ${ad.isVideo ? "video (gambar = thumbnail)" : "gambar"}\n\nMetrik:\n${metrics}`;
  const content: any[] = [{ type: "text", text: userText }];
  if (ad.imageUrl) content.push({ type: "image_url", image_url: { url: ad.imageUrl } });

  try {
    const res = await (input.fetchImpl || fetch)("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 900,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content }],
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ...out, error: json?.error?.message || `OpenRouter menolak (HTTP ${res.status}).` };
    const parsed = parseCritiqueJson(String(json?.choices?.[0]?.message?.content || ""));
    if (!parsed) return { ...out, error: "Balasan model tidak bisa dibaca sebagai JSON." };
    return { ...out, ...parsed };
  } catch (e: any) {
    return { ...out, error: e?.message || "Panggilan model gagal." };
  }
}

