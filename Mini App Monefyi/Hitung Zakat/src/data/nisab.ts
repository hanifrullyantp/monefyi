// Nisab per 2026 (bisa di-update manual)

export const HARGA_EMAS_PER_GRAM = 1200000; // Rp 1.2 juta/gram
export const HARGA_PERAK_PER_GRAM = 15000;
export const HARGA_BERAS_PER_KG = 18000;
export const ZAKAT_FITRAH_PER_JIWA = 45000;

export const NISAB = {
  penghasilan: {
    rate: 2.5,
    nisabIDR: 85 * HARGA_EMAS_PER_GRAM, // 85 gram emas
    haul: '1 tahun',
    note: 'Menggunakan pendekatan qiyas (dianalogikan dengan zakat maal)',
  },
  maal: {
    rate: 2.5,
    nisabIDR: 85 * HARGA_EMAS_PER_GRAM,
    haul: '1 tahun',
    note: 'Nisab setara 85 gram emas',
  },
  emas: {
    rate: 2.5,
    nisabGram: 85,
    haul: '1 tahun',
    hargaEmasPerGram: HARGA_EMAS_PER_GRAM,
    note: 'Nisab emas 85 gram, perak 595 gram',
  },
  perak: {
    rate: 2.5,
    nisabGram: 595,
    hargaPerakPerGram: HARGA_PERAK_PER_GRAM,
    haul: '1 tahun',
    note: 'Nisab perak 595 gram',
  },
  perdagangan: {
    rate: 2.5,
    nisabIDR: 85 * HARGA_EMAS_PER_GRAM,
    haul: '1 tahun',
    formula: '(Aset lancar + piutang) - (utang jangka pendek) × 2.5%',
    note: 'Nisab setara 85 gram emas',
  },
  pertanian: {
    rateAirHujan: 10,
    rateAirIrigasi: 5,
    rateKombinasi: 7.5,
    nisabKG: 653, // 5 wasaq = 653 kg gabah
    haul: 'setiap panen',
    note: 'Nisab 5 wasaq (653 kg gabah)',
  },
  fitrah: {
    dalamBeras: 2.5, // 2.5 kg beras per jiwa
    dalamRupiah: ZAKAT_FITRAH_PER_JIWA,
    waktu: 'Sebelum sholat Idul Fitri',
    note: 'Wajib untuk setiap muslim (bayi, dewasa, budak, merdeka)',
  },
  investasi: {
    rate: 2.5,
    nisabIDR: 85 * HARGA_EMAS_PER_GRAM,
    haul: '1 tahun',
    note: 'Termasuk saham syariah, reksadana syariah, sukuk',
  },
};

export const getNisabInRupiah = (): number => {
  return 85 * HARGA_EMAS_PER_GRAM;
};

export const getNisabEmasGram = (): number => {
  return 85;
};

export const getNisabPerakGram = (): number => {
  return 595;
};
