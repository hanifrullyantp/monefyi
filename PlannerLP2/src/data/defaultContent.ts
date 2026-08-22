import type { SiteContent } from "@/lib/types/content";

export const defaultContent: SiteContent = {
  navbar: {
    logo: "Monefyi Estimator",
    menuItems: [
      { label: "Beranda", href: "#hero" },
      { label: "Cara Kerja", href: "#tiga-step" },
      { label: "Fitur", href: "#fitur" },
      { label: "Testimoni", href: "#testimoni" },
      { label: "Harga", href: "#harga" },
      { label: "FAQ", href: "#faq" },
    ],
    ctaText: "Coba Sekarang",
    ctaHref: "#harga",
  },

  hero: {
    badge: "",
    headline: "Deal Pesanan dengan Estimator, Dalam 5 Detik!",
    headlineHighlight: "5 Detik!",
    subheadline: "Closing Mudah, Tanpa Lelah harus ngeladeni semua orang",
    painParagraph: "",
    quickPoints: [
      "Balas WA hanya yang memang serius \"Punya Uang\"",
      "Survei di tempat yang memang mau Pesan!",
      "90% Deal Proyek dengan teknik Closing Di tempat!"
    ],
    ctaPrimary: "Lihat Caranya",
    ctaSecondary: "Demo",
    trustIndicators: [
      "1x Beli, Pakai Selamanya.",
      "Integrasi Whatsapp.",
      "Kwitansi + Penawaran PDF"
    ],
    dashboardImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
  },

  threeStep: {
    badge: "SIMPLE WORKFLOW",
    title: "Closing Proyek Lebih Cepat dengan 3 Langkah",
    subtitle:
      "Ubah cara lama yang lambat menjadi sistem yang efisien dan mengesankan klien.",
    steps: [
      {
        number: "01",
        badge: "SCREENING",
        badgeColor: "blue",
        icon: "MessageCircle",
        title: "Saring Klien Serius di Awal",
        problem:
          "Semua WA diajakin survei. Baru ketahuan gak cocok budget SETELAH survei. Weekend habis di jalan, closing tetap sedikit.",
        solution:
          "Gunakan script screening kami untuk memberi estimasi awal di WA. Yang cocok lanjut, yang tidak cocok — hemat waktumu.",
        exampleBox: `Contoh balasan efektif:

"Halo Bapak Andi, terima kasih sudah menghubungi.
Untuk renovasi dengan spek standar, budget kami
mulai dari Rp 25 juta.

Apakah budget Bapak di kisaran tersebut?
Jika iya, saya jadwalkan survei pekan ini."`,
        results: [
          "Hanya survei klien yang benar-benar serius",
          "Hemat waktu & biaya operasional survei",
          "Meningkatkan kualitas interaksi klien",
        ],
        summary: "Saring di depan, jangan membuang waktu di belakang.",
      },
      {
        number: "02",
        badge: "ESTIMASI",
        badgeColor: "amber",
        icon: "MapPin",
        title: "Hitung Harga Langsung di Lokasi",
        problem:
          "Survei berjam-jam, tapi baru kirim harga 3 hari kemudian. Semangat klien sudah turun, atau vendor lain sudah masuk.",
        solution:
          "Gunakan Monefyi Estimator di HP saat survei. Input ukuran, pilih material, dan harga muncul seketika.",
        importantPoints: [
          "Tunjukkan transparansi harga ke klien",
          "Adjust budget real-time sesuai diskusi",
          "Klien merasa Anda sangat profesional",
          "Manfaatkan momentum 'Hot Lead' saat survei",
        ],
        results: [
          "Closing rate naik hingga 3x lipat",
          "Klien tidak sempat lari ke vendor lain",
          "Efisiensi kerja administrasi yang luar biasa",
        ],
        summary: "Momentum adalah segalanya. Jangan biarkan klien menunggu.",
      },
      {
        number: "03",
        badge: "CLOSING",
        badgeColor: "emerald",
        icon: "FileText",
        title: "Kirim PDF Penawaran Seketika",
        problem:
          "Penawaran lewat teks WA biasa terlihat tidak profesional dan mudah diabaikan.",
        solution:
          "Convert hitungan Anda menjadi PDF penawaran premium dengan logo brand Anda sendiri. Kirim via WA sebelum Anda meninggalkan lokasi.",
        results: [
          "Branding bisnis Anda jadi terlihat 'mahal'",
          "Penawaran rapi, detail, dan mudah disetujui",
          "Dilengkapi fitur tanda tangan digital",
        ],
        summary: "Penawaran profesional adalah kunci kepercayaan klien.",
      },
    ],
  },

  transition: {
    title: "Bagaimana Cara Menerapkan 3 Step Ini Setiap Hari?",
    paragraph1:
      "Menerapkan 3 step di atas terdengar mudah, tapi butuh sistem yang mendukung. Kalau semua masih manual — WA dibalas satu-satu, hitungan di Excel, penawaran di Word, proyek di kepala — kamu akan kembali ke chaos yang sama.",
    paragraph2:
      "Untuk itu kami buat Monefyi Estimator — sistem yang bantu kamu jalankan 3 step ini setiap hari, tanpa ribet.",
    ctaText: "Lihat Monefyi Estimator",
  },

  relatable: {
    badge: "RELATABLE?",
    title: "Kamu Pasti Sudah Rasakan Ini...",
    subtitle:
      "Closing proyek bukan soal kerja keras, tapi soal alur. Mana yang sering kamu alami?",
    items: [
      "WA masuk 10, yang deal cuma 1-2",
      "Survei ke lokasi, ujungnya ghosting",
      "Bikin penawaran 2 hari, klien keburu ke vendor lain",
      "Excel proyek berantakan, lupa update",
      "Progress proyek gak jelas ke klien",
      "Tim gak tau harus kerja apa dulu",
      "Pengeluaran proyek gak ke-track",
      "Invoice sering telat, cash flow seret",
    ],
    counterMessages: {
      low: "Kamu udah selangkah lebih maju!",
      mid: "Ini masalah yang bisa diatasi. Yuk lihat caranya.",
      high: "Waktunya ubah sistem kerja. Monefyi Estimator solusinya.",
    },
    ctaText: "Lihat Solusinya",
  },

  calculator: {
    badge: "GRATIS, 30 DETIK",
    title: "Cek Efisiensi Closing Bisnismu",
    subtitle:
      "Masukkan data bulan ini dan lihat berapa potensi revenue yang hilang.",
    ctaText: "Lihat Cara Perbaikinya",
  },

  features: {
    badge: "FITUR LENGKAP",
    title: "Didesain Untuk Efisiensi Closing & Proyek",
    subtitle:
      "Monefyi Estimator menggabungkan tools closing dan project management dalam satu sistem.",
    features: [
      {
        icon: "Calculator",
        title: "Smart Estimator",
        description:
          "Hitung estimasi harga proyek dalam menit. Berdasarkan kategori, luas, atau custom item.",
        featured: true,
      },
      {
        icon: "MessageSquare",
        title: "Lead Screening WA",
        description:
          "Template balasan otomatis untuk saring calon klien sebelum survei.",
      },
      {
        icon: "FileText",
        title: "PDF Penawaran Profesional",
        description:
          "Export penawaran dengan design premium + tanda tangan digital.",
        featured: true,
      },
      {
        icon: "RefreshCw",
        title: "Auto Convert Deal",
        description:
          "Penawaran yang di-accept otomatis jadi proyek aktif.",
      },
      {
        icon: "GanttChart",
        title: "Timeline & Milestone",
        description:
          "Visualisasi progress proyek dengan Gantt chart sederhana.",
      },
      {
        icon: "CheckSquare",
        title: "Task Management",
        description:
          "Assign tugas ke tim, track deadline, notifikasi otomatis.",
      },
      {
        icon: "TrendingDown",
        title: "Expense Tracking",
        description:
          "Catat semua pengeluaran proyek — tau margin real per proyek.",
      },
      {
        icon: "UserCheck",
        title: "Client Portal",
        description:
          "Klien bisa lihat progress proyek tanpa tanya-tanya via WA.",
      },
      {
        icon: "Receipt",
        title: "Invoice & Termin",
        description:
          "Buat invoice per termin, track pembayaran otomatis.",
      },
      {
        icon: "Users",
        title: "Team Collaboration",
        description:
          "Multi-user, role-based, chat internal per proyek.",
      },
      {
        icon: "BarChart3",
        title: "Report & Analytics",
        description:
          "Dashboard revenue, closing rate, proyek profit/loss.",
      },
      {
        icon: "Smartphone",
        title: "Mobile Ready",
        description:
          "Akses dari HP saat survei atau di lokasi proyek.",
      },
    ],
  },

  transformation: {
    badge: "THE TRANSFORMATION",
    title: "Dua Nasib yang Berbeda Jauh",
    subtitle:
      "Monefyi Estimator bukan cuma aplikasi, tapi cara baru menjalankan bisnis jasa proyek.",
    scenarios: [
      {
        time: "Pagi Hari — 08:00 WIB",
        situation: "WA masuk dari calon klien baru",
        without:
          "Balas satu-satu manual, tanya budget, tanya kebutuhan, kirim harga estimasi kira-kira. 30 menit habis buat 1 chat.",
        with:
          "Buka template estimator, pilih kategori 'Renovasi Kamar Mandi', input luas. Kirim estimasi + brosur PDF ke WA klien dalam 3 menit.",
      },
      {
        time: "Survei Lokasi — 14:00 WIB",
        situation: "Sampai di rumah klien",
        without:
          "Ukur, catat di HP, foto-foto, bilang 'nanti saya hitung dulu ya, kirim 2-3 hari lagi'. Klien senyum, tapi pikirannya mulai dingin.",
        with:
          "Ukur, input langsung ke estimator di HP. Diskusi opsi material sambil lihat harga real-time. Sebelum pulang, klien terima PDF penawaran lengkap. Deal 40% terjadi hari itu juga.",
      },
      {
        time: "Malam Hari — 21:00 WIB",
        situation: "Recap proyek",
        without:
          "Buka Excel yang berantakan, WA tim satu-satu tanya progress, catat pengeluaran di notes HP, lupa update yang mana.",
        with:
          "Buka dashboard: 4 proyek berjalan, progress otomatis dari update tim, pengeluaran hari ini Rp 3,2jt, sisa budget masih on track. Tidur tenang.",
      },
      {
        time: "Akhir Bulan — Tanggal 30",
        situation: "Tutup buku",
        without:
          "Bingung berapa proyek yang selesai, berapa yang mundur, berapa margin sebenarnya. Cash flow acak. Invoice ada yang lupa ditagih.",
        with:
          "Laporan otomatis: 6 proyek closing, revenue Rp 320jt, margin 35%, 2 invoice belum dibayar dengan reminder auto ke klien. Semua rapi.",
      },
      {
        time: "5 Tahun Lagi",
        situation: "Skala bisnis",
        without:
          "Masih kerja sendiri, kapasitas mentok di 4-5 proyek/bulan, gak berani hire tim karena sistem gak jelas.",
        with:
          "Punya 3-5 project manager pakai sistem yang sama, handle 20-30 proyek/bulan, sudah expand ke 2 kota. Sistem yang scale, bukan Anda yang capek.",
      },
    ],
  },

  testimonial: {
    badge: "CERITA NYATA",
    title: "Bukan Sekedar Alat Bantu, Tapi Jadi Senjata Buat Closing Mudah dan Efisien",
    subtitle:
      "Cerita nyata dari Owner Intero.id, Bagaimana dalam 4 bulan sudah bisa meningkatkan Penjualan dengan Pesat",
    featured: {
      name: "Hanif Rullyant",
      title: "8 bulan bersama Monefyi Estimator",
      info: "Owner Intero.id · 34 thn · Pontianak",
      storyTitle: "Dari Kejar-kejar Klien, Sekarang Klien yang Nunggu Slot",
      pastSection:
        "Dulu setiap hari yang ngejar-ngejar klien. Ngiklan untuk dapatkan puluhan Calon Buyer, Balesin satu persatu sampai tengah malam. Survei bisa 5 lokasi seminggu, tapi yang deal cuma 1. Akhirnya gak nutup cost operasional karena proyek kurang mencapai target.",
      pastHighlight:
        "Masalahnya bukan produk saya yang kurang diminati. Masalahnya saya kehabisan energi untuk orang yang sebenarnya dari awal hanya tanya-tanya. Harusnya energi fokus ke orang yang benar-benar mau dan butuh.",
      turningPoint:
        "Setelah ratusan WA saya balesin, Survei banyak hasilnya nihil, akhirnya saya menyadari gak semuanya harus ditanggepin. Gak semua harus disurvei. Dan ketika berhadapan dengan yang serius, jangan sampai kehilangan momen disaat customer dalam tahap impulsive buying. Emosi atas keinginan, harapan yang sangat tinggi sehingga jika diberi harga saat itu terasa sangat murah. Jangan pernah menunda nego di depan konsumen, jangan tunda dengan alasan harus hitung dulu di kantor!",
      turningPointAttribution: "— Prinsip Closing Hanif Rullyant",
      milestones: [
        {
          period: "Minggu 1",
          title: "Bikin Template Screening",
          description:
            "Setup template balasan WA. Mulai saring lead sebelum ngeladen lebih jauh dan jadwalkan survei.",
        },
        {
          period: "Bulan 1",
          title: "Closing Rate Naik 3x",
          description:
            "Dari 1 deal per 10 survei, jadi 3 deal dari 5 survei yang lebih selektif.",
        },
        {
          period: "Bulan 3",
          title: "Closing di Tempat Jadi Kebiasaan",
          description:
            "PDF penawaran keluar sebelum pulang dari survei. Klien mutusin di hari yang sama.",
        },
        {
          period: "Bulan 6",
          title: "Bisa Hire 4 Tukang Tetap",
          description:
            "Proyek konsisten, timeline jelas, bisa semakin optimis ke depan.",
        },
        {
          period: "Sekarang",
          title: "Booking Sampai 2 Bulan ke Depan",
          description:
            "Slot penuh, klien nunggu antrian. Kita yang milih proyek, bukan proyek yang milih kita.",
        },
      ],
      newLife:
        "Sekarang gak perlu capek mantengin WhatsApp, gak mesti ngabisin weekend untuk survei. Waktu dan pikiran sekarang bisa fokus pengembangan bisnis dan buat strategi yang lebih penting tanpa was-was kehilangan konsumen.",
      newLifeHighlight: "Estimator bukan aplikasi. Ini sistem yang bikin balik jadi bos di bisnis sendiri.",
      bigQuote:
        "Estimator bukan aplikasi. Ini sistem yang bikin balik jadi bos di bisnis sendiri.",
      ctaText: "Rasakan Sistem Ini",
    },
    others: [
      {
        name: "Andi Prasetyo",
        type: "Interior Designer",
        storyTitle:
          "Dari Freelance Sendirian, Sekarang Punya Studio dengan 4 Designer",
        quote:
          "Dulu handle 3 proyek udah pusing. Sekarang studio gue handle 15 proyek paralel dengan sistem yang sama. Gak ada yang kelupaan.",
        pain: "Cuma bisa handle 3 proyek, itupun banyak yang mundur deadline",
        result: "Handle 15 proyek paralel dengan tim 4 orang, on-time delivery 90%",
        rating: 5,
      },
      {
        name: "Bimo & Sarah",
        type: "Kitchen Set Custom · Suami Istri",
        storyTitle:
          "Dari Ribut Terus Soal Proyek, Sekarang Pembagian Kerja Jelas",
        quote:
          "Dulu suami handle produksi, istri handle klien, ujungnya miscom terus. Sekarang semua transparan di dashboard. Ribut hilang, proyek lebih rapi.",
        pain: "Miscom antara sales & produksi, klien complain terus",
        result:
          "Dashboard shared, komunikasi rapi, revenue naik 60% dalam 4 bulan",
        rating: 5,
      },
      {
        name: "Dedi Kurniawan",
        type: "Kontraktor Kanopi & Railing",
        storyTitle:
          "3 Tahun Stuck di Omzet 50jt/bulan, Sekarang Konsisten 200jt+",
        quote:
          "Dulu closing susah karena penawaran gue selalu telat 2-3 hari. Sekarang keluar di tempat. Klien langsung mutusin di lokasi.",
        pain: "Omzet stuck karena closing rate rendah, banyak klien pindah vendor",
        result:
          "Closing rate naik dari 15% ke 45%, omzet 4x lipat dalam 6 bulan",
        rating: 5,
      },
    ],
    stats: [],
    closingQuote:
      "Setiap cerita berbeda. Karena setiap bisnis jasa proyek itu unik. Yang sama: semua menemukan sistem kerja yang lebih waras.",
    closingAttribution: "— Tim Monefyi",
  },

  comparison: {
    badge: "COMPARISON",
    title: "Kenapa Harus Monefyi Estimator?",
    subtitle:
      "Berhenti menebak harga dan mulai berikan penawaran akurat dalam hitungan menit.",
    rows: [
      {
        feature: "Estimator harga proyek",
        excel: "Manual",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Lead screening WA",
        excel: "Tidak Ada",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "PDF penawaran profesional",
        excel: "Manual",
        trello: "Tidak Ada",
        appPM: "Sebagian",
        monefyi: "check",
      },
      {
        feature: "Auto convert deal ke project",
        excel: "Tidak Ada",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Timeline & task management",
        excel: "Tidak Ada",
        trello: "check",
        appPM: "check",
        monefyi: "check",
      },
      {
        feature: "Expense tracking per proyek",
        excel: "Manual",
        trello: "Tidak Ada",
        appPM: "Sebagian",
        monefyi: "check",
      },
      {
        feature: "Client portal",
        excel: "Tidak Ada",
        trello: "Tidak Ada",
        appPM: "Sebagian",
        monefyi: "check",
      },
      {
        feature: "Invoice & termin",
        excel: "Manual",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Multi-user & role",
        excel: "Tidak Ada",
        trello: "check",
        appPM: "check",
        monefyi: "check",
      },
      {
        feature: "Dashboard revenue",
        excel: "Manual",
        trello: "Tidak Ada",
        appPM: "Dasar",
        monefyi: "check",
      },
      {
        feature: "Template siap jasa proyek",
        excel: "Tidak Ada",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Support Bahasa Indonesia",
        excel: "-",
        trello: "Tidak Ada",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Bisa offline",
        excel: "-",
        trello: "Sebagian",
        appPM: "Tidak Ada",
        monefyi: "check",
      },
      {
        feature: "Harga",
        excel: "Gratis*",
        trello: "$10/user/bln",
        appPM: "$15-30/user/bln",
        monefyi: "Rp 199rb (sekali bayar)",
      },
    ],
    note: "*Excel/WA gratis tapi cost tersembunyi = waktu terbuang & closing hilang",
  },

  freeTools: {
    badge: "BONUS SPESIAL",
    title: "Ini Bonus Aplikasi Yang Akan Anda Dapatkan!",
    subtitle:
      "Jika melakukan pemesanan melalui halaman ini hari ini.",
    tools: [
      {
        icon: "Calculator",
        badge: "Rp 99rb",
        title: "Budget Planner",
        description:
          "Kelola budget proyek dan operasional dengan lebih terstruktur dan rapi.",
        ctaText: "Dapatkan Bonus",
      },
      {
        icon: "TrendingUp",
        badge: "Rp 249rb",
        title: "Debt Free Planner",
        description:
          "Strategi dan alat bantu untuk mengelola hutang piutang bisnis Anda.",
        ctaText: "Dapatkan Bonus",
      },
      {
        icon: "BarChart3",
        badge: "Rp 299rb",
        title: "Kalkulator Bagi Hasil",
        description:
          "Hitung bagi hasil dengan investor atau partner kerja secara transparan.",
        ctaText: "Dapatkan Bonus",
      },
      {
        icon: "DollarSign",
        badge: "Rp 199rb",
        title: "Kalkulator Zakat",
        description:
          "Hitung kewajiban zakat mal dari hasil bisnis Anda dengan akurat.",
        ctaText: "Dapatkan Bonus",
      },
    ],
    note: "* Bonus ini hanya berlaku untuk pembelian hari ini selama slot masih tersedia.",
  },

  urgency: {
    badge: "JANGAN SAMPAI MENYESAL",
    title: "Harga Launch Segera Berakhir",
    subtitle: "Hanya Untuk 100 User Pertama",
    totalSlots: 100,
    usedSlots: 73,
    normalPrice: "Rp 499.000",
    launchPrice: "Rp 199.000",
    bonusText: "+ Estimator GRATIS (Senilai Rp 99.000)",
    limitedBadge: "LIMITED — Promo Berakhir Jika Slot Habis",
  },

  pricing: {
    badge: "PRICING",
    title: "Mulai Hitung Proyek Lebih Profesional Hari Ini",
    subtitle:
      "Pilih paket Estimator yang sesuai dengan kebutuhan bisnismu. Berhenti menebak-nebak harga di depan klien.",
    lynkCheckoutUrls: {
      estimator_standard: "",
      estimator_pro: "",
      planner_pro: "",
    },
    cards: [
      {
        id: "estimator-basic",
        badge: "COCOK UNTUK PEMULA",
        title: "Estimator Basic",
        subtitle: "Untuk kamu yang butuh hitung harga cepat & akurat",
        price: "Rp 99.000",
        pricePeriod: "Sekali Bayar",
        priceNote: "Akses selamanya",
        whyChoose: [
          "Hitung harga proyek dalam hitungan detik",
          "Cukup untuk freelancer & perorangan",
          "Database material standar siap pakai",
        ],
        features: [
          { text: "Estimator Harga Proyek (Unlimited)", included: true },
          { text: "Template PDF Penawaran Standar", included: true },
          { text: "Script WA Screening Klien", included: true },
          { text: "Database Material Lokal", included: true },
          { text: "Update Selamanya", included: true },
          { text: "Custom Logo di Penawaran", included: false },
          { text: "Tanda Tangan Digital", included: false },
          { text: "Support WhatsApp Prioritas", included: false },
        ],
        ctaText: "Ambil Basic",
        highlighted: false,
      },
      {
        id: "estimator-pro",
        badge: "PALING POPULER",
        title: "Estimator Pro",
        subtitle: "Fitur lengkap untuk closing lebih tinggi & profesional",
        originalPrice: "Rp 399.000",
        price: "Rp 199.000",
        pricePeriod: "Sekali Bayar",
        savingsBadge: "Hemat 50% — Promo Launch",
        whyChoose: [
          "Penawaran PDF Premium dengan Branding",
          "Support prioritas dari tim ahli",
          "Fitur tanda tangan digital & approval",
        ],
        features: [
          { text: "Semua fitur Estimator Basic", included: true },
          { text: "Template PDF Premium (5 Desain)", included: true },
          { text: "Custom Branding & Logo Full", included: true },
          { text: "Tanda Tangan Digital (E-Sign)", included: true },
          { text: "Kalkulator Margin & Laba", included: true },
          { text: "Generator Kwitansi Pro", included: true },
          { text: "Simpan History Penawaran", included: true },
          { text: "Support WhatsApp Prioritas", included: true },
          { text: "Bonus 15 Script WA Closing", included: true },
        ],
        ctaText: "Ambil Pro",
        highlighted: true,
      },
    ],
    comparisonRows: [
      { group: "Main Tool", feature: "Hitung Harga Proyek", estimator: "check", lifetime: "check" },
      { group: "Main Tool", feature: "PDF Penawaran", estimator: "Standar", lifetime: "Premium" },
      { group: "Main Tool", feature: "Generator Kwitansi", estimator: "cross", lifetime: "check" },
      { group: "Main Tool", feature: "Script WA Screening", estimator: "check", lifetime: "check" },
      { group: "Branding", feature: "Custom Logo Penawaran", estimator: "cross", lifetime: "check" },
      { group: "Branding", feature: "Database Material Kustom", estimator: "cross", lifetime: "check" },
      { group: "Advanced", feature: "Tanda Tangan Digital", estimator: "cross", lifetime: "check" },
      { group: "Advanced", feature: "Kalkulator Margin", estimator: "cross", lifetime: "check" },
      { group: "Support", feature: "Update Selamanya", estimator: "check", lifetime: "check" },
      { group: "Support", feature: "Support Prioritas", estimator: "cross", lifetime: "check" },
    ],
    recommendations: [
      {
        situation: "Freelancer atau baru mulai bisnis jasa proyek",
        plan: "Estimator Basic",
        reason: "Memberikan pondasi hitungan harga yang akurat.",
      },
      {
        situation: "Kontraktor yang ingin branding lebih kuat & closing tinggi",
        plan: "Estimator Pro",
        reason: "PDF penawaran profesional + Fitur Kwitansi Otomatis menaikkan trust klien 3x lipat.",
      },
    ],
    miniQuestions: [
      {
        question: "Bisa upgrade dari Basic ke Pro?",
        answer: "Tentu. Kamu cukup membayar selisih harganya saja kapan pun kamu siap naik level.",
      },
      {
        question: "Apakah database material bisa saya ubah sendiri?",
        answer: "Di versi Pro, kamu bisa kustomisasi seluruh database harga material dan tenaga kerja sesuai area lokasimu.",
      },
      {
        question: "Ada biaya langganan bulanan?",
        answer: "Tidak ada. Cukup sekali bayar, kamu bisa menggunakan Monefyi Estimator selamanya.",
      },
    ],
  },

  guarantee: {
    title: "Garansi 7 Hari 100% Uang Kembali",
    paragraph:
      "Kami sangat yakin Monefyi Estimator akan mengubah cara kerja bisnismu. Jika dalam 7 hari kamu merasa aplikasi ini tidak membantu — kami kembalikan uangmu 100% tanpa potongan. Zero risk.",
    checkpoints: [
      "Sudah mulai pakai aplikasinya",
      "Proses refund < 24 jam",
      "100% uang kembali, tanpa potongan",
      "Support responsif via WA",
    ],
  },

  faq: {
    badge: "F.A.Q",
    title: "Masih Ada Pertanyaan?",
    subtitle:
      "Kami rangkum pertanyaan paling sering dari calon pengguna.",
    categories: ["Semua", "Umum", "Fitur", "Keamanan", "Harga", "Teknis"],
    items: [
      {
        id: "1",
        category: "Umum",
        question: "Apa itu Monefyi Estimator?",
        answer:
          "Monefyi Estimator adalah sistem hitung harga proyek tercepat untuk kontraktor, interior designer, dan pelaku jasa proyek. Membantu Anda saring lead WA dan kirim PDF penawaran profesional langsung di tempat survei.",
      },
      {
        id: "2",
        category: "Umum",
        question: "Untuk siapa Monefyi Estimator cocok?",
        answer:
          "Cocok untuk kontraktor renovasi, interior designer, pengusaha kitchen set, furniture custom, kanopi, dan jasa proyek lainnya yang butuh hitung harga cepat dan profesional.",
      },
      {
        id: "3",
        category: "Umum",
        question: "Apa bedanya dengan cara manual?",
        answer:
          "Cara manual memakan waktu 2-3 hari. Dengan Monefyi Estimator, Anda bisa hitung harga dan kirim PDF penawaran dalam 3-5 menit saat masih di depan klien.",
      },
      {
        id: "4",
        category: "Umum",
        question: "Apakah bisa kustomisasi harga material?",
        answer:
          "Ya, di paket Estimator Pro, Anda bisa mengubah database harga material dan tenaga kerja sesuai dengan kebutuhan area lokal Anda.",
      },
      {
        id: "5",
        category: "Fitur",
        question: "Apa itu fitur E-Sign?",
        answer:
          "Tanda Tangan Digital (E-Sign) memungkinkan klien menyetujui penawaran langsung di HP mereka setelah Anda mengirimkan PDF penawaran.",
      },
      {
        id: "6",
        category: "Fitur",
        question: "Bisa dipakai di HP?",
        answer:
          "Tentu. Monefyi Estimator didesain mobile-first agar mudah digunakan lewat browser HP saat Anda sedang melakukan survei di lokasi proyek.",
      },
      {
        id: "9",
        category: "Keamanan",
        question: "Apakah data saya aman?",
        answer:
          "Data Anda disimpan dengan enkripsi standar industri. Hanya Anda yang memiliki akses ke database harga dan history penawaran Anda.",
      },
      {
        id: "11",
        category: "Harga",
        question: "Berapa harga Monefyi Estimator?",
        answer:
          "Ada 2 paket pilihan:\n- Estimator Basic: Rp 99.000 (sekali bayar)\n- Estimator Pro: Rp 199.000 (sekali bayar)\n\nSemua paket adalah akses selamanya tanpa biaya bulanan.",
      },
      {
        id: "12",
        category: "Harga",
        question: "Ada garansi uang kembali?",
        answer:
          "Ya, kami memberikan garansi 7 hari 100% uang kembali jika Anda merasa alat ini tidak membantu bisnis Anda.",
      },
      {
        id: "15",
        category: "Teknis",
        question: "Bagaimana cara mulai?",
        answer:
          "Klik tombol 'Ambil Estimator', pilih paket, selesaikan pembayaran, dan Anda langsung dapat akses instan ke dashboard Estimator.",
      },
    ],
  },

  finalCta: {
    title: "Siap Berhenti Kehilangan Proyek yang Seharusnya Deal?",
    subtitle:
      "Bergabunglah dengan 1.200+ pelaku jasa proyek yang sudah menggunakan Monefyi Estimator. Ambil harga promo hari ini sebelum slot habis.",
    ctaPrimary: "Ambil Estimator Pro — Rp 199.000",
    ctaSecondary: "atau Estimator Basic — Rp 99.000",
    trustItems: [
      "Akses Selamanya",
      "Garansi 7 Hari",
      "Support WhatsApp",
      "Update Gratis",
    ],
  },

  footer: {
    tagline:
      "Berhenti buang waktu untuk klien yang belum siap. Monefyi Estimator bantu kamu saring lead, hitung harga kilat, dan kirim penawaran profesional — dalam hitungan menit.",
    email: "support@monefyi.com",
    whatsapp: "0812-xxxx-xxxx",
    instagram: "@monefyi",
    navLinks: [
      { label: "Fitur", href: "#fitur" },
      { label: "Testimoni", href: "#testimoni" },
      { label: "Harga", href: "#harga" },
      { label: "FAQ", href: "#faq" },
      { label: "Syarat & Ketentuan", href: "/terms" },
      { label: "Kebijakan Privasi", href: "/privacy" },
    ],
    socialLinks: [
      { platform: "Instagram", href: "https://instagram.com/monefyi" },
      { platform: "Facebook", href: "https://facebook.com/monefyi" },
      { platform: "YouTube", href: "https://youtube.com/@monefyi" },
      { platform: "TikTok", href: "https://tiktok.com/@monefyi" },
      { platform: "LinkedIn", href: "https://linkedin.com/company/monefyi" },
    ],
    disclaimer:
      "Monefyi Estimator adalah alat bantu hitung bisnis. Hasil akhir bergantung pada input user.",
    copyright: "© 2026 MONEFYI INDONESIA. ALL RIGHTS RESERVED.",
    madeWith: "MADE WITH CARE FOR INDONESIAN CREATIVE ENTREPRENEURS",
  },

  toast: {
    enabled: true,
    intervalMin: 15000,
    intervalMax: 45000,
    autoDismiss: 6000,
    sound: true,
    notifications: [
      { name: "Ridwan Hakim", action: "baru saja beli", product: "Estimator Pro", location: "Bandung", timeAgo: "2 menit lalu" },
      { name: "Andi Prasetyo", action: "baru saja beli", product: "Estimator Basic", location: "Jakarta", timeAgo: "5 menit lalu" },
      { name: "Studio Interior Sakura", action: "upgrade ke", product: "Estimator Pro", location: "Surabaya", timeAgo: "12 menit lalu" },
      { name: "Bimo Prakoso", action: "baru saja beli", product: "Estimator Pro", location: "Yogyakarta", timeAgo: "18 menit lalu" },
      { name: "Dedi Kurniawan", action: "upgrade ke", product: "Estimator Pro", location: "Semarang", timeAgo: "24 menit lalu" },
      { name: "Sarah Wijaya", action: "baru saja beli", product: "Estimator Basic", location: "Medan", timeAgo: "31 menit lalu" },
      { name: "Kontraktor Jaya Build", action: "beli", product: "Estimator Pro", location: "Makassar", timeAgo: "38 menit lalu" },
      { name: "Hendra Gunawan", action: "baru saja beli", product: "Estimator Pro", location: "Bali", timeAgo: "42 menit lalu" },
      { name: "Fitria Design Studio", action: "upgrade ke", product: "Estimator Pro", location: "Jakarta Selatan", timeAgo: "55 menit lalu" },
      { name: "Wahyu Santoso", action: "baru saja beli", product: "Estimator Basic", location: "Bekasi", timeAgo: "1 jam lalu" },
      { name: "Interior Minimalis Co.", action: "upgrade ke", product: "Estimator Pro", location: "Tangerang", timeAgo: "1.2 jam lalu" },
      { name: "Pak Bambang", action: "baru saja beli", product: "Estimator Pro", location: "Solo", timeAgo: "1.5 jam lalu" },
      { name: "Reza Pratama", action: "beli", product: "Estimator Pro", location: "Malang", timeAgo: "2 jam lalu" },
      { name: "CV Cipta Karya", action: "baru saja beli", product: "Estimator Basic", location: "Palembang", timeAgo: "2.3 jam lalu" },
      { name: "Dewi Kusuma", action: "baru saja beli", product: "Estimator Pro", location: "Bogor", timeAgo: "2.5 jam lalu" },
    ],
  },

  sectionOrder: [
    "hero",
    "threeStep",
    "transition",
    "relatable",
    "calculator",
    "features",
    "transformation",
    "testimonial",
    "comparison",
    "freeTools",
    "urgency",
    "pricing",
    "trustBadges",
    "guarantee",
    "faq",
    "finalCta",
    "footer",
  ],

  sectionVisibility: {
    hero: true,
    threeStep: true,
    transition: true,
    relatable: true,
    calculator: true,
    features: true,
    transformation: true,
    testimonial: true,
    comparison: true,
    freeTools: true,
    urgency: true,
    pricing: true,
    trustBadges: true,
    guarantee: true,
    faq: true,
    finalCta: true,
    footer: true,
  },
};
