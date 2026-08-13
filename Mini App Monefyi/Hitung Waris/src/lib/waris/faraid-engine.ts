import type {
  AhliWarisInput,
  HartaWarisan,
  HasilPembagianWaris,
  HasilAhliWaris,
  JenisAhliWaris,
  MetodePenyelesaian,
  GolonganAhliWaris,
} from "@/types/hitung-waris";
import {
  applyHajbRules,
  hitungJumlahSaudaraAktif,
  adaKeturunan,
  type HajbResult,
} from "./hajb-rules";
import { applyAul, applyRadd } from "./aul-radd";
import { hitungAshabah } from "./ashabah-calculator";
import { generateWarisInsights } from "./waris-insights";
import { AHLI_WARIS_INFO } from "@/lib/waris-data";

/**
 * Engine utama kalkulasi pembagian waris Islam (Ilmu Faraid)
 */
export function hitungWarisan(
  harta: HartaWarisan,
  ahliWarisInput: AhliWarisInput[]
): HasilPembagianWaris {
  const pesanError: string[] = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 1: Hitung Harta Bersih
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const hartaBersih = Math.max(
    0,
    harta.totalHarta - harta.hutangAlmarhum - harta.biayaJenazah
  );

  const wasiatMaksimal = hartaBersih / 3;
  let nilaiWasiatFinal = harta.nilaiWasiat;
  if (nilaiWasiatFinal > wasiatMaksimal) {
    nilaiWasiatFinal = wasiatMaksimal;
    pesanError.push(
      `Wasiat melebihi 1/3 harta bersih. Disesuaikan dari Rp ${harta.nilaiWasiat.toLocaleString("id-ID")} ke Rp ${wasiatMaksimal.toLocaleString("id-ID")}.`
    );
  }

  const hartaUntukWaris = Math.max(0, hartaBersih - nilaiWasiatFinal);

  const hartaFinal: HartaWarisan = {
    ...harta,
    hartaBersih,
    nilaiWasiat: nilaiWasiatFinal,
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 2: Buat Map Ahli Waris
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ahliWarisMap = new Map<JenisAhliWaris, AhliWarisInput>();
  for (const aw of ahliWarisInput) {
    if (aw.isAda && aw.jumlah > 0) {
      ahliWarisMap.set(aw.jenis, aw);
    }
  }

  if (ahliWarisMap.size === 0) {
    return buatHasilKosong(hartaFinal, ahliWarisInput, pesanError);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 3: Terapkan Hajb
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const hajbResult = applyHajbRules(ahliWarisMap);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 4: Hitung Bagian Ashabul Furudh
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ada = (jenis: JenisAhliWaris): boolean => {
    const input = ahliWarisMap.get(jenis);
    const status = hajbResult.get(jenis);
    return (
      (input?.isAda ?? false) &&
      status?.status !== "terhijab_hirman"
    );
  };

  const jumlah = (jenis: JenisAhliWaris): number =>
    ahliWarisMap.get(jenis)?.jumlah ?? 0;

  // Info helper
  const adaAnakLaki = ada("anak_laki");
  const adaAnakPerempuan = ada("anak_perempuan");
  const adaCucuLaki = ada("cucu_laki_dari_anak_laki");
  const adaCucuPerempuan = ada("cucu_perempuan_dari_anak_laki");
  const adaAyah = ada("ayah");
  const adaIbu = ada("ibu");
  const adaSuami = ada("suami");
  const adaIstri = ada("istri");

  // Apakah ada keturunan (anak atau cucu yang aktif)
  const adaKeturunanAktif = adaAnakLaki || adaAnakPerempuan || adaCucuLaki || adaCucuPerempuan;

  // Jumlah saudara aktif (untuk menentukan bagian ibu)
  const jumlahSaudaraAktif = hitungJumlahSaudaraAktif(ahliWarisMap, hajbResult);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cek kondisi Gharawain
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isGharawain =
    (adaSuami || adaIstri) &&
    adaAyah &&
    adaIbu &&
    !adaKeturunanAktif &&
    ahliWarisMap.size === 3;

  const hasilFurudhList: HasilAhliWaris[] = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian SUAMI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adaSuami) {
    const bagian = adaKeturunanAktif ? { p: 1, q: 4 } : { p: 1, q: 2 };
    const persentase = (bagian.p / bagian.q) * 100;
    hasilFurudhList.push({
      jenis: "suami",
      namaDisplay: "Suami",
      jumlahOrang: 1,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang: bagian.p,
      penyebut: bagian.q,
      persentase,
      nilaiTotal: (persentase / 100) * hartaUntukWaris,
      nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
      dasarHukum: "QS. An-Nisa: 12",
      penjelasan: adaKeturunanAktif
        ? "Mendapat 1/4 karena ada anak atau cucu."
        : "Mendapat 1/2 karena tidak ada anak atau cucu.",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian ISTRI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adaIstri) {
    const jmlIstri = jumlah("istri");
    const bagian = adaKeturunanAktif ? { p: 1, q: 8 } : { p: 1, q: 4 };
    const persentase = (bagian.p / bagian.q) * 100;
    const nilaiTotal = (persentase / 100) * hartaUntukWaris;
    hasilFurudhList.push({
      jenis: "istri",
      namaDisplay: jmlIstri > 1 ? `Istri (${jmlIstri} orang)` : "Istri",
      jumlahOrang: jmlIstri,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang: bagian.p,
      penyebut: bagian.q,
      persentase,
      nilaiTotal,
      nilaiPerOrang: jmlIstri > 0 ? nilaiTotal / jmlIstri : 0,
      dasarHukum: "QS. An-Nisa: 12",
      penjelasan:
        (adaKeturunanAktif
          ? "Mendapat 1/8 karena ada anak atau cucu."
          : "Mendapat 1/4 karena tidak ada anak atau cucu.") +
        (jmlIstri > 1 ? ` Dibagi rata untuk ${jmlIstri} istri.` : ""),
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian AYAH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Ayah bisa furudh saja, furudh+ashabah, atau murni ashabah
  let ayahSudahDihitungSebagaiAshabah = false;
  if (adaAyah) {
    if (adaAnakLaki || adaCucuLaki) {
      // Ayah hanya dapat 1/6 furudh
      const persentase = (1 / 6) * 100;
      hasilFurudhList.push({
        jenis: "ayah",
        namaDisplay: "Ayah",
        jumlahOrang: 1,
        golongan: "ashabul_furudh",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 6,
        persentase,
        nilaiTotal: (persentase / 100) * hartaUntukWaris,
        nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
        dasarHukum: "QS. An-Nisa: 11",
        penjelasan: "Mendapat 1/6 karena ada anak laki-laki atau cucu laki-laki.",
      });
    } else if (adaAnakPerempuan || adaCucuPerempuan) {
      // Ayah dapat 1/6 furudh + sisa ashabah
      // 1/6 dimasukkan sebagai furudh; ashabah ditangani nanti
      const persentase = (1 / 6) * 100;
      hasilFurudhList.push({
        jenis: "ayah",
        namaDisplay: "Ayah",
        jumlahOrang: 1,
        golongan: "ashabul_furudh",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 6,
        persentase,
        nilaiTotal: (persentase / 100) * hartaUntukWaris,
        nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
        dasarHukum: "QS. An-Nisa: 11",
        penjelasan:
          "Mendapat 1/6 sebagai furudh ditambah sisa harta sebagai ashabah, karena ada anak/cucu perempuan.",
      });
      // Ayah juga mendapat ashabah → ditandai agar tidak dihitung ulang
      ayahSudahDihitungSebagaiAshabah = true;
    }
    // Jika tidak ada anak/cucu: ayah murni ashabah → ditangani di ashabah calculator
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian IBU
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adaIbu) {
    let pembilang: number;
    let penyebut: number;
    let penjelasan: string;

    if (isGharawain) {
      // Gharawain: ibu mendapat 1/3 dari sisa setelah suami/istri
      // Dihitung setelah suami/istri mendapat bagian
      // Untuk sementara set 1/3 penuh, akan disesuaikan di bawah
      pembilang = 1;
      penyebut = 3;
      penjelasan =
        "Gharawain: Ibu mendapat 1/3 dari sisa setelah bagian suami/istri (keputusan Khalifah Umar bin Khattab r.a.).";
    } else if (adaKeturunanAktif || jumlahSaudaraAktif >= 2) {
      pembilang = 1;
      penyebut = 6;
      penjelasan =
        adaKeturunanAktif
          ? "Mendapat 1/6 karena ada anak atau cucu."
          : `Mendapat 1/6 karena ada ${jumlahSaudaraAktif} saudara atau lebih.`;
    } else {
      pembilang = 1;
      penyebut = 3;
      penjelasan = "Mendapat 1/3 karena tidak ada anak/cucu dan kurang dari 2 saudara.";
    }

    const persentase = (pembilang / penyebut) * 100;
    hasilFurudhList.push({
      jenis: "ibu",
      namaDisplay: "Ibu",
      jumlahOrang: 1,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang,
      penyebut,
      persentase,
      nilaiTotal: (persentase / 100) * hartaUntukWaris,
      nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
      dasarHukum: "QS. An-Nisa: 11",
      penjelasan,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian KAKEK (jika tidak ada ayah)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("kakek") && !ada("ayah")) {
    if (adaAnakLaki || adaCucuLaki) {
      const persentase = (1 / 6) * 100;
      hasilFurudhList.push({
        jenis: "kakek",
        namaDisplay: "Kakek (dari Ayah)",
        jumlahOrang: 1,
        golongan: "ashabul_furudh",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 6,
        persentase,
        nilaiTotal: (persentase / 100) * hartaUntukWaris,
        nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
        dasarHukum: "Ijma' Ulama",
        penjelasan: "Kakek berperan seperti ayah. Mendapat 1/6 karena ada anak/cucu laki-laki.",
      });
    } else if (adaAnakPerempuan || adaCucuPerempuan) {
      const persentase = (1 / 6) * 100;
      hasilFurudhList.push({
        jenis: "kakek",
        namaDisplay: "Kakek (dari Ayah)",
        jumlahOrang: 1,
        golongan: "ashabul_furudh",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 6,
        persentase,
        nilaiTotal: (persentase / 100) * hartaUntukWaris,
        nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
        dasarHukum: "Ijma' Ulama",
        penjelasan: "Kakek berperan seperti ayah. Mendapat 1/6 + sisa ashabah.",
      });
    }
    // Jika tidak ada anak/cucu: kakek murni ashabah (ditangani di ashabah)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian NENEK (dari Ibu)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("nenek_dari_ibu")) {
    const persentase = (1 / 6) * 100;
    hasilFurudhList.push({
      jenis: "nenek_dari_ibu",
      namaDisplay: "Nenek (dari Ibu)",
      jumlahOrang: 1,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang: 1,
      penyebut: 6,
      persentase,
      nilaiTotal: (persentase / 100) * hartaUntukWaris,
      nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
      dasarHukum: "HR. Ibnu Majah & Tirmidzi",
      penjelasan: "Nenek mendapat 1/6 jika tidak ada ibu.",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian NENEK (dari Ayah)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("nenek_dari_ayah")) {
    const persentase = (1 / 6) * 100;
    hasilFurudhList.push({
      jenis: "nenek_dari_ayah",
      namaDisplay: "Nenek (dari Ayah)",
      jumlahOrang: 1,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang: 1,
      penyebut: 6,
      persentase,
      nilaiTotal: (persentase / 100) * hartaUntukWaris,
      nilaiPerOrang: (persentase / 100) * hartaUntukWaris,
      dasarHukum: "HR. Ibnu Majah & Tirmidzi",
      penjelasan: "Nenek dari ayah mendapat 1/6 jika tidak ada ibu dan ayah.",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian ANAK PEREMPUAN (furudh, jika tidak ada anak laki)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adaAnakPerempuan && !adaAnakLaki) {
    const jmlAnakPerempuan = jumlah("anak_perempuan");
    let pembilang: number;
    let penyebut: number;
    let penjelasan: string;

    if (jmlAnakPerempuan === 1) {
      pembilang = 1;
      penyebut = 2;
      penjelasan = "1 anak perempuan mendapat 1/2.";
    } else {
      pembilang = 2;
      penyebut = 3;
      penjelasan = `${jmlAnakPerempuan} anak perempuan mendapat 2/3 bersama, dibagi rata.`;
    }

    const persentase = (pembilang / penyebut) * 100;
    const nilaiTotal = (persentase / 100) * hartaUntukWaris;
    hasilFurudhList.push({
      jenis: "anak_perempuan",
      namaDisplay:
        jmlAnakPerempuan > 1
          ? `Anak Perempuan (${jmlAnakPerempuan} orang)`
          : "Anak Perempuan",
      jumlahOrang: jmlAnakPerempuan,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang,
      penyebut,
      persentase,
      nilaiTotal,
      nilaiPerOrang: jmlAnakPerempuan > 0 ? nilaiTotal / jmlAnakPerempuan : 0,
      dasarHukum: "QS. An-Nisa: 11",
      penjelasan,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian CUCU PEREMPUAN (furudh, jika tidak ada anak)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adaCucuPerempuan && !adaAnakLaki && !adaAnakPerempuan && !adaCucuLaki) {
    const jmlCucuPerempuan = jumlah("cucu_perempuan_dari_anak_laki");
    let pembilang: number;
    let penyebut: number;
    let penjelasan: string;

    if (jmlCucuPerempuan === 1) {
      pembilang = 1;
      penyebut = 2;
      penjelasan = "1 cucu perempuan mendapat 1/2 (berperan seperti anak perempuan).";
    } else {
      pembilang = 2;
      penyebut = 3;
      penjelasan = `${jmlCucuPerempuan} cucu perempuan mendapat 2/3 bersama.`;
    }

    const persentase = (pembilang / penyebut) * 100;
    const nilaiTotal = (persentase / 100) * hartaUntukWaris;
    hasilFurudhList.push({
      jenis: "cucu_perempuan_dari_anak_laki",
      namaDisplay:
        jmlCucuPerempuan > 1
          ? `Cucu Perempuan (${jmlCucuPerempuan} orang)`
          : "Cucu Perempuan (dari Anak Laki)",
      jumlahOrang: jmlCucuPerempuan,
      golongan: "ashabul_furudh",
      status: "mendapat_bagian",
      pembilang,
      penyebut,
      persentase,
      nilaiTotal,
      nilaiPerOrang: jmlCucuPerempuan > 0 ? nilaiTotal / jmlCucuPerempuan : 0,
      dasarHukum: "QS. An-Nisa: 11 | Ijma' Ulama",
      penjelasan,
    });
  }

  // Cucu perempuan sebagai pelengkap 2/3 (jika ada 1 anak perempuan + cucu perempuan)
  if (
    adaCucuPerempuan &&
    !adaAnakLaki &&
    adaAnakPerempuan &&
    jumlah("anak_perempuan") === 1 &&
    !adaCucuLaki
  ) {
    const jmlCucuPerempuan = jumlah("cucu_perempuan_dari_anak_laki");
    const statusCucu = hajbResult.get("cucu_perempuan_dari_anak_laki");
    if (statusCucu?.status !== "terhijab_hirman") {
      const persentase = (1 / 6) * 100;
      const nilaiTotal = (persentase / 100) * hartaUntukWaris;
      hasilFurudhList.push({
        jenis: "cucu_perempuan_dari_anak_laki",
        namaDisplay:
          jmlCucuPerempuan > 1
            ? `Cucu Perempuan (${jmlCucuPerempuan} orang)`
            : "Cucu Perempuan (dari Anak Laki)",
        jumlahOrang: jmlCucuPerempuan,
        golongan: "ashabul_furudh",
        status: "mendapat_bagian",
        pembilang: 1,
        penyebut: 6,
        persentase,
        nilaiTotal,
        nilaiPerOrang: jmlCucuPerempuan > 0 ? nilaiTotal / jmlCucuPerempuan : 0,
        dasarHukum: "QS. An-Nisa: 11 | Ijma' Ulama",
        penjelasan:
          "Mendapat 1/6 sebagai pelengkap kuota 2/3 (ada 1 anak perempuan yang mendapat 1/2, dan cucu perempuan melengkapi hingga 2/3).",
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian SAUDARA KANDUNG PEREMPUAN (furudh, jika tidak ada anak/cucu/ayah)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (
    ada("saudara_kandung_perempuan") &&
    !adaAnakLaki &&
    !adaAnakPerempuan &&
    !adaCucuLaki &&
    !ada("saudara_kandung_laki") // jika ada saudara kandung laki → ashabah
  ) {
    const statusSaudara = hajbResult.get("saudara_kandung_perempuan");
    if (statusSaudara?.status === "mendapat_bagian") {
      const jmlSaudara = jumlah("saudara_kandung_perempuan");
      let pembilang: number;
      let penyebut: number;
      let penjelasan: string;

      // Jika ada anak perempuan → ashabah ma'al ghair (ditangani di ashabah)
      if (adaAnakPerempuan || adaCucuPerempuan) {
        // skip, ditangani di ashabah
      } else {
        if (jmlSaudara === 1) {
          pembilang = 1;
          penyebut = 2;
          penjelasan = "1 saudara kandung perempuan mendapat 1/2 (kalalah).";
        } else {
          pembilang = 2;
          penyebut = 3;
          penjelasan = `${jmlSaudara} saudara kandung perempuan mendapat 2/3 bersama (kalalah).`;
        }

        const persentase = (pembilang / penyebut) * 100;
        const nilaiTotal = (persentase / 100) * hartaUntukWaris;
        hasilFurudhList.push({
          jenis: "saudara_kandung_perempuan",
          namaDisplay:
            jmlSaudara > 1
              ? `Saudara Kandung Perempuan (${jmlSaudara} orang)`
              : "Saudara Kandung Perempuan",
          jumlahOrang: jmlSaudara,
          golongan: "ashabul_furudh",
          status: "mendapat_bagian",
          pembilang,
          penyebut,
          persentase,
          nilaiTotal,
          nilaiPerOrang: jmlSaudara > 0 ? nilaiTotal / jmlSaudara : 0,
          dasarHukum: "QS. An-Nisa: 176",
          penjelasan,
        });
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian SAUDARA SEBAPAK PEREMPUAN (furudh)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("saudara_sebapak_perempuan")) {
    const statusSPB = hajbResult.get("saudara_sebapak_perempuan");
    if (statusSPB?.status === "mendapat_bagian") {
      const jmlSPB = jumlah("saudara_sebapak_perempuan");
      const adaSKP = ada("saudara_kandung_perempuan");

      // Jika saudara kandung perempuan dapat 1/2 → saudara sebapak perempuan melengkapi ke 2/3
      if (
        adaSKP &&
        jumlah("saudara_kandung_perempuan") === 1 &&
        !adaAnakLaki && !adaAnakPerempuan && !adaCucuLaki &&
        !ada("saudara_kandung_laki")
      ) {
        const persentase = (1 / 6) * 100;
        const nilaiTotal = (persentase / 100) * hartaUntukWaris;
        hasilFurudhList.push({
          jenis: "saudara_sebapak_perempuan",
          namaDisplay: jmlSPB > 1 ? `Saudara Sebapak Perempuan (${jmlSPB} orang)` : "Saudara Sebapak Perempuan",
          jumlahOrang: jmlSPB,
          golongan: "ashabul_furudh",
          status: "mendapat_bagian",
          pembilang: 1,
          penyebut: 6,
          persentase,
          nilaiTotal,
          nilaiPerOrang: jmlSPB > 0 ? nilaiTotal / jmlSPB : 0,
          dasarHukum: "QS. An-Nisa: 176 | Ijma' Ulama",
          penjelasan: "Mendapat 1/6 sebagai pelengkap kuota 2/3 bersama saudara kandung perempuan yang mendapat 1/2.",
        });
      } else if (!ada("saudara_kandung_laki") && !ada("saudara_kandung_perempuan")) {
        // Tidak ada saudara kandung sama sekali → seperti saudara kandung perempuan
        if (!adaAnakLaki && !adaAnakPerempuan && !adaCucuLaki) {
          let pembilang: number;
          let penyebut: number;
          let penjelasan: string;

          if (jmlSPB === 1) {
            pembilang = 1;
            penyebut = 2;
            penjelasan = "1 saudara sebapak perempuan mendapat 1/2 (seperti saudara kandung perempuan).";
          } else {
            pembilang = 2;
            penyebut = 3;
            penjelasan = `${jmlSPB} saudara sebapak perempuan mendapat 2/3 bersama.`;
          }

          const persentase = (pembilang / penyebut) * 100;
          const nilaiTotal = (persentase / 100) * hartaUntukWaris;
          hasilFurudhList.push({
            jenis: "saudara_sebapak_perempuan",
            namaDisplay: jmlSPB > 1 ? `Saudara Sebapak Perempuan (${jmlSPB} orang)` : "Saudara Sebapak Perempuan",
            jumlahOrang: jmlSPB,
            golongan: "ashabul_furudh",
            status: "mendapat_bagian",
            pembilang,
            penyebut,
            persentase,
            nilaiTotal,
            nilaiPerOrang: jmlSPB > 0 ? nilaiTotal / jmlSPB : 0,
            dasarHukum: "QS. An-Nisa: 176 | Ijma' Ulama",
            penjelasan,
          });
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hitung bagian SAUDARA SEIBU
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const adaSaudaraSeibuLaki = ada("saudara_seibu_laki");
  const adaSaudaraSeibuPerempuan = ada("saudara_seibu_perempuan");

  if (adaSaudaraSeibuLaki || adaSaudaraSeibuPerempuan) {
    const jmlLaki = adaSaudaraSeibuLaki ? jumlah("saudara_seibu_laki") : 0;
    const jmlPerempuan = adaSaudaraSeibuPerempuan
      ? jumlah("saudara_seibu_perempuan")
      : 0;
    const totalSeibu = jmlLaki + jmlPerempuan;

    let pembilang: number;
    let penyebut: number;

    if (totalSeibu === 1) {
      pembilang = 1;
      penyebut = 6;
    } else {
      pembilang = 1;
      penyebut = 3;
    }

    const totalPersentase = (pembilang / penyebut) * 100;
    const totalNilai = (totalPersentase / 100) * hartaUntukWaris;

    // Dibagi rata antar semua saudara seibu (laki dan perempuan sama)
    if (adaSaudaraSeibuLaki) {
      const statusSSL = hajbResult.get("saudara_seibu_laki");
      if (statusSSL?.status === "mendapat_bagian") {
        const persentaseLaki = (totalPersentase * jmlLaki) / totalSeibu;
        const nilaiLaki = (totalNilai * jmlLaki) / totalSeibu;
        hasilFurudhList.push({
          jenis: "saudara_seibu_laki",
          namaDisplay: jmlLaki > 1 ? `Saudara Seibu Laki-laki (${jmlLaki} orang)` : "Saudara Seibu Laki-laki",
          jumlahOrang: jmlLaki,
          golongan: "ashabul_furudh",
          status: "mendapat_bagian",
          pembilang: jmlLaki,
          penyebut: totalSeibu * penyebut,
          persentase: persentaseLaki,
          nilaiTotal: nilaiLaki,
          nilaiPerOrang: jmlLaki > 0 ? nilaiLaki / jmlLaki : 0,
          dasarHukum: "QS. An-Nisa: 12",
          penjelasan:
            totalSeibu === 1
              ? "1 saudara seibu mendapat 1/6."
              : `Bersama saudara seibu lainnya mendapat total ${totalSeibu > 1 ? "1/3" : "1/6"}, dibagi rata.`,
        });
      }
    }

    if (adaSaudaraSeibuPerempuan) {
      const statusSSP = hajbResult.get("saudara_seibu_perempuan");
      if (statusSSP?.status === "mendapat_bagian") {
        const persentasePerempuan = (totalPersentase * jmlPerempuan) / totalSeibu;
        const nilaiPerempuan = (totalNilai * jmlPerempuan) / totalSeibu;
        hasilFurudhList.push({
          jenis: "saudara_seibu_perempuan",
          namaDisplay: jmlPerempuan > 1 ? `Saudara Seibu Perempuan (${jmlPerempuan} orang)` : "Saudara Seibu Perempuan",
          jumlahOrang: jmlPerempuan,
          golongan: "ashabul_furudh",
          status: "mendapat_bagian",
          pembilang: jmlPerempuan,
          penyebut: totalSeibu * penyebut,
          persentase: persentasePerempuan,
          nilaiTotal: nilaiPerempuan,
          nilaiPerOrang: jmlPerempuan > 0 ? nilaiPerempuan / jmlPerempuan : 0,
          dasarHukum: "QS. An-Nisa: 12",
          penjelasan:
            totalSeibu === 1
              ? "1 saudara seibu mendapat 1/6."
              : `Bersama saudara seibu lainnya mendapat total ${totalSeibu > 1 ? "1/3" : "1/6"}, dibagi rata.`,
        });
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Handle Gharawain khusus
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let hasilFurudhFinal = [...hasilFurudhList];

  if (isGharawain) {
    hasilFurudhFinal = hitungGharawain(hasilFurudhList, adaSuami);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 5: Cek Total Furudh & Tentukan Metode
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalFurudhPersen = hasilFurudhFinal
    .filter((h) => h.status === "mendapat_bagian")
    .reduce((acc, h) => acc + h.persentase, 0);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cek apakah ada ashabah
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const adaAshabahMurni =
    (ada("anak_laki")) ||
    (ada("cucu_laki_dari_anak_laki") && !ada("anak_laki")) ||
    (adaAyah && !adaAnakLaki && !adaCucuLaki) ||
    (ada("kakek") && !adaAyah && !adaAnakLaki && !adaCucuLaki) ||
    (ada("saudara_kandung_laki") && hajbResult.get("saudara_kandung_laki")?.status === "mendapat_bagian") ||
    (ada("saudara_sebapak_laki") && hajbResult.get("saudara_sebapak_laki")?.status === "mendapat_bagian");

  const adaAshabahMaalGhair =
    (ada("saudara_kandung_perempuan") && (adaAnakPerempuan || adaCucuPerempuan)) ||
    (ada("saudara_sebapak_perempuan") && (adaAnakPerempuan || adaCucuPerempuan));

  const adaAshabah = adaAshabahMurni || adaAshabahMaalGhair || ayahSudahDihitungSebagaiAshabah;

  let metode: MetodePenyelesaian = "normal";
  let penjelasanMetode = "Pembagian normal berdasarkan aturan faraid.";

  if (isGharawain) {
    metode = "gharawain";
    penjelasanMetode =
      "Masalah Gharawain (Umariyatain): Ketika ahli waris hanya terdiri dari suami/istri + ayah + ibu. Ibu mendapat 1/3 dari sisa setelah bagian suami/istri.";
  }

  let hasilSetelahMetode = [...hasilFurudhFinal];

  if (!isGharawain) {
    if (totalFurudhPersen > 100.01) {
      // 'Aul
      metode = "aul";
      penjelasanMetode = `Total bagian furudh = ${totalFurudhPersen.toFixed(2)}%, melebihi 100%. Dilakukan 'aul: semua bagian dikurangi proporsional.`;
      hasilSetelahMetode = applyAul(hasilFurudhFinal);
    } else if (totalFurudhPersen < 99.99 && !adaAshabah) {
      // Radd
      metode = "radd";
      penjelasanMetode = `Total bagian furudh = ${totalFurudhPersen.toFixed(2)}%, kurang dari 100% dan tidak ada ashabah. Sisa dikembalikan (radd) ke ahli waris furudh.`;
      hasilSetelahMetode = applyRadd(hasilFurudhFinal, adaSuami, adaIstri);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 6: Hitung Ashabah
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalPersen = hasilSetelahMetode
    .filter((h) => h.status === "mendapat_bagian")
    .reduce((acc, h) => acc + h.persentase, 0);

  let sisaPersen = Math.max(0, 100 - totalPersen);

  const hasilAshabah: HasilAhliWaris[] = [];

  if (adaAshabah && sisaPersen > 0.001 && metode !== "aul") {
    // Kasus khusus: Ayah + anak perempuan saja → ayah sudah dapat 1/6, sisanya adalah ashabahnya
    if (
      ayahSudahDihitungSebagaiAshabah &&
      !adaAnakLaki &&
      !adaCucuLaki
    ) {
      // Ayah mendapat sisa (sudah dicatat 1/6 furudh, sisa sebagai ashabah)
      const ayahFurudhItem = hasilSetelahMetode.find((h) => h.jenis === "ayah");
      if (ayahFurudhItem) {
        // Tambahkan sisa ke ayah
        const siasaUntukAyah = sisaPersen;
        const totalAyah = ayahFurudhItem.persentase + siasaUntukAyah;
        const nilaiTotalAyah = (totalAyah / 100) * hartaUntukWaris;
        hasilSetelahMetode = hasilSetelahMetode.map((h) => {
          if (h.jenis === "ayah") {
            return {
              ...h,
              persentase: totalAyah,
              nilaiTotal: nilaiTotalAyah,
              nilaiPerOrang: nilaiTotalAyah,
              golongan: "ashabul_furudh" as GolonganAhliWaris,
              penjelasan: `Mendapat 1/6 (${(1 / 6 * 100).toFixed(2)}%) furudh ditambah sisa ${siasaUntukAyah.toFixed(2)}% sebagai ashabah.`,
            };
          }
          return h;
        });
        sisaPersen = 0;
      }
    } else if (
      ada("kakek") &&
      !adaAyah &&
      (adaAnakPerempuan || adaCucuPerempuan) &&
      !adaAnakLaki &&
      !adaCucuLaki
    ) {
      // Kakek + anak perempuan saja → kakek mendapat 1/6 + sisa
      const kakekFurudhItem = hasilSetelahMetode.find((h) => h.jenis === "kakek");
      if (kakekFurudhItem) {
        const siasaUntukKakek = sisaPersen;
        const totalKakek = kakekFurudhItem.persentase + siasaUntukKakek;
        const nilaiTotalKakek = (totalKakek / 100) * hartaUntukWaris;
        hasilSetelahMetode = hasilSetelahMetode.map((h) => {
          if (h.jenis === "kakek") {
            return {
              ...h,
              persentase: totalKakek,
              nilaiTotal: nilaiTotalKakek,
              nilaiPerOrang: nilaiTotalKakek,
              penjelasan: `Mendapat 1/6 furudh ditambah sisa ${siasaUntukKakek.toFixed(2)}% sebagai ashabah.`,
            };
          }
          return h;
        });
        sisaPersen = 0;
      }
    } else {
      // Hitung ashabah biasa
      const ashabahHasil = hitungAshabah(
        ahliWarisMap,
        hajbResult,
        sisaPersen,
        hartaUntukWaris
      );
      hasilAshabah.push(...ashabahHasil);
      if (ashabahHasil.length > 0) {
        sisaPersen = 0;
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Gabungkan hasil furudh dan ashabah
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Tambahkan yang terhijab ke hasil
  const yangTerhijab: HasilAhliWaris[] = [];
  for (const [jenis, input] of ahliWarisMap) {
    const hajb = hajbResult.get(jenis);
    if (hajb?.status === "terhijab_hirman") {
      const info = AHLI_WARIS_INFO[jenis];
      yangTerhijab.push({
        jenis,
        namaDisplay: info.namaDisplay,
        jumlahOrang: input.jumlah,
        golongan: "ashabul_furudh",
        status: "terhijab_hirman",
        alasanHijab: hajb.alasanHijab,
        pembilang: 0,
        penyebut: 1,
        persentase: 0,
        nilaiTotal: 0,
        nilaiPerOrang: 0,
        dasarHukum: "Ijma' Ulama",
        penjelasan: hajb.alasanHijab ?? "Terhijab oleh ahli waris yang lebih dekat.",
      });
    }
  }

  // Cek apakah jenis sudah ada di furudhList (hindari duplikat)
  const jenisSudahAda = new Set(hasilSetelahMetode.map((h) => h.jenis));
  const ashabahBaru = hasilAshabah.filter((h) => !jenisSudahAda.has(h.jenis));

  const semuaHasil = [...hasilSetelahMetode, ...ashabahBaru, ...yangTerhijab];

  // Update nilaiTotal berdasarkan persentase final
  const semuaHasilDenganNilai = semuaHasil.map((h) => {
    if (h.status !== "mendapat_bagian") return h;
    const nilaiTotal = (h.persentase / 100) * hartaUntukWaris;
    return {
      ...h,
      nilaiTotal,
      nilaiPerOrang: h.jumlahOrang > 0 ? nilaiTotal / h.jumlahOrang : 0,
    };
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 8: Validasi
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const totalPersentaseFinal = semuaHasilDenganNilai
    .filter((h) => h.status === "mendapat_bagian")
    .reduce((acc, h) => acc + h.persentase, 0);

  const isValid = Math.abs(totalPersentaseFinal - 100) < 0.1 || hartaUntukWaris === 0;

  if (!isValid && hartaUntukWaris > 0) {
    pesanError.push(
      `Validasi: Total persentase = ${totalPersentaseFinal.toFixed(4)}%. Harap konsultasikan dengan ulama untuk kasus ini.`
    );
  }

  const totalBagianFurudh = hasilSetelahMetode
    .filter((h) => h.status === "mendapat_bagian" && h.golongan === "ashabul_furudh")
    .reduce((acc, h) => acc + h.persentase / 100, 0);

  const totalBagianAshabah = ashabahBaru
    .filter((h) => h.status === "mendapat_bagian")
    .reduce((acc, h) => acc + h.persentase / 100, 0);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LANGKAH 9: Generate Insights
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const hasilSementara: Omit<HasilPembagianWaris, "insights"> = {
    harta: hartaFinal,
    ahliWarisInput,
    metode,
    penjelasanMetode,
    hasilPerAhliWaris: semuaHasilDenganNilai,
    totalBagianFurudh,
    totalBagianAshabah,
    sisaSetelahFurudh: sisaPersen,
    aulFaktor: metode === "aul" ? totalFurudhPersen / 100 : undefined,
    totalPersentase: totalPersentaseFinal,
    isValid,
    pesanError,
  };

  const insights = generateWarisInsights(hasilSementara);

  return {
    ...hasilSementara,
    insights,
  };
}

/**
 * Hitung kasus Gharawain/Umariyatain
 * Kondisi: hanya suami/istri + ayah + ibu
 * Ibu mendapat 1/3 dari sisa setelah suami/istri
 */
function hitungGharawain(
  hasilFurudhList: HasilAhliWaris[],
  adaSuami: boolean
): HasilAhliWaris[] {
  const suamiItem = hasilFurudhList.find((h) => h.jenis === "suami");
  const istriItem = hasilFurudhList.find((h) => h.jenis === "istri");
  const ayahItem = hasilFurudhList.find((h) => h.jenis === "ayah");
  const ibuItem = hasilFurudhList.find((h) => h.jenis === "ibu");

  const pasanganPersen = adaSuami
    ? (suamiItem?.persentase ?? 0)
    : (istriItem?.persentase ?? 0);

  const sisaSetelahPasangan = 100 - pasanganPersen;
  const ibuPersen = sisaSetelahPasangan / 3;
  const ayahPersen = sisaSetelahPasangan - ibuPersen;

  const hasil: HasilAhliWaris[] = [];

  if (suamiItem) hasil.push(suamiItem);
  if (istriItem) hasil.push(istriItem);

  if (ayahItem) {
    hasil.push({
      ...ayahItem,
      persentase: ayahPersen,
      golongan: "ashabah",
      penjelasan: `Gharawain: Mendapat sisa ${ayahPersen.toFixed(2)}% setelah suami/istri dan ibu mendapat bagiannya.`,
    });
  }

  if (ibuItem) {
    hasil.push({
      ...ibuItem,
      pembilang: 1,
      penyebut: 3,
      persentase: ibuPersen,
      penjelasan: `Gharawain: Mendapat 1/3 dari sisa (${ibuPersen.toFixed(2)}%) setelah bagian ${adaSuami ? "suami" : "istri"}.`,
    });
  }

  return hasil;
}

/**
 * Buat hasil kosong jika tidak ada ahli waris
 */
function buatHasilKosong(
  harta: HartaWarisan,
  ahliWarisInput: AhliWarisInput[],
  pesanError: string[]
): HasilPembagianWaris {
  pesanError.push("Tidak ada ahli waris yang valid untuk dihitung.");
  return {
    harta,
    ahliWarisInput,
    metode: "normal",
    penjelasanMetode: "Tidak ada ahli waris yang valid.",
    hasilPerAhliWaris: [],
    totalBagianFurudh: 0,
    totalBagianAshabah: 0,
    sisaSetelahFurudh: 0,
    totalPersentase: 0,
    isValid: false,
    pesanError,
    insights: [
      {
        tipe: "perhatian",
        judul: "Tidak Ada Ahli Waris",
        pesan: "Silakan pilih minimal satu ahli waris untuk menghitung pembagian waris.",
        icon: "⚠️",
      },
    ],
  };
}
