/**
 * Single source of truth for Estimator landing pricing.
 * Semua UI (cards, FAQ, CTA, urgency) harus baca dari sini.
 */

/** Satu flag untuk klaim “3 estimasi gratis” di hero/header. */
export { FREE_PLAN_ENABLED } from "@/lib/content/heroCopy";

export type EstimatorPlanId = "free" | "estimator-standard" | "estimator-pro";

export type EstimatorPlan = {
  id: EstimatorPlanId;
  lynkProduct: "estimator_standard" | "estimator_pro" | null;
  badge: string;
  title: string;
  subtitle: string;
  /** Harga jual (IDR number) */
  priceIdr: number;
  /** Harga coret opsional — hanya jika promo nyata */
  originalPriceIdr: number | null;
  pricePeriod: string;
  priceNote: string;
  highlighted: boolean;
  popular?: boolean;
  ctaText: string;
  fitFor: string;
  features: { text: string; included: boolean }[];
  whyChoose: string[];
};

export const ESTIMATOR_PLANS: EstimatorPlan[] = [
  {
    id: "free",
    lynkProduct: null,
    badge: "COBA DULU",
    title: "Gratis",
    subtitle: "Coba alur survei → PDF tanpa kartu",
    priceIdr: 0,
    originalPriceIdr: null,
    pricePeriod: "Gratis selamanya",
    priceNote: "3 estimasi · PDF berwatermark",
    highlighted: false,
    ctaText: "Mulai Hitung Gratis",
    fitFor: "Freelancer yang ingin coba sebelum bayar",
    whyChoose: [
      "3 estimasi gratis",
      "PDF penawaran berwatermark Estimator",
      "Tanpa kartu kredit",
    ],
    features: [
      { text: "Estimator harga proyek", included: true },
      { text: "3 estimasi / akun", included: true },
      { text: "PDF penawaran (watermark)", included: true },
      { text: "Custom logo & tanda tangan", included: false },
      { text: "Riwayat penawaran", included: false },
      { text: "Kustom pricelist", included: false },
    ],
  },
  {
    id: "estimator-standard",
    lynkProduct: "estimator_standard",
    title: "Estimator Standard",
    subtitle: "Hitung harga cepat & akurat tanpa batas",
    priceIdr: 99_000,
    originalPriceIdr: null,
    pricePeriod: "Sekali bayar",
    priceNote: "Akses selamanya",
    highlighted: true,
    popular: true,
    badge: "PALING POPULER",
    ctaText: "Ambil Standard — Rp 99.000",
    fitFor: "Freelancer & perorangan yang butuh hitung cepat",
    whyChoose: [
      "Estimasi unlimited",
      "Template PDF standar",
      "Script WA screening",
    ],
    features: [
      { text: "Estimator harga (unlimited)", included: true },
      { text: "Template PDF penawaran standar", included: true },
      { text: "Script WA screening klien", included: true },
      { text: "Database material lokal", included: true },
      { text: "Custom logo di penawaran", included: false },
      { text: "Tanda tangan di PDF", included: false },
      { text: "Generator kwitansi", included: false },
      { text: "Support WA prioritas", included: false },
    ],
  },
  {
    id: "estimator-pro",
    lynkProduct: "estimator_pro",
    badge: "BRANDING LENGKAP",
    title: "Estimator Pro",
    subtitle: "Branding penuh + kwitansi untuk closing lebih rapi",
    priceIdr: 199_000,
    originalPriceIdr: null,
    pricePeriod: "Sekali bayar",
    priceNote: "Akses selamanya · Upgrade dari Standard bayar selisih Rp 100.000",
    highlighted: false,
    ctaText: "Ambil Pro — Rp 199.000",
    fitFor: "Kontraktor yang ingin penawaran berlogo sendiri",
    whyChoose: [
      "PDF premium + logo & tanda tangan",
      "Generator kwitansi",
      "Riwayat + kustom pricelist",
    ],
    features: [
      { text: "Semua fitur Standard", included: true },
      { text: "Template PDF premium", included: true },
      { text: "Custom branding & logo", included: true },
      { text: "Tanda tangan gambar di PDF", included: true },
      { text: "Generator kwitansi Pro", included: true },
      { text: "Simpan riwayat penawaran", included: true },
      { text: "Kustom pricelist material", included: true },
      { text: "Support WhatsApp prioritas", included: true },
    ],
  },
];

export const UPGRADE_DELTA_IDR = 100_000;

export function formatIdr(amount: number): string {
  if (amount <= 0) return "Gratis";
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export function getPlan(id: EstimatorPlanId): EstimatorPlan {
  return ESTIMATOR_PLANS.find((p) => p.id === id) ?? ESTIMATOR_PLANS[0];
}

export const PRICING_FOOTNOTE =
  "Bayar via QRIS/BCA/Mandiri/GoPay · Akses langsung setelah bayar · Sekali bayar, tanpa langganan";
