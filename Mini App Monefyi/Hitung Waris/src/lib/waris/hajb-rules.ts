import type {
  JenisAhliWaris,
  AhliWarisInput,
  StatusPenerimaan,
} from "@/types/hitung-waris";

export interface HajbResult {
  status: StatusPenerimaan;
  alasanHijab?: string;
}

/**
 * Terapkan semua aturan hajb (penghalang waris) dalam faraid Islam.
 * Returns map dari jenis ahli waris ke status penerimaan mereka.
 */
export function applyHajbRules(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>
): Map<JenisAhliWaris, HajbResult> {
  const result = new Map<JenisAhliWaris, HajbResult>();

  // Inisialisasi semua yang ada sebagai mendapat_bagian
  for (const [jenis] of ahliWaris) {
    result.set(jenis, { status: "mendapat_bagian" });
  }

  const ada = (jenis: JenisAhliWaris): boolean =>
    ahliWaris.has(jenis) && (ahliWaris.get(jenis)?.isAda ?? false);

  const setHirman = (jenis: JenisAhliWaris, alasan: string): void => {
    if (ada(jenis)) {
      result.set(jenis, { status: "terhijab_hirman", alasanHijab: alasan });
    }
  };

  const setNuqshan = (jenis: JenisAhliWaris, alasan: string): void => {
    if (ada(jenis)) {
      const current = result.get(jenis);
      // Jangan override hirman dengan nuqshan
      if (current?.status !== "terhijab_hirman") {
        result.set(jenis, { status: "terhijab_nuqshan", alasanHijab: alasan });
      }
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH ANAK LAKI-LAKI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("anak_laki")) {
    // Menghijab hirman
    setHirman(
      "cucu_laki_dari_anak_laki",
      "Terhijab oleh anak laki-laki. Cucu laki-laki hanya mendapat bagian jika tidak ada anak laki-laki yang lebih dekat."
    );
    setHirman(
      "saudara_kandung_laki",
      "Terhijab oleh anak laki-laki. Anak laki-laki menghalangi saudara kandung laki-laki dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_kandung_perempuan",
      "Terhijab oleh anak laki-laki. Saudara kandung perempuan tidak mendapat bagian jika ada anak laki-laki (kecuali ada kondisi ashabah ma'al ghair)."
    );
    setHirman(
      "saudara_sebapak_laki",
      "Terhijab oleh anak laki-laki. Saudara sebapak tidak mendapat warisan jika ada anak laki-laki."
    );
    setHirman(
      "saudara_sebapak_perempuan",
      "Terhijab oleh anak laki-laki. Saudara sebapak perempuan tidak mendapat warisan jika ada anak laki-laki."
    );
    setHirman(
      "saudara_seibu_laki",
      "Terhijab oleh anak laki-laki. Saudara seibu tidak mendapat warisan jika ada keturunan (anak) dari almarhum."
    );
    setHirman(
      "saudara_seibu_perempuan",
      "Terhijab oleh anak laki-laki. Saudara seibu tidak mendapat warisan jika ada keturunan (anak) dari almarhum."
    );

    // Menghijab nuqshan
    setNuqshan(
      "suami",
      "Bagian suami berkurang dari 1/2 menjadi 1/4 karena adanya anak laki-laki (ada keturunan almarhum)."
    );
    setNuqshan(
      "istri",
      "Bagian istri berkurang dari 1/4 menjadi 1/8 karena adanya anak laki-laki (ada keturunan almarhum)."
    );
    setNuqshan(
      "ibu",
      "Bagian ibu berkurang dari 1/3 menjadi 1/6 karena adanya anak laki-laki (ada keturunan almarhum)."
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH ANAK PEREMPUAN (lebih dari satu)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("anak_perempuan")) {
    const jumlahAnakPerempuan = ahliWaris.get("anak_perempuan")?.jumlah ?? 0;

    // Anak perempuan juga menghijab saudara seibu
    setHirman(
      "saudara_seibu_laki",
      "Terhijab oleh anak perempuan. Saudara seibu tidak mendapat warisan jika ada keturunan (anak) dari almarhum."
    );
    setHirman(
      "saudara_seibu_perempuan",
      "Terhijab oleh anak perempuan. Saudara seibu tidak mendapat warisan jika ada keturunan (anak) dari almarhum."
    );

    // Nuqshan pada suami dan istri
    setNuqshan(
      "suami",
      "Bagian suami berkurang dari 1/2 menjadi 1/4 karena adanya anak perempuan (ada keturunan almarhum)."
    );
    setNuqshan(
      "istri",
      "Bagian istri berkurang dari 1/4 menjadi 1/8 karena adanya anak perempuan (ada keturunan almarhum)."
    );
    setNuqshan(
      "ibu",
      "Bagian ibu berkurang dari 1/3 menjadi 1/6 karena adanya anak perempuan (ada keturunan almarhum)."
    );

    // Dua atau lebih anak perempuan menghijab cucu perempuan
    // KECUALI ada cucu laki yang menyertai
    if (jumlahAnakPerempuan >= 2 && !ada("cucu_laki_dari_anak_laki")) {
      setHirman(
        "cucu_perempuan_dari_anak_laki",
        "Terhijab oleh dua atau lebih anak perempuan. Cucu perempuan dari anak laki tidak mendapat bagian tambahan karena kuota 2/3 sudah terpenuhi oleh anak perempuan, dan tidak ada cucu laki-laki yang menyertai."
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH CUCU LAKI-LAKI (jika tidak ada anak laki)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("cucu_laki_dari_anak_laki") && !ada("anak_laki")) {
    const cucuStatus = result.get("cucu_laki_dari_anak_laki");
    if (cucuStatus?.status === "mendapat_bagian") {
      setHirman(
        "saudara_kandung_laki",
        "Terhijab oleh cucu laki-laki (dari anak laki). Cucu laki-laki berperan seperti anak laki-laki dan menghalangi saudara."
      );
      setHirman(
        "saudara_kandung_perempuan",
        "Terhijab oleh cucu laki-laki (dari anak laki). Cucu laki-laki berperan seperti anak laki-laki dan menghalangi saudara kandung perempuan."
      );
      setHirman(
        "saudara_sebapak_laki",
        "Terhijab oleh cucu laki-laki (dari anak laki). Cucu laki-laki berperan seperti anak laki-laki dan menghalangi saudara sebapak."
      );
      setHirman(
        "saudara_sebapak_perempuan",
        "Terhijab oleh cucu laki-laki (dari anak laki). Cucu laki-laki berperan seperti anak laki-laki dan menghalangi saudara sebapak perempuan."
      );
      setHirman(
        "saudara_seibu_laki",
        "Terhijab oleh cucu laki-laki (dari anak laki). Keturunan almarhum (cucu) menghalangi saudara seibu."
      );
      setHirman(
        "saudara_seibu_perempuan",
        "Terhijab oleh cucu laki-laki (dari anak laki). Keturunan almarhum (cucu) menghalangi saudara seibu."
      );

      setNuqshan(
        "suami",
        "Bagian suami berkurang dari 1/2 menjadi 1/4 karena adanya cucu laki-laki (ada keturunan almarhum)."
      );
      setNuqshan(
        "istri",
        "Bagian istri berkurang dari 1/4 menjadi 1/8 karena adanya cucu laki-laki (ada keturunan almarhum)."
      );
      setNuqshan(
        "ibu",
        "Bagian ibu berkurang dari 1/3 menjadi 1/6 karena adanya cucu laki-laki (ada keturunan almarhum)."
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH CUCU PEREMPUAN (jika tidak ada anak)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (
    ada("cucu_perempuan_dari_anak_laki") &&
    !ada("anak_laki") &&
    !ada("anak_perempuan")
  ) {
    const cucuPerStatus = result.get("cucu_perempuan_dari_anak_laki");
    if (cucuPerStatus?.status === "mendapat_bagian") {
      setHirman(
        "saudara_seibu_laki",
        "Terhijab oleh cucu perempuan dari anak laki. Keturunan almarhum menghalangi saudara seibu."
      );
      setHirman(
        "saudara_seibu_perempuan",
        "Terhijab oleh cucu perempuan dari anak laki. Keturunan almarhum menghalangi saudara seibu."
      );

      setNuqshan(
        "suami",
        "Bagian suami berkurang dari 1/2 menjadi 1/4 karena adanya cucu perempuan (ada keturunan almarhum)."
      );
      setNuqshan(
        "istri",
        "Bagian istri berkurang dari 1/4 menjadi 1/8 karena adanya cucu perempuan (ada keturunan almarhum)."
      );
      setNuqshan(
        "ibu",
        "Bagian ibu berkurang dari 1/3 menjadi 1/6 karena adanya cucu perempuan (ada keturunan almarhum)."
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH AYAH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("ayah")) {
    setHirman(
      "kakek",
      "Terhijab oleh ayah. Kakek (ayah dari ayah) tidak mendapat warisan selama ayah masih hidup karena ayah lebih dekat derajatnya."
    );
    setHirman(
      "saudara_kandung_laki",
      "Terhijab oleh ayah. Ayah menghalangi semua saudara dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_kandung_perempuan",
      "Terhijab oleh ayah. Ayah menghalangi saudara kandung perempuan dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_sebapak_laki",
      "Terhijab oleh ayah. Ayah menghalangi saudara sebapak dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_sebapak_perempuan",
      "Terhijab oleh ayah. Ayah menghalangi saudara sebapak perempuan dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_seibu_laki",
      "Terhijab oleh ayah. Ayah menghalangi saudara seibu dari mendapat bagian warisan."
    );
    setHirman(
      "saudara_seibu_perempuan",
      "Terhijab oleh ayah. Ayah menghalangi saudara seibu perempuan dari mendapat bagian warisan."
    );
    setHirman(
      "nenek_dari_ayah",
      "Terhijab oleh ayah. Nenek dari ayah tidak mendapat warisan selama ayah masih hidup."
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH IBU
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("ibu")) {
    setHirman(
      "nenek_dari_ibu",
      "Terhijab oleh ibu. Nenek dari ibu tidak mendapat warisan selama ibu masih hidup."
    );
    setHirman(
      "nenek_dari_ayah",
      "Terhijab oleh ibu. Nenek dari ayah juga terhijab oleh ibu berdasarkan pendapat ulama yang kuat."
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH 2+ SAUDARA (mengurangi bagian ibu dari 1/3 ke 1/6)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Ini ditangani dalam perhitungan bagian ibu di engine utama

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH SAUDARA KANDUNG LAKI-LAKI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("saudara_kandung_laki")) {
    const saudKandungLakiStatus = result.get("saudara_kandung_laki");
    if (saudKandungLakiStatus?.status === "mendapat_bagian") {
      setHirman(
        "saudara_sebapak_laki",
        "Terhijab oleh saudara kandung laki-laki. Saudara kandung (seibu seayah) lebih diutamakan daripada saudara sebapak."
      );
      setHirman(
        "saudara_sebapak_perempuan",
        "Terhijab oleh saudara kandung laki-laki. Saudara kandung laki-laki menghalangi saudara sebapak perempuan dari mendapat bagian."
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HAJB OLEH KAKEK (jika tidak ada ayah)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (ada("kakek") && !ada("ayah")) {
    const kakekStatus = result.get("kakek");
    if (kakekStatus?.status === "mendapat_bagian") {
      // Kakek menghijab saudara (pendapat mayoritas)
      setHirman(
        "saudara_kandung_laki",
        "Terhijab oleh kakek (ayah dari ayah). Berdasarkan pendapat mayoritas ulama, kakek menghijab saudara."
      );
      setHirman(
        "saudara_kandung_perempuan",
        "Terhijab oleh kakek (ayah dari ayah). Berdasarkan pendapat mayoritas ulama, kakek menghijab saudara."
      );
      setHirman(
        "saudara_sebapak_laki",
        "Terhijab oleh kakek. Kakek menghalangi saudara sebapak dari mendapat warisan."
      );
      setHirman(
        "saudara_sebapak_perempuan",
        "Terhijab oleh kakek. Kakek menghalangi saudara sebapak perempuan dari mendapat warisan."
      );
      setHirman(
        "saudara_seibu_laki",
        "Terhijab oleh kakek. Kakek (sebagai pengganti ayah) menghalangi saudara seibu."
      );
      setHirman(
        "saudara_seibu_perempuan",
        "Terhijab oleh kakek. Kakek (sebagai pengganti ayah) menghalangi saudara seibu."
      );
    }
  }

  return result;
}

/**
 * Hitung jumlah saudara yang tidak terhijab (untuk menentukan bagian ibu)
 */
export function hitungJumlahSaudaraAktif(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>,
  hajbResult: Map<JenisAhliWaris, HajbResult>
): number {
  const jenisSaudara: JenisAhliWaris[] = [
    "saudara_kandung_laki",
    "saudara_kandung_perempuan",
    "saudara_sebapak_laki",
    "saudara_sebapak_perempuan",
    "saudara_seibu_laki",
    "saudara_seibu_perempuan",
  ];

  let total = 0;
  for (const jenis of jenisSaudara) {
    const input = ahliWaris.get(jenis);
    const status = hajbResult.get(jenis);
    if (
      input?.isAda &&
      status?.status === "mendapat_bagian"
    ) {
      total += input.jumlah;
    }
  }
  return total;
}

/**
 * Cek apakah ada keturunan (anak atau cucu) yang tidak terhijab
 */
export function adaKeturunan(
  ahliWaris: Map<JenisAhliWaris, AhliWarisInput>,
  hajbResult: Map<JenisAhliWaris, HajbResult>
): boolean {
  const jenisKeturunan: JenisAhliWaris[] = [
    "anak_laki",
    "anak_perempuan",
    "cucu_laki_dari_anak_laki",
    "cucu_perempuan_dari_anak_laki",
  ];

  return jenisKeturunan.some((jenis) => {
    const input = ahliWaris.get(jenis);
    const status = hajbResult.get(jenis);
    return input?.isAda && status?.status !== "terhijab_hirman";
  });
}
