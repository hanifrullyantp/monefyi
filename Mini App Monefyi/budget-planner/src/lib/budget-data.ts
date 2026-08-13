import type { MetodeInfo } from "@/types/budget-planner";

export const METODE_LIST: MetodeInfo[] = [
  {
    id: "503020",
    nama: "50/30/20",
    deskripsi: "Metode paling populer untuk pemula. Sederhana dan seimbang.",
    cocokUntuk: "Pemula, karyawan tetap, yang ingin mulai mengatur keuangan",
    tag: "Paling Populer",
    kelebihan: [
      "Sangat mudah dipahami dan diterapkan",
      "Seimbang antara kebutuhan, kenikmatan, dan masa depan",
      "Cukup fleksibel untuk berbagai level penghasilan",
    ],
    kekurangan: [
      "Tidak ada komponen sedekah/zakat secara eksplisit",
      "30% keinginan mungkin terlalu besar untuk yang punya hutang",
      "Kurang detail untuk pengelolaan yang lebih cermat",
    ],
    alokasi: [
      {
        label: "Kebutuhan",
        persentase: 50,
        tipe: "kebutuhan",
        warna: "#3b82f6",
      },
      {
        label: "Keinginan",
        persentase: 30,
        tipe: "keinginan",
        warna: "#8b5cf6",
      },
      {
        label: "Tabungan",
        persentase: 20,
        tipe: "tabungan",
        warna: "#10b981",
      },
    ],
    warna: "#10b981",
    icon: "PieChart",
  },
  {
    id: "40302010",
    nama: "40/30/20/10",
    deskripsi:
      "Metode seimbang dengan komponen sedekah, zakat, dan infaq. Islami.",
    cocokUntuk:
      "Muslim yang ingin mengintegrasikan nilai Islam dalam keuangan",
    tag: "Islami",
    kelebihan: [
      "Mengintegrasikan kewajiban zakat dan sunnah sedekah",
      "Seimbang antara dunia dan akhirat",
      "Membangun kebiasaan berbagi sejak dini",
    ],
    kekurangan: [
      "10% untuk sedekah bisa terasa berat saat penghasilan rendah",
      "Kebutuhan hidup lebih ketat di 40%",
    ],
    alokasi: [
      {
        label: "Kebutuhan",
        persentase: 40,
        tipe: "kebutuhan",
        warna: "#3b82f6",
      },
      {
        label: "Keinginan",
        persentase: 30,
        tipe: "keinginan",
        warna: "#8b5cf6",
      },
      {
        label: "Tabungan",
        persentase: 20,
        tipe: "tabungan",
        warna: "#10b981",
      },
      {
        label: "Sedekah/Zakat",
        persentase: 10,
        tipe: "sedekah",
        warna: "#f59e0b",
      },
    ],
    warna: "#f59e0b",
    icon: "Heart",
  },
  {
    id: "702010",
    nama: "70/20/10",
    deskripsi: "Metode paling simpel. Cocok yang penghasilan baru cukup.",
    cocokUntuk:
      "Fresh graduate, penghasilan pas-pasan, atau yang baru mulai",
    tag: "Untuk Pemula",
    kelebihan: [
      "Sangat mudah diingat",
      "Fleksibel di 70% pengeluaran",
      "Tetap ada komponen tabungan dan cicilan",
    ],
    kekurangan: [
      "Tidak ada pemisahan kebutuhan dan keinginan",
      "20% tabungan lebih kecil dari ideal",
    ],
    alokasi: [
      {
        label: "Pengeluaran",
        persentase: 70,
        tipe: "kebutuhan",
        warna: "#3b82f6",
      },
      {
        label: "Tabungan",
        persentase: 20,
        tipe: "tabungan",
        warna: "#10b981",
      },
      {
        label: "Hutang/Donasi",
        persentase: 10,
        tipe: "hutang",
        warna: "#ef4444",
      },
    ],
    warna: "#60a5fa",
    icon: "Zap",
  },
  {
    id: "zero-based",
    nama: "Zero-Based",
    deskripsi:
      "Setiap rupiah punya tujuan. Total alokasi harus sama dengan penghasilan.",
    cocokUntuk: "Yang detail-oriented, ingin kontrol penuh atas keuangan",
    tag: "Kontrol Penuh",
    kelebihan: [
      "Tidak ada uang yang 'hilang' tanpa tujuan",
      "Sadar penuh terhadap setiap pengeluaran",
      "Fleksibel sesuai kondisi bulan ini",
    ],
    kekurangan: [
      "Butuh waktu dan kedisiplinan lebih",
      "Harus direncanakan ulang setiap bulan",
    ],
    alokasi: [
      {
        label: "Semua Kategori",
        persentase: 100,
        tipe: "kebutuhan",
        warna: "#10b981",
      },
    ],
    warna: "#34d399",
    icon: "Target",
  },
  {
    id: "envelope",
    nama: "Amplop",
    deskripsi:
      "Konsep amplop fisik dalam versi digital. Ketika amplop habis, stop.",
    cocokUntuk: "Yang suka visual dan konkret, mudah tergoda overspending",
    tag: "Visual",
    kelebihan: [
      "Visual dan konkret",
      "Mencegah overspending dengan natural",
      "Mudah dipantau setiap saat",
    ],
    kekurangan: [
      "Perlu disiplin untuk tidak 'memindahkan' dari amplop lain",
      "Kurang fleksibel",
    ],
    alokasi: [
      {
        label: "Kebutuhan Pokok",
        persentase: 45,
        tipe: "kebutuhan",
        warna: "#3b82f6",
      },
      {
        label: "Transportasi",
        persentase: 10,
        tipe: "kebutuhan",
        warna: "#60a5fa",
      },
      {
        label: "Makan & Kuliner",
        persentase: 15,
        tipe: "keinginan",
        warna: "#8b5cf6",
      },
      {
        label: "Tagihan",
        persentase: 10,
        tipe: "kebutuhan",
        warna: "#a78bfa",
      },
      {
        label: "Tabungan",
        persentase: 15,
        tipe: "tabungan",
        warna: "#10b981",
      },
      {
        label: "Hiburan",
        persentase: 5,
        tipe: "keinginan",
        warna: "#f59e0b",
      },
    ],
    warna: "#a78bfa",
    icon: "Mail",
  },
];

