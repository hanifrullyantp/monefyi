// src/lib/debt-calculator.ts
import type { DebtType, DebtItem, DebtTypeInfo, UrgencyLevel, DebtSummaryStats } from "@/types";

export const DEBT_TYPES_INFO: Record<DebtType, DebtTypeInfo> = {
  kartu_kredit: {
    label: "Kartu Kredit",
    icon: "CreditCard",
    bungaTipikal: 2.25,
    urgency: "kritis",
    warna: "red",
    tips: "Kartu kredit punya bunga tertinggi. Prioritaskan pelunasan segera!",
  },
  kta: {
    label: "KTA (Kredit Tanpa Agunan)",
    icon: "Banknote",
    bungaTipikal: 1.5,
    urgency: "tinggi",
    warna: "red",
    tips: "Bunga KTA cukup tinggi. Segera lunasi jika mampu.",
  },
  cicilan_barang: {
    label: "Cicilan Barang / Elektronik",
    icon: "ShoppingBag",
    bungaTipikal: 1.0,
    urgency: "sedang",
    warna: "amber",
    tips: "Cek bunga efektif, sering lebih tinggi dari yang tertulis.",
  },
  kpr: {
    label: "KPR (Kredit Rumah)",
    icon: "Home",
    bungaTipikal: 0.75,
    urgency: "rendah",
    warna: "blue",
    tips: "Bunga KPR relatif rendah dan aset apresiatif. Prioritas rendah untuk dilunasi cepat.",
  },
  kkb: {
    label: "KKB (Kredit Kendaraan)",
    icon: "Car",
    bungaTipikal: 0.83,
    urgency: "sedang",
    warna: "amber",
    tips: "Kendaraan aset depresiatif. Hindari kredit panjang.",
  },
  pinjol: {
    label: "Pinjaman Online",
    icon: "Smartphone",
    bungaTipikal: 3.0,
    urgency: "kritis",
    warna: "red",
    tips: "PALING BAHAYA. Prioritas #1 untuk dilunasi. Jangan gali lubang tutup lubang.",
  },
  koperasi: {
    label: "Koperasi",
    icon: "Building2",
    bungaTipikal: 1.5,
    urgency: "sedang",
    warna: "amber",
    tips: "Koperasi biasanya lebih terjangkau dari bank.",
  },
  utang_pribadi: {
    label: "Utang Pribadi (Teman)",
    icon: "Users",
    bungaTipikal: 0,
    urgency: "tinggi",
    warna: "amber",
    tips: "Meski bunga 0, prioritaskan untuk jaga hubungan sosial.",
  },
  utang_keluarga: {
    label: "Utang Keluarga",
    icon: "Heart",
    bungaTipikal: 0,
    urgency: "sedang",
    warna: "blue",
    tips: "Diskusi terbuka dengan keluarga untuk skema pembayaran.",
  },
  lainnya: {
    label: "Lainnya",
    icon: "MoreHorizontal",
    bungaTipikal: 1.0,
    urgency: "sedang",
    warna: "slate",
    tips: "Kategorisasi dengan jelas untuk tracking yang baik.",
  },
};

export function computeUrgency(bungaPerBulan: number): UrgencyLevel {
  if (bungaPerBulan > 2.5) return "kritis";
  if (bungaPerBulan > 1.5) return "tinggi";
  if (bungaPerBulan > 0.5) return "sedang";
  return "rendah";
}

export function getUrgencyColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case "kritis": return "red";
    case "tinggi": return "red";
    case "sedang": return "amber";
    case "rendah": return "blue";
    default: return "slate";
  }
}

export function computeDebtSummaryStats(
  debts: DebtItem[],
  penghasilanBersih: number
): DebtSummaryStats {
  const totalHutang = debts.reduce((sum, d) => sum + d.totalHutang, 0);
  const totalCicilanMinimum = debts.reduce((sum, d) => sum + d.cicilanMinimum, 0);
  const rasio = penghasilanBersih > 0 ? (totalCicilanMinimum / penghasilanBersih) * 100 : 0;

  const hutangTerbesar =
    debts.length > 0
      ? debts.reduce((max, d) => (d.totalHutang > max.totalHutang ? d : max), debts[0])
      : null;

  const bungaTertinggi =
    debts.length > 0
      ? debts.reduce((max, d) => (d.bungaPerBulan > max.bungaPerBulan ? d : max), debts[0])
      : null;

  const urgencyOrder: Record<UrgencyLevel, number> = {
    kritis: 0,
    tinggi: 1,
    sedang: 2,
    rendah: 3,
  };
  const hutangPalingUrgent =
    debts.length > 0
      ? debts.reduce((max, d) =>
          urgencyOrder[d.urgency] < urgencyOrder[max.urgency] ? d : max, debts[0])
      : null;

  return {
    totalHutang,
    jumlahHutang: debts.length,
    totalCicilanMinimum,
    rasioHutangTerhadapPenghasilan: rasio,
    hutangTerbesar,
    bungaTertinggi,
    hutangPalingUrgent,
  };
}
