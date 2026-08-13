import type { HasilAhliWaris } from "@/types/hitung-waris";

/**
 * Hitung GCD (Greatest Common Divisor) menggunakan algoritma Euclidean
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Hitung LCM (Lowest Common Multiple) dari dua angka
 */
function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Hitung LCM dari array angka
 */
export function lcmArray(numbers: number[]): number {
  if (numbers.length === 0) return 1;
  return numbers.reduce((acc, n) => lcm(acc, n), 1);
}

/**
 * Terapkan 'Aul — ketika total bagian furudh melebihi 1 (100%)
 *
 * Cara 'aul:
 * 1. Jadikan semua pecahan berbasis penyebut yang sama (LCM)
 * 2. Total pembilang akan melebihi penyebut
 * 3. Jadikan total pembilang sebagai penyebut baru
 * 4. Semua bagian dikurangi proporsional
 *
 * Contoh:
 *   Istri 1/4, 2 Anak Perempuan 2/3, Saudara Seibu 1/6
 *   LCM(4,3,6) = 12
 *   Istri: 3/12, 2 Anak Perempuan: 8/12, Saudara Seibu: 2/12
 *   Total pembilang = 3+8+2 = 13 > 12
 *   'Aul: penyebut baru = 13
 *   Istri: 3/13 = 23.08%, 2 Anak Perempuan: 8/13 = 61.54%, Saudara Seibu: 2/13 = 15.38%
 */
export function applyAul(hasilFurudh: HasilAhliWaris[]): HasilAhliWaris[] {
  const aktif = hasilFurudh.filter((h) => h.status === "mendapat_bagian");

  if (aktif.length === 0) return hasilFurudh;

  // Hitung LCM dari semua penyebut
  const penyebutList = aktif.map((h) => h.penyebut).filter((p) => p > 0);
  const penyebutLCM = lcmArray(penyebutList);

  // Konversi semua ke penyebut LCM
  const pembilangDikonversi = aktif.map((h) => {
    const faktor = penyebutLCM / h.penyebut;
    return Math.round(h.pembilang * faktor);
  });

  // Total pembilang = penyebut baru (untuk 'aul)
  const totalPembilang = pembilangDikonversi.reduce((acc, p) => acc + p, 0);

  // Update hasil dengan bagian setelah 'aul
  return hasilFurudh.map((h) => {
    if (h.status !== "mendapat_bagian") return h;

    const idx = aktif.findIndex((a) => a.jenis === h.jenis);
    if (idx === -1) return h;

    const pembilangBaru = pembilangDikonversi[idx];
    const penyebutBaru = totalPembilang;
    const persentaseBaru = (pembilangBaru / penyebutBaru) * 100;

    return {
      ...h,
      pembilang: pembilangBaru,
      penyebut: penyebutBaru,
      persentase: persentaseBaru,
    };
  });
}

/**
 * Terapkan Radd — ketika total bagian furudh kurang dari 1 (100%)
 * dan tidak ada ashabah.
 *
 * Sisa harta dikembalikan ke ashabul furudh secara proporsional,
 * KECUALI suami/istri (pendapat mayoritas ulama).
 *
 * Langkah:
 * 1. Identifikasi yang menerima radd (furudh kecuali suami/istri)
 * 2. Hitung total bagian yang akan menerima radd
 * 3. Distribusikan sisa secara proporsional
 */
export function applyRadd(
  hasilFurudh: HasilAhliWaris[],
  adaSuami: boolean,
  adaIstri: boolean
): HasilAhliWaris[] {
  const mendapatBagian = hasilFurudh.filter(
    (h) => h.status === "mendapat_bagian"
  );

  if (mendapatBagian.length === 0) return hasilFurudh;

  // Yang bisa menerima radd (bukan suami/istri)
  const penerimaRadd = mendapatBagian.filter(
    (h) =>
      !(adaSuami && h.jenis === "suami") &&
      !(adaIstri && h.jenis === "istri")
  );

  if (penerimaRadd.length === 0) {
    // Jika hanya suami/istri saja, mereka mendapat semua (radd ke mereka juga)
    const totalPersentase = mendapatBagian.reduce(
      (acc, h) => acc + h.persentase,
      0
    );
    if (Math.abs(totalPersentase - 100) < 0.01) return hasilFurudh;

    // Radd ke suami/istri juga jika tidak ada ahli waris lain
    const faktorRadd = 100 / totalPersentase;
    return hasilFurudh.map((h) => {
      if (h.status !== "mendapat_bagian") return h;
      return {
        ...h,
        persentase: h.persentase * faktorRadd,
      };
    });
  }

  // Hitung total persentase penerima radd
  const totalPersentasePenerimaRadd = penerimaRadd.reduce(
    (acc, h) => acc + h.persentase,
    0
  );

  // Hitung total persentase suami/istri
  const totalPersentasePasangan = mendapatBagian
    .filter(
      (h) =>
        (adaSuami && h.jenis === "suami") ||
        (adaIstri && h.jenis === "istri")
    )
    .reduce((acc, h) => acc + h.persentase, 0);

  // Sisa untuk didistribusikan ke penerima radd
  const sisaUntukRadd = 100 - totalPersentasePasangan;

  // Faktor perkalian untuk penerima radd
  const faktorRadd =
    totalPersentasePenerimaRadd > 0
      ? sisaUntukRadd / totalPersentasePenerimaRadd
      : 1;

  return hasilFurudh.map((h) => {
    if (h.status !== "mendapat_bagian") return h;

    const isPasangan =
      (adaSuami && h.jenis === "suami") ||
      (adaIstri && h.jenis === "istri");

    if (isPasangan) return h;

    return {
      ...h,
      persentase: h.persentase * faktorRadd,
    };
  });
}