export const TIPS_KEUANGAN = [
  {
    id: "1",
    kategori: "Cara Memulai Budgeting",
    icon: "Rocket",
    tips: [
      "Catat semua pemasukan dan pengeluaran selama 1 bulan penuh",
      "Bedakan antara kebutuhan (needs) dan keinginan (wants)",
      "Mulai dari metode sederhana, tingkatkan seiring waktu",
      "Konsisten lebih penting dari sempurna di awal",
    ],
  },
  {
    id: "2",
    kategori: "Tips Menabung Lebih Banyak",
    icon: "PiggyBank",
    tips: [
      "Bayar diri sendiri dulu — sisihkan tabungan di awal bulan",
      "Otomasi transfer ke rekening tabungan terpisah",
      "Tantang diri dengan 'no-spend day' 2-3 kali seminggu",
      "Review langganan yang tidak terpakai dan batalkan",
    ],
  },
  {
    id: "3",
    kategori: "Hindari Jebakan Pengeluaran Umum",
    icon: "AlertTriangle",
    tips: [
      "Hindari belanja impulsif — tunggu 24 jam sebelum membeli",
      "Buat daftar belanja sebelum ke supermarket",
      "Hitung cost-per-use sebelum membeli barang mahal",
      "Waspada promo 'hemat' yang akhirnya membuat belanja lebih",
    ],
  },
  {
    id: "4",
    kategori: "Memilih Metode Budget yang Tepat",
    icon: "Compass",
    tips: [
      "Pilih metode yang bisa Anda jalani konsisten, bukan yang terlihat terbaik",
      "Coba selama 3 bulan sebelum beralih metode",
      "Kombinasikan metode jika diperlukan sesuai kondisi",
      "Evaluasi dan sesuaikan setiap 6 bulan",
    ],
  },
  {
    id: "5",
    kategori: "Darurat vs Investasi: Mana Dulu?",
    icon: "Shield",
    tips: [
      "Bangun dana darurat 3-6 bulan pengeluaran terlebih dahulu",
      "Setelah dana darurat aman, baru alokasikan ke investasi",
      "Dana darurat = tabungan, bukan investasi (harus liquid)",
      "Investasi setelah utang berbunga tinggi lunas",
    ],
  },
  {
    id: "6",
    kategori: "Budget untuk Penghasilan Tidak Tetap",
    icon: "TrendingUp",
    tips: [
      "Gunakan rata-rata 3 bulan terakhir sebagai basis budget",
      "Di bulan penghasilan tinggi, tambah porsi tabungan",
      "Buat 'gaji minimum' untuk diri sendiri dari penghasilan tidak tetap",
      "Simpan buffer 2-3 bulan untuk tutup bulan sepi",
    ],
  },
];
