import {
  HARGA_EMAS_PER_GRAM,
  HARGA_PERAK_PER_GRAM,
  ZAKAT_FITRAH_PER_JIWA,
  NISAB,
} from '@/data/nisab';
import type {
  PenghasilanInput,
  PenghasilanResult,
  MaalInput,
  MaalResult,
  EmasInput,
  EmasResult,
  PerdaganganInput,
  PerdaganganResult,
  PertanianInput,
  PertanianResult,
  FitrahInput,
  FitrahResult,
  InvestasiInput,
  InvestasiResult,
} from '@/types/zakat';

const NISAB_EMAS_GRAM = 85;
const NISAB_PERAK_GRAM = 595;
const NISAB_PERTANIAN_KG = 653;

export function calculateZakatPenghasilan(input: PenghasilanInput): PenghasilanResult {
  const {
    penghasilanBulanan,
    bonusTahunan = 0,
    kebutuhanBulanan = 0,
    cicilanBulanan = 0,
    metode,
  } = input;

  const totalPenghasilanTahunan = penghasilanBulanan * 12 + bonusTahunan;
  const totalPengurangTahunan = (kebutuhanBulanan + cicilanBulanan) * 12;

  const penghasilanBersih =
    metode === 'netto'
      ? totalPenghasilanTahunan - totalPengurangTahunan
      : totalPenghasilanTahunan;

  const nisabTahunan = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;
  const isWajibZakat = penghasilanBersih >= nisabTahunan;

  const jumlahZakatTahunan = isWajibZakat ? penghasilanBersih * 0.025 : 0;
  const jumlahZakatBulanan = jumlahZakatTahunan / 12;

  const breakdown = [
    { label: 'Penghasilan Tahunan', value: totalPenghasilanTahunan },
  ];

  if (metode === 'netto' && totalPengurangTahunan > 0) {
    breakdown.push({
      label: 'Pengurang (kebutuhan + cicilan)',
      value: -totalPengurangTahunan,
    });
  }

  breakdown.push(
    { label: 'Penghasilan Bersih', value: penghasilanBersih },
    { label: 'Nisab (85 gram emas)', value: nisabTahunan },
    { label: 'Zakat 2.5%', value: jumlahZakatTahunan }
  );

  return {
    isWajibZakat,
    totalPenghasilanTahunan,
    penghasilanBersih,
    jumlahZakatTahunan,
    jumlahZakatBulanan,
    nisabTahunan,
    gapKeNisab: isWajibZakat ? undefined : nisabTahunan - penghasilanBersih,
    breakdown,
  };
}

export function calculateZakatMaal(input: MaalInput): MaalResult {
  const emasIDR = input.emasGram * HARGA_EMAS_PER_GRAM;
  const perakIDR = input.perakGram * HARGA_PERAK_PER_GRAM;

  const totalHarta =
    input.tabungan +
    input.cash +
    emasIDR +
    perakIDR +
    input.saham +
    input.sukuk +
    input.propertiInvestasi +
    input.piutang;

  const totalPengurang = input.utangJangkaPendek + input.kewajiban;
  const hartaBersih = totalHarta - totalPengurang;

  const nisab = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;
  const isWajibZakat = hartaBersih >= nisab;
  const jumlahZakat = isWajibZakat ? hartaBersih * 0.025 : 0;

  return {
    isWajibZakat,
    totalHarta,
    totalPengurang,
    hartaBersih,
    nisab,
    jumlahZakat,
    breakdown: {
      cash: input.tabungan + input.cash,
      emas: emasIDR,
      perak: perakIDR,
      investasi: input.saham + input.sukuk + input.propertiInvestasi,
      piutang: input.piutang,
      utang: totalPengurang,
    },
  };
}

