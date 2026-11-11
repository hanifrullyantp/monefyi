export interface SubtitleCue {
  id: number;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  text: string;
}

export const SUBTITLES_30S: SubtitleCue[] = [
  {
    id: 1,
    startSec: 0.1,
    endSec: 1.9,
    startFrame: 3,
    endFrame: 57,
    text: "Banjir chat tanya harga",
  },
  {
    id: 2,
    startSec: 2.1,
    endSec: 4.8,
    startFrame: 63,
    endFrame: 144,
    text: "tapi pas disurvei... ternyata zonk?",
  },
  {
    id: 3,
    startSec: 5.0,
    endSec: 6.8,
    startFrame: 150,
    endFrame: 204,
    text: "Stop buang waktu!",
  },
  {
    id: 4,
    startSec: 7.0,
    endSec: 10.9,
    startFrame: 210,
    endFrame: 327,
    text: "Di Monefyi Estimator, kamu bisa saring pembeli serius dalam hitungan detik",
  },
  {
    id: 5,
    startSec: 11.1,
    endSec: 15.8,
    startFrame: 333,
    endFrame: 474,
    text: "Ketik ukuran dari chat, modal riil dan margin untung langsung terhitung otomatis",
  },
  {
    id: 6,
    startSec: 16.0,
    endSec: 21.8,
    startFrame: 480,
    endFrame: 654,
    text: "Kirim penawaran resmi format PDF lengkap dengan tanda tangan digital langsung ke WhatsApp",
  },
  {
    id: 7,
    startSec: 22.0,
    endSec: 24.8,
    startFrame: 660,
    endFrame: 744,
    text: "Closing lebih cepat, untung aman tanpa boncos",
  },
  {
    id: 8,
    startSec: 25.0,
    endSec: 28.2,
    startFrame: 750,
    endFrame: 846,
    text: "Coba gratis di estimator.monefyi.com",
  },
];

