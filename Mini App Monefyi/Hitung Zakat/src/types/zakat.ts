// Types for Zakat Calculator

export interface ZakatType {
  id: string;
  name: string;
  description: string;
  icon: string;
  rate: string;
  href: string;
}

export interface NisabConfig {
  rate: number;
  nisabIDR?: number;
  nisabGram?: number;
  haul: string;
  note: string;
  hargaPerGram?: number;
}

export interface PenghasilanInput {
  penghasilanBulanan: number;
  bonusTahunan: number;
  kebutuhanBulanan: number;
  cicilanBulanan: number;
  metode: 'bruto' | 'netto';
}

export interface PenghasilanResult {
  isWajibZakat: boolean;
  totalPenghasilanTahunan: number;
  penghasilanBersih: number;
  jumlahZakatTahunan: number;
  jumlahZakatBulanan: number;
  nisabTahunan: number;
  gapKeNisab?: number;
  breakdown: {
    label: string;
    value: number;
  }[];
}

export interface MaalInput {
  tabungan: number;
  cash: number;
  emasGram: number;
  perakGram: number;
  saham: number;
  sukuk: number;
  propertiInvestasi: number;
  piutang: number;
  utangJangkaPendek: number;
  kewajiban: number;
}

export interface MaalResult {
  isWajibZakat: boolean;
  totalHarta: number;
  totalPengurang: number;
  hartaBersih: number;
  nisab: number;
  jumlahZakat: number;
  breakdown: {
    cash: number;
    emas: number;
    perak: number;
    investasi: number;
    piutang: number;
    utang: number;
  };
}

export interface EmasInput {
  emasGram: number;
  perhiasanDisimpan: number;
  perakGram: number;
  hargaEmasPerGram: number;
  hargaPerakPerGram: number;
}

export interface EmasResult {
  isWajibZakat: boolean;
  totalEmasGram: number;
  totalPerakGram: number;
  nilaiEmas: number;
  nilaiPerak: number;
  totalNilai: number;
  nisabEmasGram: number;
  nisabPerakGram: number;
  jumlahZakat: number;
}

export interface PerdaganganInput {
  modalKerja: number;
  kas: number;
  persediaan: number;
  piutangUsaha: number;
  investasiBisnis: number;
  utangUsaha: number;
  pajakBelumBayar: number;
  gajiKaryawan: number;
}

export interface PerdaganganResult {
  isWajibZakat: boolean;
  totalAset: number;
  totalKewajiban: number;
  asetBersih: number;
  nisab: number;
  jumlahZakat: number;
}

export interface PertanianInput {
  hasilPanenKg: number;
  hargaPerKg: number;
  metodePengairan: 'hujan' | 'irigasi' | 'kombinasi';
}

export interface PertanianResult {
  isWajibZakat: boolean;
  hasilPanenKg: number;
  nilaiTotalPanen: number;
  jumlahZakatKG: number;
  jumlahZakatIDR: number;
  ratePersen: number;
  nisabKG: number;
}

export interface FitrahInput {
  jumlahJiwa: {
    ayah: number;
    ibu: number;
    anak: number;
    orangTua: number;
    lainnya: number;
  };
  metodePembayaran: 'beras' | 'uang';
  hargaBerasPerKg: number;
}

export interface FitrahResult {
  totalJiwa: number;
  berasPerJiwa: number;
  uangPerJiwa: number;
  totalBeras: number;
  totalUang: number;
}

export interface InvestasiInput {
  sahamSyariah: number;
  reksadanaSyariah: number;
  sukuk: number;
  depositoSyariah: number;
  p2pSyariah: number;
  emasDigital: number;
  propertiInvestasi: number;
  sahamKonvensional: number;
  reksadanaKonvensional: number;
}

export interface InvestasiResult {
  isWajibZakat: boolean;
  totalInvestasiSyariah: number;
  totalInvestasiKonvensional: number;
  totalInvestasi: number;
  nisab: number;
  jumlahZakat: number;
}

export interface DalilQuran {
  surat: string;
  ayat: number;
  arab?: string;
  terjemahan: string;
}

export interface DalilHadits {
  rawi: string;
  text: string;
}

export interface LembagaZakat {
  name: string;
  website: string;
  description: string;
  trustScore: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}
