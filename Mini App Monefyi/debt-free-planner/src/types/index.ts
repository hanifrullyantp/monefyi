// src/types/index.ts

export type DebtType =
  | "kartu_kredit"
  | "kta"
  | "cicilan_barang"
  | "kpr"
  | "kkb"
  | "pinjol"
  | "koperasi"
  | "utang_pribadi"
  | "utang_keluarga"
  | "lainnya";

export type PayoffStrategy = "snowball" | "avalanche" | "custom";

export type UrgencyLevel = "kritis" | "tinggi" | "sedang" | "rendah";

export interface DebtItem {
  id: string;
  nama: string;
  jenis: DebtType;
  totalHutang: number;
  bungaPerBulan: number;
  cicilanMinimum: number;
  tenorSisa?: number;
  catatan?: string;
  urgency: UrgencyLevel;
  createdAt: string;
}

export interface IncomeAllocation {
  penghasilanBersih: number;
  alokasiBayarHutang: number;
  persentaseAlokasi: number;
  ekstraPembayaran: number;
  bufferDanaDarurat: number;
}

export interface DebtPaymentDetail {
  debtId: string;
  debtNama: string;
  bungaBulan: number;
  pokokBulan: number;
  totalBayar: number;
  sisaSetelah: number;
  isLunas: boolean;
}

export interface PayoffMonth {
  bulanKe: number;
  tanggal: string;
  totalPembayaran: number;
  totalPokokDibayar: number;
  totalBungaDibayar: number;
  totalSisaHutang: number;
  detailPerHutang: DebtPaymentDetail[];
  hutangLunasBulanIni: string[];
}

export interface PayoffResult {
  strategy: PayoffStrategy;
  totalHutangAwal: number;
  totalBungaDibayar: number;
  totalDibayar: number;
  tanggalLunas: string;
  bulanUntukLunas: number;
  jadwal: PayoffMonth[];
  hematBunga?: number;
  hematBulan?: number;
  urutanPelunasan: string[];
}

export interface StrategyComparison {
  snowball: PayoffResult;
  avalanche: PayoffResult;
  minimumOnly: PayoffResult;
  rekomendasi: PayoffStrategy;
  alasanRekomendasi: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedDate?: string;
  icon: string;
  colorScheme: "red" | "amber" | "green";
}

export interface DebtCoachInsight {
  tipe: "warning" | "tip" | "milestone" | "motivation";
  judul: string;
  pesan: string;
  aksi?: string;
  urgency: "high" | "medium" | "low";
  iconName: string;
}

export interface DebtSummaryStats {
  totalHutang: number;
  jumlahHutang: number;
  totalCicilanMinimum: number;
  rasioHutangTerhadapPenghasilan: number;
  hutangTerbesar: DebtItem | null;
  bungaTertinggi: DebtItem | null;
  hutangPalingUrgent: DebtItem | null;
}

export interface UserProgress {
  totalTerlunasi: number;
  totalBungaDihindari: number;
  hutangLunasCount: number;
  bulanBerjalan: number;
  targetBulan: number;
  persentaseProgress: number;
  streakBulan: number;
}

export interface DebtTypeInfo {
  label: string;
  icon: string;
  bungaTipikal: number;
  urgency: UrgencyLevel;
  warna: string;
  tips: string;
}
