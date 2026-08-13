import { buildPlanFeaturesForCard } from '../lib/pricing-features';

export const pricingData = {
  header: {
    badge: "PRICING",
    title: "Mulai Perjalanan",
    titleHighlight: "Finansialmu Hari Ini",
    subtitle: "Pilih paket yang cocok dengan situasi keuanganmu. Semua paket punya satu tujuan: kamu berhenti tekor sebelum gajian.",
  },

  plans: [
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
            desc: "Rasakan Safe-to-Spend dan catat transaksi semudah chat — tanpa keluar sepeser pun."
          },
          {
            icon: "Brain" as const,
            title: "Insight harian dasar",
            desc: "Monevisor memberi gambaran pola pengeluaranmu setiap hari, cukup untuk mulai sadar kemana uang pergi."
          },
          {
            icon: "TrendingUp" as const,
            title: "Bangun kebiasaan tertib",
            desc: "Budget 1 kategori + dashboard sederhana sudah cukup mengubah kebiasaan finansial dalam 30 hari."
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

      features: buildPlanFeaturesForCard("gratis"),

      cta: {
        label: "Mulai Gratis Sekarang",
        subtext: "Setup 2 menit",
        variant: "outline" as const,
        href: "/app/"
      },

      trust: "Tidak perlu kartu kredit",
      highlighted: false
    },

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
            desc: "Nggak perlu mikirin subscription bulanan. Satu kali Rp 99rb, akses permanen selama Monefyi beroperasi."
          },
          {
            icon: "Brain" as const,
            title: "Monevisor AI Coach penuh",
            desc: "Skor kesehatan, diagnosis, action plan, dan chat coach — bukan cuma angka di dashboard."
          },
          {
            icon: "Zap" as const,
            title: "Hero Situasi Hari Ini",
            desc: "Tahu aman pakai berapa hari ini, prediksi tekor, dan runway sebelum gajian — keputusan harian jadi jelas."
          },
          {
            icon: "TrendingUp" as const,
            title: "Update selamanya, gratis",
            desc: "Setiap fitur baru yang kami rilis, kamu dapat otomatis tanpa biaya tambahan."
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
            desc: "Sistem finansial jalan otomatis. Fokus ke goal besar: DP rumah atau bebas hutang."
          }
        ]
      },

      features: buildPlanFeaturesForCard("lifetime"),

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

    {
      id: "pro",
      badge: "POWER USER",
      badgeColor: "purple" as const,
      name: "Pro+",
      tagline: "Untuk pasangan, usaha, atau power user yang butuh automasi",

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
            title: "AI Insight premium",
            desc: "Analisis mendalam: kebocoran tersembunyi, optimasi alokasi, dan proyeksi jangka panjang."
          },
          {
            icon: "Users" as const,
            title: "Household Bersama",
            desc: "Kelola keuangan rumah tangga dalam satu dashboard — transaksi shared + privasi personal."
          },
          {
            icon: "Building2" as const,
            title: "Integrasi bank otomatis",
            desc: "Transaksi masuk otomatis dari bank besar Indonesia — hemat waktu input manual."
          },
          {
            icon: "FileText" as const,
            title: "Laporan bulanan terpadu",
            desc: "Report visual profesional untuk evaluasi kesehatan finansial dan perencanaan aset."
          }
        ]
      },

      impact: {
        title: "Perbedaan Nyata dengan Lifetime",
        outcomes: [
          "Manajemen keuangan lebih akurat berkat automasi",
          "Waktu input data berkurang drastis",
          "Transparansi keuangan rumah tangga dalam satu tempat",
          "Keputusan finansial lebih terukur berkat data real-time"
        ]
      },

      features: buildPlanFeaturesForCard("pro"),

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
        reason: "Investasi sekali bayar — Monevisor penuh + prediksi cash flow"
      },
      {
        scenario: "Sudah menikah / punya usaha / income Rp 10jt+",
        recommended: "Pro+",
        badgeColor: "purple" as const,
        reason: "Butuh Household Bersama, bank integration, dan AI premium"
      }
    ]
  },

  quickFAQ: [
    {
      q: "Apakah paket Gratis benar-benar gratis selamanya?",
      a: "Ya. Bukan trial jebakan. Paket Gratis bisa dipakai selamanya untuk fitur dasar: Safe-to-Spend basic, catat transaksi, budget 1 kategori, dan dashboard."
    },
    {
      q: "Bedanya Lifetime vs Pro+ apa?",
      a: "Lifetime = sekali bayar Rp 99rb, akses permanen fitur inti premium (Monevisor penuh, goals, digest, export, dll). Pro+ = langganan tambahan untuk Household Bersama, AI premium, dan integrasi bank otomatis. Pro+ membutuhkan Lifetime dulu."
    },
    {
      q: "Kalau saya beli Lifetime, apa selamanya beneran?",
      a: "Ya. Selama Monefyi masih beroperasi, kamu akses semua fitur Lifetime tanpa bayar lagi. Update fitur baru juga gratis."
    }
  ],

  trustSignals: [
    { icon: "ShieldCheck" as const, text: "Garansi 7 hari 100%" },
    { icon: "Lock" as const, text: "Data terenkripsi" },
    { icon: "CreditCard" as const, text: "Pembayaran aman" },
    { icon: "Star" as const, text: "Rating 4.8/5" }
  ],
};

export { PRICING_FEATURE_CATALOG, isFeatureIncludedForPlan } from '../lib/pricing-features';
