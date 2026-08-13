export type MetodeBudget =
  | "503020"
  | "40302010"
  | "702010"
  | "zero-based"
  | "envelope";

export type KategoriTipe =
  | "kebutuhan"
  | "keinginan"
  | "tabungan"
  | "investasi"
  | "sedekah"
  | "hutang";

export type StatusAlokasi =
  | "aman"
  | "perhatian"
  | "waspada"
  | "batas"
  | "overspend";

export interface SubKategori {
  id: string;
  nama: string;
  rupiah: number;
  isCustom: boolean;
}

export interface KategoriItem {
  id: string;
  nama: string;
  tipe: KategoriTipe;
  persentaseDefault: number;
  rupiahAlokasi: number;
  rupiahTerpakai: number;
  isEditable: boolean;
  isCustom: boolean;
  icon: string;
  deskripsi: string;
  subKategori?: SubKategori[];
}

export interface AlokasiBudget {
  label: string;
  persentase: number;
  tipe: KategoriTipe;
  warna: string;
}

export interface MetodeInfo {
  id: MetodeBudget;
  nama: string;
  deskripsi: string;
  cocokUntuk: string;
  kelebihan: string[];
  kekurangan: string[];
  alokasi: AlokasiBudget[];
  warna: string;
  icon: string;
  tag: string;
}

export interface ProfilKeuangan {
  namaPengguna: string;
  penghasilanBulanan: number;
  penghasilanTambahan: number;
  bulanAktif: string;
  metodeAktif: MetodeBudget;
  matauang: "IDR";
}

export interface BudgetPlan {
  id: string;
  bulan: string;
  tahun: number;
  profilKeuangan: ProfilKeuangan;
  metode: MetodeBudget;
  totalPenghasilan: number;
  kategori: KategoriItem[];
  totalAlokasi: number;
  totalTerpakai: number;
  sisa: number;
  persentaseTerpakai: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetInsight {
  tipe: "positif" | "negatif" | "netral" | "saran";
  judul: string;
  pesan: string;
  aksi?: string;
  icon: string;
  prioritas: number;
}

export interface RiwayatItem {
  id: string;
  bulan: string;
  tahun: number;
  totalPenghasilan: number;
  totalTerpakai: number;
  persentaseTerpakai: number;
  statusKeseluruhan: StatusAlokasi;
  kategoriRingkasan: {
    nama: string;
    persentaseTerpakai: number;
  }[];
}

export interface ZeroBudgetState {
  totalPenghasilan: number;
  totalAlokasi: number;
  sisaAlokasi: number;
  kategori: KategoriItem[];
  isBalanced: boolean;
}

export interface EnvelopeTransaksi {
  id: string;
  deskripsi: string;
  jumlah: number;
  tanggal: string;
}

export interface EnvelopeData {
  envelopeId: string;
  nama: string;
  alokasi: number;
  terpakai: number;
  sisa: number;
  warna: string;
  icon: string;
  transaksi: EnvelopeTransaksi[];
}
