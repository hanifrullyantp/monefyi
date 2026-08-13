export const pricingData = {
  header: {
    badge: "PRICING",
    title: "Mulai Perjalanan",
    titleHighlight: "Finansialmu Hari Ini",
    subtitle: "Pilih paket yang cocok dengan situasi keuanganmu. Semua paket punya satu tujuan: kamu berhenti tekor sebelum gajian.",
  },

  plans: [
    // ═══════════════════════════════════════
    // PLAN 1: GRATIS SELAMANYA
    // ═══════════════════════════════════════
    {
      id: "gratis",
      badge: "MULAI GRATIS",
      badgeColor: "slate" as const,
      name: "Gratis",
      tagline: "Untuk kamu yang baru mulai tertib finansial",

      price: {
        amount: 0,
        display: "Rp 0",
        period: "Selamanya",
        note: "Tanpa kartu kredit, tanpa jebakan"
      },

      whyChoose: {
        title: "Kenapa Pilih Paket Gratis?",
        reasons: [
          {
            icon: "Sparkles" as const,
            title: "Coba tanpa risiko",
            desc: "Rasakan langsung bagaimana Monefyi mengubah cara kamu melihat uang, tanpa keluar sepeser pun."
          },
          {
            icon: "Brain" as const,
            title: "Nasihat finansial dasar",
            desc: "AI Monevisor tetap kasih kamu insight harian tentang pola pengeluaranmu — cukup untuk mulai sadar kemana uangmu pergi."
          },
          {
            icon: "TrendingUp" as const,
            title: "Bangun kebiasaan tertib",
            desc: "Fitur catat pengeluaran + Safe-to-Spend basic sudah cukup untuk mengubah kebiasaan finansialmu dalam 30 hari."
          }
        ]
      },

      impact: {
        title: "Yang Kamu Dapatkan",
        outcomes: [
          "Tahu kondisi keuangan real-time (tidak lagi 'buta uang')",
          "Berhenti kaget lihat saldo di akhir bulan",
          "Punya catatan pengeluaran yang bisa dievaluasi",
          "Belajar disiplin finansial tanpa tekanan"
        ]
      },

      features: [
        { included: true, text: "Safe-to-Spend Basic (harian)" },
        { included: true, text: "Catat pengeluaran manual" },
        { included: true, text: "Budget 1 kategori aktif" },
        { included: true, text: "AI Insight harian (basic)" },
        { included: true, text: "Dashboard sederhana" },
        { included: true, text: "Sync 1 device" },
        { included: true, text: "Support via email" },
        { included: false, text: "Multi kategori budget" },
        { included: false, text: "Monevisor AI Coach premium" },
        { included: false, text: "Debt Freedom Planner" }
      ],

      cta: {
        label: "Mulai Gratis Sekarang",
        subtext: "Setup 2 menit",
        variant: "outline" as const,
        href: "/app/"
      },

      trust: "Tidak perlu kartu kredit",
      highlighted: false
    },

    // ═══════════════════════════════════════
    // PLAN 2: LIFETIME (TERPOPULER)
    // ═══════════════════════════════════════
    {
      id: "lifetime",
      badge: "PALING POPULER",
      badgeColor: "green" as const,
      name: "Lifetime",
      tagline: "Untuk kamu yang serius mau bebas dari cash flow buruk",

      price: {
        amount: 99000,
        originalAmount: 299000,
        display: "Rp 99.000",
        period: "Sekali Bayar",
        note: "Pakai selamanya, tanpa perpanjangan",
        savingsText: "Hemat Rp 200.000"
      },

      whyChoose: {
        title: "Kenapa Pilih Lifetime?",
        reasons: [
          {
            icon: "ShieldCheck" as const,
            title: "Bayar sekali, tenang selamanya",
            desc: "Nggak perlu mikirin subscription bulanan. Beli Rp 99rb sekarang, pakai sampai tua. Kamu hemat Rp 1.1 JUTA per tahun dibanding aplikasi lain."
          },
          {
            icon: "Brain" as const,
            title: "Financial Coach AI 24/7",
            desc: "Monevisor analisis polamu, warning sebelum overspend, dan kasih saran spesifik. Seperti punya financial advisor pribadi."
          },
          {
            icon: "Zap" as const,
            title: "Balik modal dalam 7 hari",
            desc: "Rata-rata user hemat Rp 1.2 JUTA per bulan dari kebocoran yang tidak disadari. Investasi Rp 99rb balik dalam kurang dari 1 minggu."
          },
          {
            icon: "TrendingUp" as const,
            title: "Update selamanya, gratis",
            desc: "Setiap fitur baru yang kami rilis, kamu dapat otomatis. Aplikasi terus berkembang, harga kamu tetap Rp 99rb yang dulu."
          }
        ]
      },

      impact: {
        title: "Perubahan Nyata dalam 90 Hari",
        isTimeline: true,
        outcomes: [
          {
            icon: "Calendar" as const,
            metric: "Bulan 1",
            desc: "Tahu persis kemana uangmu pergi. Berhenti tekor di tanggal 20."
          },
          {
            icon: "PiggyBank" as const,
            metric: "Bulan 2",
            desc: "Mulai punya sisa uang di akhir bulan. Dana darurat pertamamu terbentuk."
          },
          {
            icon: "Trophy" as const,
            metric: "Bulan 3",
            desc: "Sistem finansial jalan otomatis. Bisa fokus ke goal besar: DP rumah atau bebas hutang."
          }
        ]
      },

      features: [
        { included: true, text: "Safe-to-Spend Basic (harian)" },
        { included: true, text: "Catat pengeluaran manual" },
        { included: true, text: "Budget 1 kategori aktif" },
        { included: true, text: "AI Insight harian (basic)" },
        { included: true, text: "Dashboard sederhana" },
        { included: true, text: "Sync 1 device" },
        { included: true, text: "Support via email" },
        { included: true, text: "Safe-to-Spend FULL (prediksi akurat)" },
        { included: true, text: "Monevisor AI Coach 24/7", highlight: true },
        { included: true, text: "Budget UNLIMITED kategori" },
        { included: true, text: "Cash Flow Prediction 30 hari ke depan" },
        { included: true, text: "Debt Freedom Planner" },
        { included: true, text: "Multi rekening (unlimited)" },
        { included: true, text: "Offline mode + auto-sync" },
        { included: true, text: "Weekly AI Digest personal" },
        { included: true, text: "Multi-device sync" },
        { included: true, text: "Update fitur selamanya" },
        { included: true, text: "Priority support (respon <1 jam)" }
      ],

      cta: {
        label: "Ambil Lifetime Sekarang",
        subtext: "Rp 99.000 sekali bayar",
        variant: "primary" as const,
        href: "https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout"
      },

      trust: [
        "Garansi 7 hari uang kembali 100%",
        "Pembayaran aman via Lynk.id",
        "Semua metode: transfer, e-wallet, QRIS"
      ],

      urgency: {
        show: true,
        text: "Harga akan naik ke Rp 199rb bulan depan",
        icon: "TrendingUp" as const
      },

      highlighted: true
    },

    // ═══════════════════════════════════════
    // PLAN 3: PRO+ (POWER USER)
    // ═══════════════════════════════════════
    {
      id: "pro",
      badge: "POWER USER",
      badgeColor: "purple" as const,
      name: "Pro+",
      tagline: "Untuk kamu yang mau HASIL MAKSIMAL dari keuangan",

      price: {
        amount: 30000,
        originalAmount: 45000,
        display: "Rp 30.000",
        period: "Per Bulan",
        note: "atau Rp 300rb/tahun (hemat Rp 60rb)",
        requirement: "Membutuhkan paket Lifetime"
      },

      whyChoose: {
        title: "Kenapa Upgrade ke Pro+?",
        reasons: [
          {
            icon: "Brain" as const,
            title: "AI Insight PREMIUM",
            desc: "Analisis mendalam: deteksi kebocoran tersembunyi, optimasi alokasi per kategori, dan proyeksi pertumbuhan aset jangka panjang."
          },
          {
            icon: "Users" as const,
            title: "Couple Mode (Suami-Istri)",
            desc: "Kelola keuangan rumah tangga secara transparan dalam 1 dashboard. Bangun kepercayaan dan capai goal aset bersama tanpa drama."
          },
          {
            icon: "Building2" as const,
            title: "Integrasi bank otomatis",
            desc: "Transaksi masuk otomatis dari bank besar Indonesia. Hemat waktu input manual dan pastikan data selalu akurat setiap saat."
          },
          {
            icon: "FileText" as const,
            title: "Laporan Bulanan Terpadu",
            desc: "Report profesional untuk evaluasi mendalam kondisi kesehatan finansial dan perencanaan kepemilikan aset secara tunai/syar'i."
          }
        ]
      },

      impact: {
        title: "Perbedaan Nyata dengan Lifetime",
        outcomes: [
          "Manajemen keuangan jauh lebih akurat dan presisi",
          "Waktu input data berkurang drastis berkat auto-sync",
          "Visualisasi aset rumah tangga yang lebih transparan",
          "Keputusan finansial lebih terukur berkat data real-time"
        ]
      },

      features: [
        { included: true, text: "SEMUA fitur Lifetime, PLUS:" },
        { included: true, text: "AI Insight PREMIUM (analisis mendalam)", highlight: true },
        { included: true, text: "Couple Mode (2 akun terhubung)", highlight: true },
        { included: true, text: "Integrasi bank otomatis", highlight: true },
        { included: true, text: "Export Excel & PDF Profesional" },
        { included: true, text: "Custom Categories Tanpa Batas" },
        { included: true, text: "Laporan Visual Bulanan" },
        { included: true, text: "Prioritas Update Fitur Baru" },
        { included: true, text: "Akses Fitur Beta" },
        { included: true, text: "Support VIP (Respon Cepat)" }
      ],

      cta: {
        label: "Upgrade ke Pro+",
        subtext: "Rp 30.000/bulan",
        variant: "outline" as const,
        href: "https://lynk.id/asfin-ai/9zexz9z5wom1/checkout"
      },

      trust: "Cancel kapan saja, tanpa penalty",
      note: "Bisa upgrade nanti dari dalam aplikasi",
      highlighted: false
    }
  ],

  comparison: {
    title: "Mana yang cocok untuk kamu?",
    scenarios: [
      {
        scenario: "Baru mulai belajar finansial, income < Rp 5jt",
        recommended: "Gratis",
        badgeColor: "slate" as const,
        reason: "Mulai dari basic, upgrade nanti kalau sudah terbiasa"
      },
      {
        scenario: "Sudah kerja, gaji habis terus, mau beres-beres",
        recommended: "Lifetime",
        badgeColor: "green" as const,
        reason: "Investment terbaik. Balik modal <7 hari, pakai selamanya"
      },
      {
        scenario: "Sudah menikah / punya usaha / income Rp 10jt+",
        recommended: "Pro+",
        badgeColor: "purple" as const,
        reason: "Butuh Couple Mode, bank integration, dan AI advisor"
      }
    ]
  },

  quickFAQ: [
    {
      q: "Apakah paket Gratis benar-benar gratis selamanya?",
      a: "YA. Bukan trial. Bukan freemium jebakan. Paket Gratis bisa kamu pakai selamanya tanpa bayar sepeserpun. Fiturnya cukup untuk basic financial tracking."
    },
    {
      q: "Bedanya Lifetime vs Pro+ apa?",
      a: "Lifetime = SEKALI BAYAR Rp 99rb pakai selamanya. Pro+ = subscription tambahan Rp 30rb/bln untuk fitur premium: AI advanced, Couple Mode, bank integration, konsultasi 1-on-1. Pro+ membutuhkan Lifetime dulu."
    },
    {
      q: "Kalau saya beli Lifetime, apa selamanya beneran?",
      a: "IYA. Selama Monefyi masih beroperasi, kamu bisa akses semua fitur Lifetime tanpa bayar lagi. Update fitur baru juga gratis. Kamu benar-benar OWN aplikasinya."
    }
  ],

  trustSignals: [
    { icon: "ShieldCheck" as const, text: "Garansi 7 hari 100%" },
    { icon: "Lock" as const, text: "Data terenkripsi" },
    { icon: "CreditCard" as const, text: "Pembayaran aman" },
    { icon: "Users" as const, text: "3.847+ pengguna" },
    { icon: "Star" as const, text: "Rating 4.8/5" }
  ]
};
