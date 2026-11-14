/**
 * Fase 3: Analisa Copywriting & Sudut Pandang (Angle) Iklan.
 * Murni (tanpa I/O): mengelompokkan copy iklan berdasar angle, menentukan angle paling efisien,
 * menghasilkan 3-5 varian copy baru berbasis angle menang, dan menyusun brief produksi kreatif.
 */
import type { AdRecord } from "@/lib/engine/adCreativeData";
import { generateWinningAdLocally, type GenerateAdParams } from "@/lib/services/marketingAgentService";
import type { WinningAdTemplate } from "@/lib/types/marketing";

export type CopyAngle =
  | "pain_tekor"
  | "kecepatan_survei"
  | "bukti_profesional"
  | "harga_promo"
  | "umum";

export const ANGLE_LABEL: Record<CopyAngle, string> = {
  pain_tekor: "Anti Boncos / Salah Hitung RAB",
  kecepatan_survei: "Hitung 1 Menit & Kirim PDF di Survei",
  bukti_profesional: "Citra Profesional & Margin Terkunci",
  harga_promo: "Penawaran Harga & Hemat",
  umum: "Umum",
};

const ANGLE_KEYWORDS: Record<Exclude<CopyAngle, "umum">, RegExp> = {
  pain_tekor: /tekor|boncos|rugi|nomboki|salah hitung|excel rumit|bocor|ghosting|dighosting|kalah tender/i,
  kecepatan_survei: /survei|1 menit|di hp|kirim pdf|sebelum pulang|kilat|otomatis|tanpa laptop|7 menit/i,
  bukti_profesional: /berlogo|profesional|margin|hpp|dipercaya|elegan|klien percaya|rapi|kop nama/i,
  harga_promo: /promo|diskon|hemat|sekali bayar|gratis|rp\s?93|rp\s?199|lisensi|seumur hidup/i,
};

export function classifyCopyAngle(title: string, body: string): CopyAngle {
  const combined = `${title || ""} ${body || ""}`;
  if (!combined.trim()) return "umum";

  let best: CopyAngle = "umum";
  let bestHits = 0;
  for (const angle of Object.keys(ANGLE_KEYWORDS) as Exclude<CopyAngle, "umum">[]) {
    const matches = combined.match(new RegExp(ANGLE_KEYWORDS[angle].source, "gi"));
    const hits = matches ? matches.length : 0;
    if (hits > bestHits) {
      bestHits = hits;
      best = angle;
    }
  }
  return best;
}

export interface AngleStats {
  angle: CopyAngle;
  label: string;
  adCount: number;
  spend: number;
  impressions: number;
  linkClicks: number;
  purchases: number;
  weightedCtrPct: number;
  cpa: number | null;
  topAdId: string | null;
  topAdName: string | null;
}

export interface CopyVariantProposal {
  angle: CopyAngle;
  angleLabel: string;
  headline: string;
  primaryText: string;
  rationale: string;
}

export interface CopyAnalysisReport {
  angles: AngleStats[];
  winningAngle: CopyAngle | null;
  winningReason: string;
  variants: CopyVariantProposal[];
  brief: WinningAdTemplate | null;
}