export function calculateZakatEmas(input: EmasInput): EmasResult {
  const totalEmasGram = input.emasGram + input.perhiasanDisimpan;
  const nilaiEmas = totalEmasGram * input.hargaEmasPerGram;
  const nilaiPerak = input.perakGram * input.hargaPerakPerGram;
  const totalNilai = nilaiEmas + nilaiPerak;

  // Check if either emas or perak reaches nisab
  const emasReachNisab = totalEmasGram >= NISAB_EMAS_GRAM;
  const perakReachNisab = input.perakGram >= NISAB_PERAK_GRAM;
  const isWajibZakat = emasReachNisab || perakReachNisab;

  let jumlahZakat = 0;
  if (emasReachNisab) {
    jumlahZakat += nilaiEmas * 0.025;
  }
  if (perakReachNisab) {
    jumlahZakat += nilaiPerak * 0.025;
  }

  return {
    isWajibZakat,
    totalEmasGram,
    totalPerakGram: input.perakGram,
    nilaiEmas,
    nilaiPerak,
    totalNilai,
    nisabEmasGram: NISAB_EMAS_GRAM,
    nisabPerakGram: NISAB_PERAK_GRAM,
    jumlahZakat,
  };
}

export function calculateZakatPerdagangan(input: PerdaganganInput): PerdaganganResult {
  const totalAset =
    input.modalKerja +
    input.kas +
    input.persediaan +
    input.piutangUsaha +
    input.investasiBisnis;

  const totalKewajiban =
    input.utangUsaha + input.pajakBelumBayar + input.gajiKaryawan;

  const asetBersih = totalAset - totalKewajiban;
  const nisab = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;
  const isWajibZakat = asetBersih >= nisab;
  const jumlahZakat = isWajibZakat ? asetBersih * 0.025 : 0;

  return {
    isWajibZakat,
    totalAset,
    totalKewajiban,
    asetBersih,
    nisab,
    jumlahZakat,
  };
}

export function calculateZakatPertanian(input: PertanianInput): PertanianResult {
  const isWajibZakat = input.hasilPanenKg >= NISAB_PERTANIAN_KG;

  const rateMap = {
    hujan: 0.1,
    irigasi: 0.05,
    kombinasi: 0.075,
  };

  const rate = rateMap[input.metodePengairan];
  const nilaiTotalPanen = input.hasilPanenKg * input.hargaPerKg;
  const jumlahZakatKG = isWajibZakat ? input.hasilPanenKg * rate : 0;
  const jumlahZakatIDR = jumlahZakatKG * input.hargaPerKg;

  return {
    isWajibZakat,
    hasilPanenKg: input.hasilPanenKg,
    nilaiTotalPanen,
    jumlahZakatKG,
    jumlahZakatIDR,
    ratePersen: rate * 100,
    nisabKG: NISAB_PERTANIAN_KG,
  };
}

export function calculateZakatFitrah(input: FitrahInput): FitrahResult {
  const totalJiwa =
    input.jumlahJiwa.ayah +
    input.jumlahJiwa.ibu +
    input.jumlahJiwa.anak +
    input.jumlahJiwa.orangTua +
    input.jumlahJiwa.lainnya;

  const berasPerJiwa = NISAB.fitrah.dalamBeras;
  const uangPerJiwa = input.hargaBerasPerKg * berasPerJiwa;

  const totalBeras = totalJiwa * berasPerJiwa;
  const totalUang = totalJiwa * uangPerJiwa;

  return {
    totalJiwa,
    berasPerJiwa,
    uangPerJiwa,
    totalBeras,
    totalUang,
  };
}

export function calculateZakatInvestasi(input: InvestasiInput): InvestasiResult {
  const totalInvestasiSyariah =
    input.sahamSyariah +
    input.reksadanaSyariah +
    input.sukuk +
    input.depositoSyariah +
    input.p2pSyariah +
    input.emasDigital +
    input.propertiInvestasi;

  const totalInvestasiKonvensional =
    input.sahamKonvensional + input.reksadanaKonvensional;

  const totalInvestasi = totalInvestasiSyariah + totalInvestasiKonvensional;
  const nisab = NISAB_EMAS_GRAM * HARGA_EMAS_PER_GRAM;
  const isWajibZakat = totalInvestasi >= nisab;
  const jumlahZakat = isWajibZakat ? totalInvestasi * 0.025 : 0;

  return {
    isWajibZakat,
    totalInvestasiSyariah,
    totalInvestasiKonvensional,
    totalInvestasi,
    nisab,
    jumlahZakat,
  };
}
