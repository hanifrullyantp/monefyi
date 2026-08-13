// src/lib/debt-insights.ts
import type {
  DebtItem,
  IncomeAllocation,
  PayoffResult,
  DebtCoachInsight,
} from "@/types";
import { formatCurrency, formatMonths } from "./formatters";

export function generateDebtInsights(
  debts: DebtItem[],
  income: IncomeAllocation,
  result: PayoffResult
): DebtCoachInsight[] {
  const insights: DebtCoachInsight[] = [];
  const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);
  const totalHutang = debts.reduce((s, d) => s + d.totalHutang, 0);
  const dtiRatio =
    income.penghasilanBersih > 0
      ? (totalMinimum / income.penghasilanBersih) * 100
      : 0;

  // ═══════════════════════════════════════
  // WARNING insights (urgency: high)
  // ═══════════════════════════════════════

  if (income.alokasiBayarHutang < totalMinimum && totalMinimum > 0) {
    const kekurangan = totalMinimum - income.alokasiBayarHutang;
    insights.push({
      tipe: "warning",
      judul: "Alokasi tidak cukup untuk cicilan minimum!",
      pesan: `Anda kekurangan ${formatCurrency(kekurangan)}. Ini akan menyebabkan denda dan bunga bertambah. Solusi: tambah income atau negosiasi restrukturisasi dengan kreditur.`,
      aksi: "Atur ulang alokasi",
      urgency: "high",
      iconName: "AlertTriangle",
    });
  }

  if (dtiRatio > 40) {
    insights.push({
      tipe: "warning",
      judul: "Rasio hutang berbahaya!",
      pesan: `Cicilan Anda ${dtiRatio.toFixed(0)}% dari penghasilan. Idealnya maksimal 30%. Pertimbangkan konsolidasi hutang atau tambah income segera.`,
      urgency: "high",
      iconName: "ShieldAlert",
    });
  }

  const pinjolKritis = debts.find(
    (d) => d.jenis === "pinjol" && d.bungaPerBulan > 2.5
  );
  if (pinjolKritis) {
    insights.push({
      tipe: "warning",
      judul: "Pinjol berbunga tinggi terdeteksi!",
      pesan: `Prioritaskan pelunasan "${pinjolKritis.nama}". Setiap bulan tertunda, bunga ${pinjolKritis.bungaPerBulan}%/bulan bertambah signifikan. Ini darurat finansial!`,
      aksi: "Fokus lunasi pinjol dulu",
      urgency: "high",
      iconName: "Zap",
    });
  }

  // ═══════════════════════════════════════
  // TIP insights (urgency: medium)
  // ═══════════════════════════════════════

  if (debts.length >= 3 && result.strategy === "avalanche") {
    insights.push({
      tipe: "tip",
      judul: "Pertimbangkan Snowball untuk motivasi",
      pesan:
        "Dengan banyak hutang, quick win dari metode Snowball bisa menjaga semangat Anda dalam perjalanan panjang ini. Motivasi juga aset penting!",
      urgency: "medium",
      iconName: "Mountain",
    });
  }

  if (income.ekstraPembayaran === 0 && result.bulanUntukLunas > 0) {
    const withExtra500 = result.jadwal.length;
    insights.push({
      tipe: "tip",
      judul: "Coba tambah Rp 500rb/bulan",
      pesan: `Ekstra pembayaran kecil memberi dampak besar. Rp 500.000/bulan bisa mempercepat bebas hutang dan menghemat bunga signifikan. Coba simulasikan!`,
      aksi: "Simulasikan ekstra bayar",
      urgency: "medium",
      iconName: "TrendingUp",
    });
  }

  const hasKartuKredit = debts.some((d) => d.jenis === "kartu_kredit");
  if (hasKartuKredit) {
    insights.push({
      tipe: "tip",
      judul: "Stop pakai kartu kredit sementara",
      pesan:
        "Sambil melunasi, jangan tambah hutang baru. Cabut fisik kartu jika perlu. Hutang lama tidak bisa lunas jika terus muncul hutang baru.",
      urgency: "medium",
      iconName: "CreditCard",
    });
  }

  // ═══════════════════════════════════════
  // MILESTONE insights (urgency: low)
  // ═══════════════════════════════════════

  const quickWinDebt = debts.find((d) => d.totalHutang < 3_000_000);
  if (quickWinDebt) {
    insights.push({
      tipe: "milestone",
      judul: "Quick win tersedia!",
      pesan: `"${quickWinDebt.nama}" tinggal ${formatCurrency(quickWinDebt.totalHutang)}. Dengan sedikit fokus ekstra, hutang ini bisa lunas dalam 2-3 bulan!`,
      aksi: "Fokus ke hutang ini",
      urgency: "medium",
      iconName: "Target",
    });
  }

  if (totalHutang > 0 && totalHutang < 10_000_000) {
    insights.push({
      tipe: "milestone",
      judul: "Anda dalam jangkauan!",
      pesan: `Total hutang Anda ${formatCurrency(totalHutang)} — kurang dari 10 juta. Dengan komitmen dan strategi yang tepat, Anda bisa bebas dalam waktu dekat!`,
      urgency: "low",
      iconName: "Trophy",
    });
  }

  // ═══════════════════════════════════════
  // MOTIVATION insights (urgency: low)
  // ═══════════════════════════════════════

  insights.push({
    tipe: "motivation",
    judul: "Anda sudah mengambil langkah PERTAMA",
    pesan:
      "Kebanyakan orang menghindari melihat hutang mereka. Anda tidak. Anda sudah menghitung, merencanakan, dan mengambil kontrol. Ini adalah kemenangan psikologis besar!",
    urgency: "low",
    iconName: "Star",
  });

  if (result.bulanUntukLunas > 0 && result.bulanUntukLunas < 24) {
    insights.push({
      tipe: "motivation",
      judul: `Bebas hutang dalam ${formatMonths(result.bulanUntukLunas)}. Ini realistis!`,
      pesan:
        "Kurang dari 2 tahun untuk bebas hutang. Itu bukan waktu yang lama. Bayangkan bagaimana rasanya tidak punya cicilan sama sekali — uang gajian full milik Anda!",
      urgency: "low",
      iconName: "Award",
    });
  }

  if (result.bulanUntukLunas > 0 && result.bulanUntukLunas < 12) {
    insights.push({
      tipe: "motivation",
      judul: "Bebas hutang tahun ini! Fokus dan konsisten.",
      pesan:
        "Anda hanya butuh kurang dari 12 bulan. Setiap bulan yang lewat, Anda semakin dekat dengan kebebasan finansial. Jangan menyerah sekarang!",
      urgency: "low",
      iconName: "Rocket",
    });
  }

  // Sort: warning dulu, lalu tip, milestone, motivation
  const typeOrder: Record<string, number> = {
    warning: 0,
    tip: 1,
    milestone: 2,
    motivation: 3,
  };
  const urgencyOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  insights.sort((a, b) => {
    const typeCompare = typeOrder[a.tipe] - typeOrder[b.tipe];
    if (typeCompare !== 0) return typeCompare;
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return insights.slice(0, 6);
}
