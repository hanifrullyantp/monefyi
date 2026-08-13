export type JenisAkad =
  | "mudharabah"
  | "musyarakah"
  | "muzaraah"
  | "mukhabarah"
  | "musaqah";

export type JenisMudharabah =
  | "muthlaqah"
  | "muqayyadah";

export type JenisMusyarakah =
  | "inan"
  | "mufawadhah"
  | "abdan"
  | "wujuh";

// ─── Pihak dalam Akad ─────────────────────────────────────────────────────────

export interface PihakMudharabah {
  nama: string;
  peran: "shahibul_mal" | "mudharib";
  jumlahModal: number;
  nisbahKeuntungan: number;
}

export interface PihakMusyarakah {
  nama: string;
  jumlahModal: number;
  persentaseModal: number;
  nisbahKeuntungan: number;
  nisbahKerugian: number;
}

export interface PihakPertanian {
  nama: string;
  peran: "pemilik_lahan" | "penggarap";
  kontribusi: string[];
  nisbahHasilPanen: number;
}

// ─── Form Input Types ──────────────────────────────────────────────────────────

export interface MudharabahInput {
  jenisMudharabah: JenisMudharabah;
  pihak: [PihakMudharabah, PihakMudharabah];
  estimasiPendapatanUsaha: number;
  periodeUsaha: number;
  satuanPeriode: "bulan" | "tahun";
  batasanMuqayyadah?: string;
  deskripsiUsaha?: string;
}

export interface MusyarakahInput {
  jenisMusyarakah: JenisMusyarakah;
  pihak: PihakMusyarakah[];
  estimasiPendapatanUsaha: number;
  periodeUsaha: number;
  satuanPeriode: "bulan" | "tahun";
  modeLababerbedaDariModal: boolean;
}

export interface MuzaraahInput {
  namaPemilikLahan: string;
  namaPenggarap: string;
  luasLahan: number;
  satuanLuas: "hektar" | "m2" | "are";
  estimasiHasilPanen: number;
  satuanHasil: string;
  estimasiHargaPerSatuan: number;
  biayaOperasional: number;
  nisbahPemilik: number;
  nisbahPenggarap: number;
  periodeMusim: number;
  catatanAkad?: string;
}

export interface MukhabarahInput {
  namaPemilikLahan: string;
  namaPenggarap: string;
  luasLahan: number;
  satuanLuas: "hektar" | "m2" | "are";
  estimasiHasilPanen: number;
  satuanHasil: string;
  estimasiHargaPerSatuan: number;
  biayaBenih: number;
  biayaOperasionalLain: number;
  nisbahPemilik: number;
  nisbahPenggarap: number;
  periodeMusim: number;
  catatanAkad?: string;
}

export interface MusaqahInput {
  namaPemilikKebun: string;
  namaPengelola: string;
  jenisTanaman: string;
  jumlahPohonAtauLahan: number;
  satuanKebun: string;
  estimasiHasilPanen: number;
  satuanHasil: string;
  estimasiHargaPerSatuan: number;
  nisbahPemilik: number;
  nisbahPengelola: number;
  periodePerawatan: number;
  satuanPeriode: "bulan" | "tahun";
  catatanAkad?: string;
}

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface PembagianPihak {
  nama: string;
  peran: string;
  keuntunganRupiah: number;
  persentaseKeuntungan: number;
  kerugianRupiah: number;
  persentaseKerugian: number;
}

export interface SkenarioResult {
  label: string;
  multiplier: number;
  totalNilai: number;
  pembagianPerPihak: { nama: string; nilai: number }[];
}

export interface ValidationResult {
  valid: boolean;
  pesan: string[];
}

export interface MudharabahResult {
  totalModal: number;
  estimasiPendapatan: number;
  estimasiKeuntunganBersih: number;
  pembagian: PembagianPihak[];
  skenario: SkenarioResult[];
  ringkasanAkad: string;
  validasiNisbah: ValidationResult;
}

export interface MusyarakahResult {
  totalModal: number;
  estimasiPendapatan: number;
  estimasiKeuntunganBersih: number;
  pembagian: PembagianPihak[];
  distribusiModal: { nama: string; jumlah: number; persentase: number }[];
  skenario: SkenarioResult[];
  validasiNisbah: ValidationResult;
  catatanKerugian: string;
}

export interface PertanianResult {
  estimasiNilaiPanen: number;
  biayaTotal: number;
  nilaiPanenBersih: number;
  pembagianPemilik: { persentase: number; rupiah: number };
  pembagianPenggarap: { persentase: number; rupiah: number };
  skenario: SkenarioResult[];
  catatanAkad: string;
}

// ─── Dalil & Akad Info ────────────────────────────────────────────────────────

export interface DalilItem {
  jenis: "quran" | "hadits";
  referensi: string;
  teksArab: string;
  terjemahan: string;
  relevansi: string;
}

export interface AkadInfo {
  id: JenisAkad;
  nama: string;
  namaArab: string;
  definisi: string;
  rukun: string[];
  syarat: string[];
  keuntunganDibagi: string;
  kerugianDitanggung: string;
  contohKasus: string;
  dalil: DalilItem[];
}

// ─── Riwayat ──────────────────────────────────────────────────────────────────

export interface RiwayatSimulasi {
  id: string;
  tanggal: string;
  jenisAkad: JenisAkad;
  ringkasan: string;
  totalModal: number;
}
