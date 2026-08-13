import type {
  JenisAhliWaris,
  AhliWarisInput,
  HasilAhliWaris,
  GolonganAhliWaris,
} from "@/types/hitung-waris";
import type { HajbResult } from "./hajb-rules";
import { AHLI_WARIS_INFO } from "@/lib/waris-data";

/**
 * Tentukan urutan prioritas ashabah
 * Semakin kecil angkanya, semakin tinggi prioritasnya
 */
const PRIORITAS_ASHABAH: Partial<Record<JenisAhliWaris, number>> = {
  anak_laki: 1,
  cucu_laki_dari_anak_laki: 2,
  ayah: 3,
  kakek: 4,
  saudara_kandung_laki: 5,
  saudara_sebapak_laki: 6,
};

/**
 * Hitung bagian ashabah (yang mendapat sisa setelah ashabul furudh)
 */
export function hitungAshabah(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>,
  hajbResult: Map<JenisAhliWaris, HajbResult>,
  sisaPersentase: number, // dalam persen (0-100)
  hartaUntukWaris: number
): HasilAhliWaris[] {
  if (sisaPersentase <= 0.001) return [];

  const hasilAshabah: HasilAhliWaris[] = [];

  const isAktif = (jenis: JenisAhliWaris): boolean => {
    const input = ahliWaris.get(jenis);
    const hajb = hajbResult.get(jenis);
    return (
      (input?.isAda ?? false) &&
      hajb?.status !== "terhijab_hirman" &&
      hajb?.status !== "tidak_ada"
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Temukan ashabah dengan prioritas tertinggi
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const ashabahAktif = Object.entries(PRIORITAS_ASHABAH)
    .filter(([jenis]) => isAktif(jenis as JenisAhliWaris))
    .sort(([, a], [, b]) => a - b);

  if (ashabahAktif.length === 0) {
    // Tidak ada ashabah murni, cek ashabah ma'al ghair
    return hitungAshabahMaalGhair(
      ahliWaris,
      hajbResult,
      sisaPersentase,
      hartaUntukWaris
    );
  }

  const [ashabahTertinggiJenis] = ashabahAktif[0];
  const jenisAshabah = ashabahTertinggiJenis as JenisAhliWaris;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Kasus khusus: Anak laki + anak perempuan (ashabah bil ghair)
  // Laki : Perempuan = 2 : 1
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (jenisAshabah === "anak_laki" && isAktif("anak_perempuan")) {
    return hitungAnakBersama(
      ahliWaris,
      sisaPersentase,
      hartaUntukWaris,
      "anak_laki",
      "anak_perempuan"
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Kasus khusus: Cucu laki + cucu perempuan (ashabah bil ghair)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (
    jenisAshabah === "cucu_laki_dari_anak_laki" &&
    isAktif("cucu_perempuan_dari_anak_laki")
  ) {
    return hitungAnakBersama(
      ahliWaris,
      sisaPersentase,
      hartaUntukWaris,
      "cucu_laki_dari_anak_laki",
      "cucu_perempuan_dari_anak_laki"
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Kasus khusus: Saudara kandung laki + perempuan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (
    jenisAshabah === "saudara_kandung_laki" &&
    isAktif("saudara_kandung_perempuan")
  ) {
    return hitungAnakBersama(
      ahliWaris,
      sisaPersentase,
      hartaUntukWaris,
      "saudara_kandung_laki",
      "saudara_kandung_perempuan"
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Kasus khusus: Saudara sebapak laki + perempuan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (
    jenisAshabah === "saudara_sebapak_laki" &&
    isAktif("saudara_sebapak_perempuan")
  ) {
    return hitungAnakBersama(
      ahliWaris,
      sisaPersentase,
      hartaUntukWaris,
      "saudara_sebapak_laki",
      "saudara_sebapak_perempuan"
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Kasus khusus: Ayah dengan anak perempuan saja
  // Ayah mendapat 1/6 furudh + sisa (ashabah)
  // Ini ditangani di engine utama, di sini hanya sisa pure ashabah
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Ashabah biasa — satu jenis mendapat semua sisa
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const input = ahliWaris.get(jenisAshabah);
  if (!input) return [];

  const jumlahOrang = input.jumlah;
  const info = AHLI_WARIS_INFO[jenisAshabah];

  const nilaiTotal = (sisaPersentase / 100) * hartaUntukWaris;

  hasilAshabah.push({
    jenis: jenisAshabah,
    namaDisplay: info.namaDisplay,
    jumlahOrang,
    golongan: "ashabah" as GolonganAhliWaris,
    status: "mendapat_bagian",
    pembilang: 1,
    penyebut: 1,
    persentase: sisaPersentase,
    nilaiTotal,
    nilaiPerOrang: jumlahOrang > 0 ? nilaiTotal / jumlahOrang : 0,
    dasarHukum: "HR. Bukhari & Muslim",
    penjelasan: `Mendapat sisa ${sisaPersentase.toFixed(2)}% sebagai ashabah setelah ashabul furudh mendapat bagian.`,
  });

  return hasilAshabah;
}

/**
 * Hitung bagian anak laki + perempuan bersama (ashabah bil ghair)
 * dengan perbandingan 2:1
 */
function hitungAnakBersama(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>,
  sisaPersentase: number,
  hartaUntukWaris: number,
  jenisLaki: JenisAhliWaris,
  jenisPerempuan: JenisAhliWaris
): HasilAhliWaris[] {
  const hasil: HasilAhliWaris[] = [];

  const inputLaki = ahliWaris.get(jenisLaki);
  const inputPerempuan = ahliWaris.get(jenisPerempuan);

  if (!inputLaki || !inputPerempuan) return hasil;

  const jumlahLaki = inputLaki.jumlah;
  const jumlahPerempuan = inputPerempuan.jumlah;

  // Total "saham" dengan perbandingan 2:1
  // Setiap laki = 2 saham, setiap perempuan = 1 saham
  const totalSaham = jumlahLaki * 2 + jumlahPerempuan * 1;

  const persentaseLaki = (sisaPersentase * (jumlahLaki * 2)) / totalSaham;
  const persentasePerempuan =
    (sisaPersentase * (jumlahPerempuan * 1)) / totalSaham;

  const infoLaki = AHLI_WARIS_INFO[jenisLaki];
  const infoPerempuan = AHLI_WARIS_INFO[jenisPerempuan];

  const nilaiTotalLaki = (persentaseLaki / 100) * hartaUntukWaris;
  const nilaiTotalPerempuan = (persentasePerempuan / 100) * hartaUntukWaris;

  hasil.push({
    jenis: jenisLaki,
    namaDisplay: infoLaki.namaDisplay,
    jumlahOrang: jumlahLaki,
    golongan: "ashabah",
    status: "mendapat_bagian",
    pembilang: jumlahLaki * 2,
    penyebut: totalSaham,
    persentase: persentaseLaki,
    nilaiTotal: nilaiTotalLaki,
    nilaiPerOrang: jumlahLaki > 0 ? nilaiTotalLaki / jumlahLaki : 0,
    dasarHukum: "QS. An-Nisa: 11 | HR. Bukhari & Muslim",
    penjelasan: `Mendapat sisa sebagai ashabah bil ghair. Perbandingan ${jenisLaki === "anak_laki" ? "anak laki" : "saudara laki"} : ${jenisPerempuan === "anak_perempuan" ? "anak perempuan" : "saudara perempuan"} = 2:1. Total sisa = ${sisaPersentase.toFixed(2)}%.`,
  });

  hasil.push({
    jenis: jenisPerempuan,
    namaDisplay: infoPerempuan.namaDisplay,
    jumlahOrang: jumlahPerempuan,
    golongan: "ashabah",
    status: "mendapat_bagian",
    pembilang: jumlahPerempuan * 1,
    penyebut: totalSaham,
    persentase: persentasePerempuan,
    nilaiTotal: nilaiTotalPerempuan,
    nilaiPerOrang:
      jumlahPerempuan > 0 ? nilaiTotalPerempuan / jumlahPerempuan : 0,
    dasarHukum: "QS. An-Nisa: 11 | HR. Bukhari & Muslim",
    penjelasan: `Mendapat sisa sebagai ashabah bil ghair bersama ${jenisLaki === "anak_laki" ? "anak laki-laki" : "saudara laki-laki"} dengan perbandingan 1:2.`,
  });

  return hasil;
}

/**
 * Hitung ashabah ma'al ghair:
 * Saudara kandung perempuan + anak perempuan/cucu perempuan
 * → Saudara kandung perempuan mendapat sisa bersama anak perempuan
 */
function hitungAshabahMaalGhair(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>,
  hajbResult: Map<JenisAhliWaris, HajbResult>,
  sisaPersentase: number,
  hartaUntukWaris: number
): HasilAhliWaris[] {
  const hasil: HasilAhliWaris[] = [];

  if (sisaPersentase <= 0.001) return hasil;

  const isAktif = (jenis: JenisAhliWaris): boolean => {
    const input = ahliWaris.get(jenis);
    const hajb = hajbResult.get(jenis);
    return (
      (input?.isAda ?? false) &&
      hajb?.status !== "terhijab_hirman"
    );
  };

  // Saudara kandung perempuan + anak perempuan → ashabah ma'al ghair
  if (isAktif("saudara_kandung_perempuan") && isAktif("anak_perempuan")) {
    const inputSaudara = ahliWaris.get("saudara_kandung_perempuan");
    if (inputSaudara) {
      const jumlah = inputSaudara.jumlah;
      const nilaiTotal = (sisaPersentase / 100) * hartaUntukWaris;
      hasil.push({
        jenis: "saudara_kandung_perempuan",
        namaDisplay: AHLI_WARIS_INFO["saudara_kandung_perempuan"].namaDisplay,
        jumlahOrang: jumlah,
        golongan: "ashabah",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 1,
        persentase: sisaPersentase,
        nilaiTotal,
        nilaiPerOrang: jumlah > 0 ? nilaiTotal / jumlah : 0,
        dasarHukum: "QS. An-Nisa: 176",
        penjelasan: `Mendapat sisa ${sisaPersentase.toFixed(2)}% sebagai ashabah ma'al ghair bersama anak perempuan.`,
      });
    }
    return hasil;
  }

  // Saudara sebapak perempuan + anak perempuan/cucu perempuan → ashabah ma'al ghair
  if (isAktif("saudara_sebapak_perempuan") && isAktif("anak_perempuan")) {
    const inputSaudara = ahliWaris.get("saudara_sebapak_perempuan");
    if (inputSaudara) {
      const jumlah = inputSaudara.jumlah;
      const nilaiTotal = (sisaPersentase / 100) * hartaUntukWaris;
      hasil.push({
        jenis: "saudara_sebapak_perempuan",
        namaDisplay:
          AHLI_WARIS_INFO["saudara_sebapak_perempuan"].namaDisplay,
        jumlahOrang: jumlah,
        golongan: "ashabah",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 1,
        persentase: sisaPersentase,
        nilaiTotal,
        nilaiPerOrang: jumlah > 0 ? nilaiTotal / jumlah : 0,
        dasarHukum: "QS. An-Nisa: 176",
        penjelasan: `Mendapat sisa ${sisaPersentase.toFixed(2)}% sebagai ashabah ma'al ghair bersama anak perempuan.`,
      });
    }
    return hasil;
  }

  return hasil;
}
