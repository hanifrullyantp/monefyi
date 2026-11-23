import { froyekContentSchema, type FroyekContent } from "./schema";

const raw = {
  locale: "id" as const,
  localeEn: {},
  seo: {
    title: "froyek — proyek, biaya, dan laporan dalam satu tempat",
    description:
      "Untuk pemilik dan pengelola proyek yang lelah menyalin angka dari chat dan spreadsheet. Kelola proyek berbayar, catat biaya, dan kirim laporan. Modul penawaran Estimator tersedia sebagai lisensi terpisah.",
    ogImage: "/brand/planner/icon-512.png",
  },
  branding: {
    name: "froyek",
    logoSrc: "/brand/planner/icon-192.png",
    primary: "#059669",
    primaryDark: "#047857",
    ink: "#0f172a",
    muted: "#475569",
    surface: "#f8fafc",
    radius: "16px",
    contactEmail: "[ISI DI ADMIN]",
    whatsapp: "[ISI DI ADMIN]",
    socials: [],
  },
  announcement: {
    enabled: false,
    text: "[ISI DI ADMIN]",
    href: "/pilih",
  },
  navbar: {
    loginLabel: "Masuk",
    openAppLabel: "Buka Aplikasi",
    ctaLabel: "Bantu saya pilih",
    ctaHref: "/pilih",
  },
  hero: {
    eyebrow: "Untuk kerja proyek harian",
    title: "Proyek yang berantakan jadi bisa dibaca ulang",
    titleAlt: "Biaya proyek tidak lagi hanya ada di chat",
    subtitle:
      "Catat pekerjaan, bandingkan rencana dengan yang terpakai, dan kirim ringkasan tanpa menyalin ulang spreadsheet. Paket gratis tidak membuka proyek baru.",
    cta: "Bantu saya pilih paket",
    ctaAlt: "Cek paket yang cocok",
    secondary: "Lihat contoh pencatatan",
  },
  problem: {
    title: "Yang biasanya terjadi di lapangan",
    scenes: [
      {
        title: "Angka ada di banyak tempat",
        body: "Rencana di spreadsheet, update di chat, bon di foto. Menyatukannya makan waktu yang seharusnya untuk pekerjaan.",
      },
      {
        title: "Laporan menyusul belakangan",
        body: "Pemilik bertanya progres, jawaban disusun manual. Yang tertunda bukan hanya laporan, tapi keputusan.",
      },
      {
        title: "Uang proyek sulit ditelusuri",
        body: "Biaya tercatat, tapi tidak nempel ke pekerjaan. Selisih baru kelihatan setelah uangnya sudah keluar.",
      },
    ],
  },
  beforeAfter: {
    title: "Sebelum dan sesudah memakai froyek",
    rows: [
      {
        before: "Progres ditanya ulang di chat",
        after: "Ringkasan proyek bisa dibuka dari data yang sudah dicatat",
      },
      {
        before: "Rencana biaya dan realisasi terpisah",
        after: "RAP dan biaya tercatat di proyek yang sama, masih terus dilengkapi",
      },
      {
        before: "Penawaran dihitung di luar sistem proyek",
        after: "Penawaran ada di lisensi Estimator bila kamu memang membutuhkannya",
      },
    ],
  },
  demo: {
    title: "Contoh pencatatan singkat",
    note: "Ini simulasi di halaman, bukan agen yang tersambung ke proyekmu.",
    prompt: "Catat semen 20 sak untuk proyek rumah Bu Rina",
    reply: "Contoh hasil: biaya material tercatat ke proyek yang kamu sebut. Di aplikasi, tombol catat cepat menyimpan biaya bila proyeknya sudah ada.",
    cta: "Coba contoh",
  },
  features: {
    title: "Yang ada di produk sekarang",
    groups: [
      {
        title: "Proyek",
        items: [
          { title: "Proyek berbayar", body: "Membuat dan mengelola proyek tersedia di paket yang kuotanya mengizinkan.", available: true },
          { title: "RAP dan realisasi", body: "Rencana dan biaya tercatat. Penyajian selisih masih berkembang.", available: true },
          { title: "Laporan ringkas", body: "Ringkasan mingguan, keuangan, dan progres bisa diekspor.", available: true },
        ],
      },
      {
        title: "Tim dan uang",
        items: [
          { title: "Keuangan proyek", body: "Kas, hutang, dan laba rugi ada di Pro dan Enterprise.", available: true },
          { title: "Undang anggota", body: "Kursi tambahan ada di Pro dan Enterprise.", available: true },
          { title: "Absensi dan penggajian", body: "Belum menjadi fitur yang bisa diandalkan.", available: false },
        ],
      },
      {
        title: "Penawaran",
        items: [
          { title: "Lisensi Estimator", body: "Untuk hitung dan kirim penawaran. Bukan nama utama aplikasi.", available: true },
          { title: "Penawaran menjadi RAP otomatis", body: "Belum tersedia.", available: false },
        ],
      },
    ],
  },
  calculator: {
    title: "Perkiraan biaya dari angkamu sendiri",
    intro: "Tidak ada rata-rata industri di sini. Hasilnya hanya jam, upah, dan kebocoran yang kamu isi.",
    hoursLabel: "Jam per minggu untuk menyatukan data",
    rateLabel: "Perkiraan nilai sejam (Rp)",
    leakLabel: "Uang proyek yang sulit ditelusuri bulan ini (Rp)",
    resultLabel: "Perkiraan sebulan dari angka di atas",
  },
  personas: {
    title: "Siapa yang biasanya memakai",
    items: [
      { role: "Pemilik", body: "Mau melihat proyek dan uangnya tanpa menunggu rekap manual." },
      { role: "Pengelola proyek", body: "Mau progres dan rencana biaya ada di tempat yang sama." },
      { role: "Tim lapangan", body: "Mau mencatat biaya atau progres tanpa mengisi tabel yang panjang." },
      { role: "Keuangan", body: "Mau biaya nempel ke proyek. Modul keuangan ada di Pro." },
    ],
  },
  proof: {
    title: "Pengalaman pengguna",
    quotes: [{ quote: "[ISI DI ADMIN]", name: "[ISI DI ADMIN]", role: "[ISI DI ADMIN]" }],
    logos: [],
  },
  steps: {
    title: "Tiga langkah",
    items: [
      { title: "Ceritakan kerjamu", body: "Jawab beberapa pertanyaan singkat tentang tim dan proyek." },
      { title: "Lihat paket yang cocok", body: "Rekomendasinya memakai aturan yang bisa kamu ubah di admin, beserta alasannya." },
      { title: "Bayar bila memang lanjut", body: "Pembayaran lewat Mayar. Akses proyek mengikuti paket yang terbeli." },
    ],
  },
  trust: {
    title: "Yang kami jaga, dan batasnya",
    items: [
      { title: "Data per organisasi", body: "Akses aplikasi memakai akun Supabase dan kebijakan baris di database." },
      { title: "Harga yang tertulis", body: "Angka di halaman ini mengikuti harga di produk atau promo yang kamu simpan di admin." },
      { title: "Tidak ada hitung mundur palsu", body: "Kalau tidak ada promo yang kamu isi, tidak ada urgensi tambahan." },
    ],
  },
  comparison: {
    title: "Dibanding cara yang biasa dipakai",
    columns: ["Spreadsheet dan chat", "froyek"],
    rows: [
      { label: "Tempat mencatat", cells: ["Tersebar di berkas dan percakapan", "Di proyek yang sama"] },
      { label: "Rencana vs terpakai", cells: ["Dicocokkan manual", "RAP dan biaya di proyek, masih berkembang"] },
      { label: "Siapa yang bisa masuk", cells: ["Siapa pun yang memegang berkas", "Anggota yang diundang, sesuai kursi paket"] },
      { label: "Laporan", cells: ["Disusun ulang", "Ringkasan dari data yang sudah ada"] },
    ],
  },
  pricing: {
    title: "Pilih sesuai kerja, bukan sesuai desakan",
    helpCta: "Bantu saya pilih",
    plans: [
      {
        id: "estimator_standard" as const,
        name: "Estimator Standard",
        priceLabel: "Rp 93.000",
        period: "sesuai lisensi penawaran",
        summary: "Untuk menghitung dan mengirim penawaran. Ini lisensi Estimator, bukan paket kelola proyek.",
        points: ["Penawaran di modul Estimator", "Bukan kuota proyek penuh", "Nama Estimator hanya di lisensi ini"],
        cta: "Pilih lewat wawancara",
        contactOnly: false,
      },
      {
        id: "estimator_pro" as const,
        name: "Estimator Pro",
        priceLabel: "Rp 199.000",
        period: "sesuai lisensi penawaran",
        summary: "Lisensi penawaran yang lebih lengkap. Tetap bukan paket keuangan proyek.",
        points: ["Penawaran di modul Estimator", "Bukan keuangan bisnis untuk semua pengguna"],
        cta: "Pilih lewat wawancara",
        contactOnly: false,
      },
      {
        id: "pro" as const,
        name: "Froyek Pro",
        priceLabel: "Rp 199.000",
        period: "per bulan",
        summary: "Untuk mengelola proyek, mencatat biaya, dan mengundang tim kecil.",
        points: ["Proyek sesuai kuota Pro", "RAP dan realisasi", "Keuangan proyek", "Undang anggota sesuai kursi"],
        cta: "Pilih lewat wawancara",
        contactOnly: false,
      },
      {
        id: "enterprise" as const,
        name: "Enterprise",
        priceLabel: "[ISI DI ADMIN]",
        period: "sesuai kesepakatan",
        summary: "Untuk organisasi yang butuh batas kursi dan proyek lebih longgar. Harga diisi dari admin.",
        points: ["Kuota lebih besar di produk", "Harga belum dipublikasikan sampai kamu mengisinya"],
        cta: "Hubungi kami",
        contactOnly: true,
      },
    ],
  },
  faq: {
    title: "Sebelum kamu memutuskan",
    items: [
      {
        q: "Apakah paket gratis bisa dipakai mengelola proyek?",
        a: "Tidak. Paket gratis tidak membuka proyek baru. Kamu bisa mencoba modul penawaran dengan batas yang ada di produk.",
      },
      {
        q: "Apakah ada asisten AI yang menyusun proyek sendiri?",
        a: "Ada catat cepat untuk biaya. Agen yang merencanakan pekerjaan secara andal belum tersambung ke aplikasi, dan tidak kami janjikan di halaman ini.",
      },
      {
        q: "Apakah keuangan tersedia di semua paket?",
        a: "Modul keuangan proyek ada di Froyek Pro dan Enterprise.",
      },
      {
        q: "Kenapa ada nama Estimator?",
        a: "Estimator adalah lisensi untuk penawaran. Aplikasi utamanya tetap froyek.",
      },
    ],
  },
  finalCta: {
    title: "Kalau proyekmu masih tersebar, mulai dari satu pertanyaan",
    body: "Wawancaranya singkat. Kamu bisa berhenti kapan saja, dan progresnya tersimpan di peramban ini.",
    cta: "Mulai memilih paket",
  },
  footer: {
    blurb: "froyek membantu kerja proyek harian. Estimator adalah lisensi penawaran.",
    columns: [
      {
        title: "Produk",
        links: [
          { label: "Pilih paket", href: "/pilih" },
          { label: "Masuk", href: "/login" },
          { label: "Buka aplikasi", href: "/app" },
        ],
      },
      {
        title: "Bantuan",
        links: [
          { label: "Pertanyaan", href: "#faq" },
          { label: "Kontak", href: "#kontak" },
        ],
      },
    ],
  },
  wizard: {
    title: "Bantu saya pilih",
    rules: [
      {
        id: "quote-only",
        planId: "estimator_standard" as const,
        reason: "Kamu terutama butuh penawaran. Itu lisensi Estimator Standard, bukan paket kelola banyak proyek.",
        when: { feature: "penawaran", problem: "penawaran" },
      },
      {
        id: "money",
        planId: "pro" as const,
        reason: "Uang proyek dan modul keuangan ada di Froyek Pro.",
        when: { problem: "uang" },
      },
      {
        id: "finance-feature",
        planId: "pro" as const,
        reason: "Kebutuhan keuangan yang kamu centang ada di Froyek Pro.",
        when: { feature: "keuangan" },
      },
      {
        id: "large-team",
        planId: "enterprise" as const,
        reason: "Tim yang lebih besar perlu kesepakatan kursi. Harga Enterprise diisi admin, jadi langkahnya percakapan.",
        when: { team: "6+" },
      },
    ],
  },
  toasts: [
    {
      id: "calc",
      type: "info" as const,
      trigger: "calculator_done" as const,
      message: "Angka itu dari masukanmu. Kalau mau, lanjut cek paket yang mendekati kerja timmu.",
      href: "/pilih",
      maxShows: 1,
      placement: "bottom" as const,
    },
    {
      id: "idle",
      type: "info" as const,
      trigger: "idle_pricing" as const,
      message: "Kalau ragu, wawancara singkatnya bisa membantu memilih tanpa menebak.",
      href: "/pilih",
      maxShows: 1,
      placement: "bottom" as const,
    },
    {
      id: "exit",
      type: "info" as const,
      trigger: "exit_intent" as const,
      message: "Butuh bantuan memilih? Kami tidak menambahkan diskon dadakan.",
      href: "/pilih",
      maxShows: 1,
      placement: "top" as const,
    },
    {
      id: "saved",
      type: "success" as const,
      trigger: "progress_saved" as const,
      message: "Jawabanmu tersimpan di peramban ini. Kamu bisa melanjutkan nanti.",
      href: "",
      maxShows: 1,
      placement: "bottom" as const,
    },
    {
      id: "paid",
      type: "success" as const,
      trigger: "payment_ok" as const,
      message: "Pembayaran tercatat. Lanjutkan ke aplikasi untuk menyelesaikan akun.",
      href: "/onboarding/owner",
      maxShows: 2,
      placement: "top" as const,
    },
    {
      id: "fail",
      type: "warning" as const,
      trigger: "payment_fail" as const,
      message: "Pembayaran belum selesai. Kamu bisa mencoba lagi atau mengganti metode yang tersedia.",
      href: "",
      maxShows: 3,
      placement: "top" as const,
    },
  ],
  promos: [],
  sectionOrder: [
    "hero",
    "problem",
    "beforeAfter",
    "demo",
    "features",
    "calculator",
    "personas",
    "proof",
    "steps",
    "trust",
    "comparison",
    "pricing",
    "faq",
    "finalCta",
  ],
  sectionVisibility: {
    announcement: false,
    hero: true,
    problem: true,
    beforeAfter: true,
    demo: true,
    features: true,
    calculator: true,
    personas: true,
    proof: false,
    steps: true,
    trust: true,
    comparison: true,
    pricing: true,
    faq: true,
    finalCta: true,
    footer: true,
  },
};

export const defaultFroyekContent: FroyekContent = froyekContentSchema.parse(raw);