const ANGLE_TEMPLATES: Record<CopyAngle, { headlines: string[]; bodies: string[] }> = {
  kecepatan_survei: {
    headlines: [
      "Hitung RAB 1 Menit di HP Saat Survei",
      "Kirim PDF Penawaran Sebelum Pulang",
      "Klien Minta Harga? Langsung Jadi di HP",
      "Tanpa Laptop: RAB Kitchen Set 1 Menit",
      "Menang Closing Cepat Saat Survei Lokasi",
    ],
    bodies: [
      "Masih bawa catatan kertas saat survei lalu lembur sampai malam di Excel? Dengan Monefyi Estimator, cukup input ukuran di HP saat survei lokasi dan kirim PDF penawaran berlogo ke WA klien sebelum pulang.",
      "Sering kalah cepat karena vendor sebelah sudah kirim harga duluan? Hitung HPP bahan + upah tukang akurat dalam 1 menit langsung di HP saat survei, lalu kirim PDF penawaran rapi saat itu juga.",
      "Tidak perlu tunggu sampai kantor untuk hitung penawaran proyek. Pilih template di Monefyi Estimator, masukkan ukuran, PDF penawaran siap kirim ke WhatsApp klien sebelum Anda beranjak dari lokasi.",
    ],
  },
  pain_tekor: {
    headlines: [
      "Stop Proyek Tekor Karena Salah Rumus",
      "Anti Boncos Hitung HPP Bahan & Tukang",
      "Kunci Laba Proyek Sebelum Deal Klien",
      "Jangan Nomboki Proyek Lagi Pakai Excel",
      "Cek HPP Akurat Sebelum Kirim Harga",
    ],
    bodies: [
      "Proyek terlihat ramai tapi pas tutup buku malah tekor? Sering kali kebocoran terjadi di HPP material dan upah borongan yang terlewat di Excel manual. Kunci margin laba proyek Anda dengan Monefyi Estimator.",
      "Satu kesalahan rumus Excel bisa bikin tekor jutaan rupiah beli material. Gunakan Monefyi Estimator: perhitungan bahan, aksesoris, dan upah tukang terstruktur otomatis langsung dari HP.",
      "Berhenti membuang waktu berjam-jam membuat RAB yang akhirnya dighosting klien atau bikin rugi di akhir proyek. Hitung biaya modal riil secara akurat dalam hitungan menit dengan Monefyi Estimator.",
    ],
  },
  bukti_profesional: {
    headlines: [
      "Penawaran PDF Berlogo Usaha Sendiri",
      "Klien Lebih Percaya Penawaran Rapi",
      "Kunci Margin 25-30% Tiap Proyek",
      "Standar Baru Kontraktor & Interior",
      "Saring Klien Serius Sejak Penawaran",
    ],
    bodies: [
      "Klien proyek besar menilai keseriusan vendor dari kerapian penawaran pertamanya. Dengan Monefyi Estimator, Anda langsung menghasilkan PDF penawaran berlogo usaha sendiri yang detail dan meyakinkan langsung dari HP.",
      "Naikkan kelas layanan kontraktor dan workshop interior Anda. Setiap rincian pekerjaan, volume, material, dan margin keuntungan terhitung rapi dalam PDF siap kirim ke WhatsApp owner.",
      "Tinggalkan penawaran tulis tangan atau chat WA berantakan. Kirim dokumen PDF penawaran profesional berlogo brand Anda sendiri agar klien yakin dan cepat memutuskan DP.",
    ],
  },
  harga_promo: {
    headlines: [
      "Lisensi Sekali Bayar Tanpa Langganan",
      "Hemat Biaya Operasional Hitung RAB",
      "Akses Estimator Kontraktor Sekali Bayar",
      "Software RAB Praktis Mulai Rp 93 Ribu",
      "Investasi Sekali Pakai Selamanya di HP",
    ],
    bodies: [
      "Cukup bayar satu kali tanpa biaya bulanan yang membebani kas proyek. Monefyi Estimator membantu kontraktor dan vendor interior menghitung RAB cepat dan mengirim PDF penawaran profesional dari HP.",
      "Bandingkan biaya satu kali kesalahan hitung di Excel dengan lisensi Monefyi Estimator yang hanya sekali bayar. Mulai dari Rp 93.000 untuk Standard atau Rp 199.000 untuk fitur lengkap Pro.",
      "Amankan harga promo sekali bayar Monefyi Estimator sekarang. Semua template RAB bangunan & kitchen set siap pakai langsung dari smartphone Anda saat survei lokasi.",
    ],
  },
  umum: {
    headlines: [
      "Hitung RAB Cepat & Akurat di HP",
      "Aplikasi Penawaran Kontraktor & Interior",
      "Kirim PDF Penawaran Langsung ke WA Klien",
    ],
    bodies: [
      "Monefyi Estimator membantu kontraktor dan desainer interior menghitung RAB material dan upah tukang dalam hitungan menit di HP, lalu mengirim PDF penawaran berlogo ke WhatsApp klien.",
      "Tinggalkan cara manual yang rawan salah hitung. Gunakan Monefyi Estimator untuk menyusun estimasi biaya dan penawaran proyek lebih cepat dan rapi langsung saat survei.",
    ],
  },
};

