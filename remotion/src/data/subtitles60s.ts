export interface SubtitleCue {
  id: number;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  text: string;
}

export const SUBTITLES_60S: SubtitleCue[] = [
  {
    id: 1,
    startSec: 0.1,
    endSec: 4.2,
    startFrame: 3,
    endFrame: 126,
    text: "Banyak kontraktor dan pemilik bengkel terjebak di sini",
  },
  {
    id: 2,
    startSec: 4.3,
    endSec: 11.2,
    startFrame: 129,
    endFrame: 336,
    text: "Orderan masuk terus, proyek jalan ke mana-mana... tapi pas pembukuan, kok rekening tetap kering?",
  },
  {
    id: 3,
    startSec: 11.4,
    endSec: 18.5,
    startFrame: 342,
    endFrame: 555,
    text: "Bukan karena kamu kurang kerja keras, tapi karena hitungan estimasimu masih pakai insting dan coretan kertas",
  },
  {
    id: 4,
    startSec: 18.7,
    endSec: 25.1,
    startFrame: 561,
    endFrame: 753,
    text: "Satu meter bahan yang luput dihitung, sampai biaya tukang yang molor...",
  },
  {
    id: 5,
    startSec: 25.3,
    endSec: 32.2,
    startFrame: 759,
    endFrame: 966,
    text: "Semua biaya gaib itu langsung memakan habis margin keuntunganmu tanpa kamu sadari",
  },
  {
    id: 6,
    startSec: 32.4,
    endSec: 39.0,
    startFrame: 972,
    endFrame: 1170,
    text: "Belum lagi saat customer menawar, kamu bingung: masih untung atau malah nombok?",
  },
  {
    id: 7,
    startSec: 39.2,
    endSec: 43.8,
    startFrame: 1176,
    endFrame: 1314,
    text: "Itulah kenapa kamu butuh Monefyi Estimator",
  },
  {
    id: 8,
    startSec: 44.0,
    endSec: 54.0,
    startFrame: 1320,
    endFrame: 1620,
    text: "Cukup masukkan ukuran dari chat atau lapangan, sistem langsung mengkalkulasi kebutuhan bahan, ongkos kerja, hingga batas aman diskon saat negosiasi",
  },
  {
    id: 9,
    startSec: 54.2,
    endSec: 58.2,
    startFrame: 1626,
    endFrame: 1746,
    text: "Semua rincian transparan, hitungan akurat saat itu juga",
  },
  {
    id: 10,
    startSec: 58.4,
    endSec: 63.2,
    startFrame: 1752,
    endFrame: 1896,
    text: "Kirim surat penawaran resmi format PDF bertanda tangan digital langsung via WhatsApp",
  },
  {
    id: 11,
    startSec: 63.4,
    endSec: 68.0,
    startFrame: 1902,
    endFrame: 2040,
    text: "Tinggalkan cara lama, amankan keuntungan setiap proyekmu sekarang di estimator.monefyi.com",
  },
];

