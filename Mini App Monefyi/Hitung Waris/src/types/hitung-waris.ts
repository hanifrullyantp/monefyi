export type JenisAhliWaris =
  | "suami"
  | "istri"
  | "anak_laki"
  | "anak_perempuan"
  | "ayah"
  | "ibu"
  | "kakek"
  | "nenek_dari_ibu"
  | "nenek_dari_ayah"
  | "cucu_laki_dari_anak_laki"
  | "cucu_perempuan_dari_anak_laki"
  | "saudara_kandung_laki"
  | "saudara_kandung_perempuan"
  | "saudara_sebapak_laki"
  | "saudara_sebapak_perempuan"
  | "saudara_seibu_laki"
  | "saudara_seibu_perempuan";

export type GolonganAhliWaris =
  | "ashabul_furudh"
  | "ashabah"
  | "dzawil_arham";

export type StatusPenerimaan =
  | "mendapat_bagian"
  | "terhijab_hirman"
  | "terhijab_nuqshan"
  | "tidak_ada";

export type MetodePenyelesaian =
  | "normal"
  | "aul"
  | "radd"
  | "gharawain";

export interface AhliWarisInput {
  jenis: JenisAhliWaris;
  jumlah: number;
  isAda: boolean;
}

export interface HartaWarisan {
  totalHarta: number;
  hutangAlmarhum: number;
  biayaJenazah: number;
  nilaiWasiat: number;
  hartaBersih: number;
}

export interface HasilAhliWaris {
  jenis: JenisAhliWaris;
  namaDisplay: string;
  jumlahOrang: number;
  golongan: GolonganAhliWaris;
  status: StatusPenerimaan;
  alasanHijab?: string;

  pembilang: number;
  penyebut: number;
  persentase: number;

  nilaiTotal: number;
  nilaiPerOrang: number;

  dasarHukum: string;
  penjelasan: string;
}

export interface HasilPembagianWaris {
  harta: HartaWarisan;
  ahliWarisInput: AhliWarisInput[];
  metode: MetodePenyelesaian;
  penjelasanMetode: string;
  hasilPerAhliWaris: HasilAhliWaris[];
  totalBagianFurudh: number;
  totalBagianAshabah: number;
  sisaSetelahFurudh: number;
  aulFaktor?: number;
  totalPersentase: number;
  isValid: boolean;
  pesanError: string[];
  insights: WarisInsight[];
}

export interface WarisInsight {
  tipe: "info" | "perhatian" | "penting";
  judul: string;
  pesan: string;
  icon: string;
}

export interface FractionResult {
  pembilang: number;
  penyebut: number;
}

export interface RiwayatWarisItem {
  id: string;
  tanggal: string;
  totalHarta: number;
  jumlahAhliWaris: number;
  metode: MetodePenyelesaian;
  ringkasan: string;
}