export function analyzeAdCopyVariants(
  ads: AdRecord[],
  opt?: { targetCpa?: number; existingVariants?: string[] }
): CopyAnalysisReport {
  const byAngle = new Map<CopyAngle, AdRecord[]>();
  for (const a of ads) {
    const angle = classifyCopyAngle(a.title, a.body);
    const list = byAngle.get(angle) || [];
    list.push(a);
    byAngle.set(angle, list);
  }

  const angles: AngleStats[] = [];
  for (const [angle, list] of byAngle.entries()) {
    const spend = list.reduce((s, a) => s + a.spend, 0);
    const impressions = list.reduce((s, a) => s + a.impressions, 0);
    const linkClicks = list.reduce((s, a) => s + a.linkClicks, 0);
    const purchases = list.reduce((s, a) => s + a.purchases, 0);
    const weightedCtrPct = impressions > 0 ? Math.round(((linkClicks / impressions) * 100) * 100) / 100 : 0;
    const cpa = purchases > 0 ? Math.round(spend / purchases) : null;
    const sorted = [...list].sort((x, y) => {
      if (y.purchases !== x.purchases) return y.purchases - x.purchases;
      if (y.linkCtr !== x.linkCtr) return y.linkCtr - x.linkCtr;
      return y.spend - x.spend;
    });
    angles.push({
      angle,
      label: ANGLE_LABEL[angle],
      adCount: list.length,
      spend: Math.round(spend),
      impressions,
      linkClicks,
      purchases,
      weightedCtrPct,
      cpa,
      topAdId: sorted[0]?.id ?? null,
      topAdName: sorted[0]?.name ?? null,
    });
  }

  // Urutkan: angle dengan pembelian dan CPA terendah lebih unggul, lalu CTR tertimbang tertinggi
  angles.sort((a, b) => {
    if (a.purchases > 0 && b.purchases === 0) return -1;
    if (b.purchases > 0 && a.purchases === 0) return 1;
    if (a.purchases > 0 && b.purchases > 0 && a.cpa !== null && b.cpa !== null && a.cpa !== b.cpa) {
      return a.cpa - b.cpa;
    }
    if (b.weightedCtrPct !== a.weightedCtrPct) return b.weightedCtrPct - a.weightedCtrPct;
    return b.spend - a.spend;
  });

  const bestWithTraffic = angles.find((a) => a.impressions > 0) || angles[0] || null;
  const winningAngle: CopyAngle | null = bestWithTraffic ? bestWithTraffic.angle : "kecepatan_survei";
  const winningReason = bestWithTraffic
    ? bestWithTraffic.purchases > 0
      ? `Angle "${bestWithTraffic.label}" mencatat ${bestWithTraffic.purchases} pembelian dengan CPA Rp ${(bestWithTraffic.cpa ?? 0).toLocaleString("id-ID")} dan CTR link ${bestWithTraffic.weightedCtrPct.toFixed(2)}%.`
      : `Angle "${bestWithTraffic.label}" memiliki CTR link tertinggi (${bestWithTraffic.weightedCtrPct.toFixed(2)}%) dari ${bestWithTraffic.impressions.toLocaleString("id-ID")} impresi.`
    : "Belum ada data iklan aktif; memakai angle inti kecepatan survei.";

  const pool = ANGLE_TEMPLATES[winningAngle];
  const existingSet = new Set((opt?.existingVariants || []).map((t) => t.trim().toLowerCase()));
  const variants: CopyVariantProposal[] = [];

  for (let i = 0; i < pool.headlines.length; i++) {
    const headline = pool.headlines[i];
    const primaryText = pool.bodies[i % pool.bodies.length];
    if (existingSet.has(headline.toLowerCase())) continue;
    variants.push({
      angle: winningAngle,
      angleLabel: ANGLE_LABEL[winningAngle],
      headline,
      primaryText,
      rationale: winningReason,
    });
    if (variants.length >= 4) break;
  }

  // Susun brief kreatif berbasis angle yang menang menggunakan marketingAgentService
  const angleToAgent: Record<CopyAngle, GenerateAdParams["angle"]> = {
    pain_tekor: "takut_rugi_proyek",
    kecepatan_survei: "efisiensi_rab_cepat",
    bukti_profesional: "standar_profesional",
    harga_promo: "kalah_tender",
    umum: "efisiensi_rab_cepat",
  };
  const brief = generateWinningAdLocally({
    targetNiche: ads.some((a) => /kitchen|interior/i.test(`${a.name} ${a.body}`)) ? "interior_kitchen" : "kontraktor_umum",
    angle: angleToAgent[winningAngle],
    format: "reels_ugc_9_16",
  });

  return {
    angles,
    winningAngle,
    winningReason,
    variants,
    brief,
  };
}

