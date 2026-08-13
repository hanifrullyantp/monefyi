import type { HasilPembagianWaris, WarisInsight } from "@/types/hitung-waris";

/**
 * Generate insights edukatif berdasarkan hasil kalkulasi waris
 */
export function generateWarisInsights(
  hasil: Omit<HasilPembagianWaris, "insights">
): WarisInsight[] {
  const insights: WarisInsight[] = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight tentang metode penyelesaian
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (hasil.metode === "aul") {
    insights.push({
      tipe: "penting",
      judul: "Terjadi 'Aul",
      pesan:
        "Total bagian yang ditetapkan Al-Qur'an melebihi 100% dari harta warisan. Dalam kondisi ini, semua bagian dikurangi secara proporsional agar total tetap 100%. Ini adalah solusi bijak yang disepakati para sahabat Nabi ﷺ untuk menjaga keadilan.",
      icon: "⚖️",
    });
  }

  if (hasil.metode === "radd") {
    insights.push({
      tipe: "info",
      judul: "Terjadi Radd (Pengembalian)",
      pesan:
        "Ada sisa harta setelah semua ashabul furudh mendapat bagiannya, dan tidak ada ashabah. Sisa ini dikembalikan (radd) ke ahli waris furudh secara proporsional, kecuali suami/istri menurut pendapat mayoritas ulama.",
      icon: "↩️",
    });
  }

  if (hasil.metode === "gharawain") {
    insights.push({
      tipe: "penting",
      judul: "Masalah Gharawain / Umariyatain",
      pesan:
        "Ini adalah masalah khusus yang diputuskan oleh Khalifah Umar bin Khattab r.a. Ketika ahli waris hanya suami/istri + ayah + ibu, ibu mendapat 1/3 dari sisa setelah bagian suami/istri. Kasus ini dinamakan 'Umariyatain' karena Umar memutuskan dua kali dengan hukum yang sama.",
      icon: "📜",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight tentang yang terhijab
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const yangTerhijab = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "terhijab_hirman"
  );

  if (yangTerhijab.length > 0) {
    insights.push({
      tipe: "info",
      judul: "Terdapat Ahli Waris yang Terhijab",
      pesan: `${yangTerhijab.length} ahli waris tidak mendapat bagian warisan karena terhalang (hijab) oleh ahli waris yang lebih dekat. Ini adalah sistem prioritas dalam faraid yang memastikan harta diterima oleh yang paling dekat hubungannya dengan almarhum. Ahli waris yang terhijab bisa mendapat nafkah dari ahli waris yang mewarisi.`,
      icon: "🚫",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight tentang wasiat
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wasiatMaksimal = hasil.harta.hartaBersih / 3;
  if (hasil.harta.nilaiWasiat > wasiatMaksimal) {
    insights.push({
      tipe: "perhatian",
      judul: "Wasiat Disesuaikan ke Batas Maksimal",
      pesan:
        "Wasiat tidak boleh melebihi 1/3 dari harta bersih. Ini berdasarkan ijma' (kesepakatan) ulama atas sabda Nabi ﷺ: 'Sepertiga, dan sepertiga itu sudah banyak' (HR. Bukhari & Muslim). Wasiat yang melebihi 1/3 otomatis disesuaikan ke batas maksimal.",
      icon: "⚠️",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight tentang hanya ahli waris perempuan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const jenisKelaminAktif = hasil.hasilPerAhliWaris
    .filter((h) => h.status === "mendapat_bagian")
    .map((h) => h.jenis);

  const hanyaPerempuan = jenisKelaminAktif.every((j) =>
    [
      "istri",
      "anak_perempuan",
      "ibu",
      "nenek_dari_ibu",
      "nenek_dari_ayah",
      "cucu_perempuan_dari_anak_laki",
      "saudara_kandung_perempuan",
      "saudara_sebapak_perempuan",
      "saudara_seibu_perempuan",
    ].includes(j)
  );

  if (hanyaPerempuan && jenisKelaminAktif.length > 0 && hasil.metode === "radd") {
    insights.push({
      tipe: "info",
      judul: "Sisa Dikembalikan ke Ahli Waris Perempuan",
      pesan:
        "Dalam kasus ini, setelah ashabul furudh mendapat bagiannya, tidak ada ashabah (laki-laki). Sisa harta dikembalikan (radd) ke para ahli waris perempuan secara proporsional sesuai bagian masing-masing.",
      icon: "👩",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Insight hutang besar
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (hasil.harta.hutangAlmarhum > hasil.harta.totalHarta * 0.5) {
    insights.push({
      tipe: "perhatian",
      judul: "Hutang Almarhum Cukup Besar",
      pesan:
        "Hutang almarhum melebihi 50% total harta. Dalam Islam, melunasi hutang adalah WAJIB dan harus diselesaikan sebelum harta dibagi. Jika hutang melebihi harta, ahli waris tidak wajib menanggung sisa hutang (kecuali secara sukarela).",
      icon: "💳",
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Saran konsultasi (selalu tampil)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  insights.push({
    tipe: "info",
    judul: "Anjuran Konsultasi dengan Ulama",
    pesan:
      "Hasil ini adalah simulasi kalkulasi faraid berdasarkan aturan umum. Kasus tertentu mungkin memerlukan ijtihad atau fatwa dari ulama yang berkompeten. Sangat dianjurkan untuk berkonsultasi dengan ulama atau Pengadilan Agama setempat untuk kepastian hukum.",
    icon: "🕌",
  });

  return insights;
}
