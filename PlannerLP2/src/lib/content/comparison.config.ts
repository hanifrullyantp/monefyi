/**
 * Satu sumber kebenaran — tabel perbandingan manfaat (bukan fitur teknis) di landing Estimator.
 */

export type ComparisonRowStatus = "live" | "soon";

export type ComparisonBenefitRow = {
  id: string;
  situation: string;
  old: string;
  new: string;
  status: ComparisonRowStatus;
  primary: boolean;
};

export const COMPARISON_SECTION = {
  badge: "Perbandingan",
  /** Default headline — alternatif disimpan untuk eksperimen copy. */
  title: "Bedanya Terasa di Setiap Proyek",
  titleAlternatives: [
    "Kenapa Harus Monefyi Estimator?",
    "Dari Excel & WA ke Alur yang Lebih Rapi",
  ],
  subtitle:
    "Bukan daftar fitur — ini perbedaan yang kamu rasakan di lapangan, proyek demi proyek.",
  columnHeaders: {
    situation: "Situasi",
    old: "Cara lama (Excel & WA)",
    new: "Dengan Estimator",
  },
  closingLine:
    "Mulai dari satu proyek: hitung, kirim penawaran, dan lanjut tanpa input ulang yang melelahkan.",
  ctaLabel: "Coba Gratis",
  expandLabel: "Lihat semua perbandingan",
  collapseLabel: "Sembunyikan",
  mobileLabels: {
    old: "Dulu",
    new: "Sekarang",
  },
} as const;

export const COMPARISON_ROWS: ComparisonBenefitRow[] = [
  {
    id: "klien-minta-harga",
    situation: "Klien minta harga",
    old: "Hitung ulang di kalkulator atau Excel, kabari 1–2 hari lagi",
    new: "Harga muncul di lokasi, klien langsung melihat angkanya",
    status: "live",
    primary: true,
  },
  {
    id: "chat-wa-masuk",
    situation: "Chat WA masuk",
    old: "Survei semua yang chat, banyak yang cuma tanya-tanya",
    new: "Disaring dulu lewat WA, survei hanya yang cocok budget",
    status: "live",
    primary: true,
  },
  {
    id: "kirim-penawaran",
    situation: "Kirim penawaran",
    old: "Ketik ulang di Word/Excel, tampilan beda tiap klien",
    new: "PDF rapi berlogo, langsung terkirim ke WA sebelum pulang",
    status: "live",
    primary: true,
  },
  {
    id: "klien-setuju",
    situation: "Klien setuju",
    old: "Catat ulang data klien dan harga ke jadwal kerja",
    new: "Deal langsung jadi proyek, tanpa input ulang",
    status: "live",
    primary: true,
  },
  {
    id: "proyek-berjalan",
    situation: "Proyek berjalan",
    old: "Jadwal di kepala dan grup WA, tugas sering terlewat",
    new: "Timeline dan tugas jelas, tahu apa yang dikerjakan hari ini",
    status: "live",
    primary: true,
  },
  {
    id: "uang-keluar",
    situation: "Uang keluar",
    old: "Baru ketahuan untung atau rugi setelah proyek selesai",
    new: "Pengeluaran tercatat per proyek, margin terlihat sejak awal",
    status: "live",
    primary: true,
  },
  {
    id: "klien-tanya-progres",
    situation: "Klien tanya progres",
    old: "Dijawab satu-satu lewat chat",
    new: "Klien cek progres sendiri lewat portal",
    status: "soon",
    primary: false,
  },
  {
    id: "menagih-termin",
    situation: "Menagih termin",
    old: "Hitung termin manual, kadang lupa menagih",
    new: "Jadwal termin + PDF invoice siap, tagih lewat WA tanpa hitung ulang",
    status: "live",
    primary: false,
  },
  {
    id: "tim-ikut-bekerja",
    situation: "Tim ikut bekerja",
    old: "Berbagi satu file, data bisa tertimpa",
    new: "Tiap orang punya akses sesuai perannya (paket tim / Planner Pro)",
    status: "live",
    primary: false,
  },
];

export function getPrimaryComparisonRows(): ComparisonBenefitRow[] {
  return COMPARISON_ROWS.filter((r) => r.primary);
}

export function getSecondaryComparisonRows(): ComparisonBenefitRow[] {
  return COMPARISON_ROWS.filter((r) => !r.primary);
}
