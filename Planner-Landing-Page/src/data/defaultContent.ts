import type { LandingContent } from "@/lib/types/content";

export const defaultContent: LandingContent = {
  global: {
    siteName: "Monefyi Planner",
    domain: "https://planner.monefyi.com",
    colors: {
      primary: "#2563eb",
      navy: "#0f172a",
      navyDeep: "#020617",
      gold: "#f59e0b",
      goldLight: "#fbbf24",
    },
    googleFont: "Inter",
    logoUrl: "https://fctrxjanqegjmhoklnje.supabase.co/storage/v1/object/public/site-uploads/branding/1775754497485-LOGO_D_Intero_Project.png",
    faviconUrl: "https://fctrxjanqegjmhoklnje.supabase.co/storage/v1/object/public/site-uploads/branding/1775753926310-flogo_Intero_Project.png",
    navbarCta: "Konsultasi Gratis",
    navbarLinksRaw: "Solusi|#solusi\nProses|#proses\nBonus|#bonus\nProyek|#proyek",
  },
  contactSocial: {
    whatsapp: "6281617323231",
    email: "hello@intero.id",
    address: "Jakarta, Indonesia",
    phoneDisplay: "+62 8xx xxxx xxxx",
    instagram: "@intero.id",
    socialLinksRaw: "Instagram|https://www.instagram.com/interoproject/\nTiktok|https://www.tiktok.com/@intero.id",
    needTypesRaw: "Kitchen set baru full\nRenovasi / upgrade\nKonsultasi desain\nLainnya",
    budgetRangesRaw: "Di bawah 25jt\n25–50jt\n50–100jt\nDi atas 100jt",
    waAbandonmentMsg: "Pengguna yang menutup popup konsultasi (X atau di luar form) akan diarahkan ke WA dengan teks ini.",
  },
  navbar: {
    logo: "Monefyi Estimator",
    menu: [
      { label: "Beranda", href: "#hero" },
      { label: "3 Step", href: "#tiga-step" },
      { label: "Bagaimana", href: "#bagaimana" },
      { label: "Cerita", href: "#cerita" },
      { label: "Harga", href: "#harga" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: { label: "Ambil Estimator", href: "#harga" },
  },

  hero: {
    badge: "SISTEM CLOSING PROFESIONAL UNTUK JASA PROYEK",
    headline: "3 Step Closing Proyek Lebih Mudah",
    highlightedText: "3 Step",
    subheadline: "WA Ramai, Survei Jalan Terus, Tapi Yang Deal Cuma 1-2?",
    painParagraph:
      "Berhenti buang tenaga untuk klien yang belum siap beli, cuma tanya-tanya, atau cuma mau disurvei doang.",
    boldParts: ["belum siap beli, cuma tanya-tanya, atau cuma mau disurvei doang"],
    quickPoints: [
      "Saring lead WA yang serius sebelum buang waktu survei",
      "Beri Penawaran Ketika Survei sebelum minat klien turun",
      "Tingkatkan Minat Klien Dengan Penawaran yang Profesional",
    ],
    ctaText: "Caranya? Lihat 3 Step-nya",
    ctaTarget: "#tiga-step",
    trustIndicators: ["Tanpa kartu kredit", "Data 100% aman", "Support WhatsApp"],
    mockup: {
      dateLabel: "HARI INI — Senin, 15 Jan",
      leadCount: 3,
      leadExample: {
        name: "Bpk Andi",
        project: "Renovasi",
        estimate: "Rp 45jt",
        badge: "Survei besok · 10:00",
      },
      offerCount: 2,
      offerExample: {
        name: "Ibu Sari",
        project: "Kitchen Set",
        status: "Menunggu 2 hari",
      },
      projectCount: 4,
      projectExamples: [
        { name: "Villa Ciater", progress: 78 },
        { name: "Kitchen Set Bpk Rudi", progress: 45 },
      ],
      floatingBadges: [
        { icon: "TrendingUp", text: "+Rp 45jt" },
        { icon: "FileCheck", text: "PDF Terkirim" },
      ],
    },
  },

  threeStep: {
    label: "3 STEP SIMPLE",
    title: "Ini Dia 3 Step yang Bikin Closing Lebih Mudah",
    subtitle: "Bukan trik. Bukan template ajaib. Cuma alur kerja yang lebih cerdas.",
    steps: [
      {
        number: "01",
        badge: { label: "TAHAP AWAL", color: "blue", icon: "MessageCircle" },
        title: "Saring Lead di WA, Jangan Semua Diladenin",
        problem:
          "Semua WA dibalas panjang lebar. Semua diajakin survei. Baru ketahuan gak cocok budget setelah survei. Hasilnya? Weekend habis di jalan, closing tetap sedikit.",
        solution:
          "Kasih gambaran harga awal langsung di WA. Yang cocok lanjut, yang gak cocok — hemat waktumu.",
        example: {
          label: "Contoh balasan yang efektif:",
          content:
            "Halo Bapak Andi, terima kasih sudah menghubungi.\nUntuk renovasi kamar mandi 2x3 dengan spek standar,\nbudget mulai dari Rp 25 juta.\n\nApakah budget Bapak di kisaran tersebut?\nKalau iya, saya jadwalkan survei akhir pekan ini.",
        },
        results: [
          "WA yang lanjut = calon klien serius",
          "Survei jadi berkualitas, bukan sekedar ramai",
          "Weekend bisa buat 2-3 survei potensial, bukan 5 sia-sia",
        ],
        intinya: "Saring di depan, jangan di belakang.",
      },
      {
        number: "02",
        badge: { label: "MOMEN KRITIS", color: "amber", icon: "MapPin" },
        title: "Beri Penawaran Ketika Survei, Jangan Tunggu Nanti",
        problem:
          "Sudah survei, ukur-ukur, foto, diskusi. Terus bilang: 'Nanti saya hitung dulu ya, kirim penawaran 2-3 hari lagi.' Klien pulang. Semangat turun. Vendor lain masuk. Penawaran kamu dibaca tapi gak dibalas.",
        solution:
          "Manfaatkan momen survei — saat klien lagi hangat dan mau ambil keputusan. Bawa alat estimator, hitung di tempat, diskusi opsi langsung.",
        whyImportant: {
          label: "Kenapa ini penting?",
          intro: "Saat survei, klien:",
          points: [
            "Sedang lihat langsung ruangan yang mau dikerjakan",
            "Sedang bayangkan hasil jadinya",
            "Keinginan beli lagi di puncak",
            "Bisa langsung nego opsi dan scope",
          ],
        },
        results: [
          "30-50% klien deal saat survei atau sehari setelahnya",
          "Gak ada lagi 'menunggu balasan' berhari-hari",
          "Vendor lain gak sempat masuk",
        ],
        intinya: "Selagi klien lagi hangat, jangan biarkan dingin dulu.",
      },
      {
        number: "03",
        badge: { label: "MEMBERI KESAN", color: "emerald", icon: "Hammer" },
        title: "Tingkatkan Minat Klien Dengan Penawaran Profesional",
        problem:
          "Kirim penawaran cuma lewat ketikan WA atau Excel berantakan? Klien jadi ragu dengan keseriusan Anda. Mereka butuh bukti kalau Anda adalah profesional yang berpengalaman.",
        solution:
          "Generate PDF penawaran profesional secara instan. Tampilan bersih, rincian jelas, dan branding yang kuat membuat perusahaan Anda terlihat mapan dan serius.",
        results: [
          "Klien 2x lebih percaya karena rincian yang rapi",
          "Terlihat sebagai perusahaan yang serius & berpengalaman",
          "PDF bisa langsung dipelajari klien dengan nyaman",
          "Membangun reputasi profesional sejak kontak pertama",
        ],
        intinya: "Profesionalisme dimulai dari cara Anda memberi penawaran.",
      },
    ],
  },

  transition: {
    title: "Bagaimana Cara Menerapkan 3 Step Ini Setiap Hari?",
    paragraphs: [
      "Menerapkan 3 step di atas terdengar mudah, tapi butuh sistem yang mendukung. Kalau semua masih manual — WA dibalas satu-satu, hitungan di Excel, penawaran di Word — Anda akan kembali ke chaos yang sama.",
      "Untuk itu kami buat Monefyi Estimator — alat yang bantu Anda jalankan 3 step ini setiap hari, dengan cara lebih cerdas.",
    ],
    highlightedText: "Monefyi Estimator",
    ctaText: "Lihat bagaimana caranya",
    ctaTarget: "#bagaimana",
  },

  relatable: {
    label: "RELATABLE?",
    title: "Kamu Pasti Sudah Rasakan Ini...",
    subtitle: "Closing proyek bukan soal kerja keras, tapi soal alur. Mana yang sering kamu alami?",
    problems: [
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
      "0": "Klik yang kamu alami di atas",
      "1": "Ada beberapa yang perlu diatasi. Yuk lihat caranya.",
      "2": "Ada beberapa yang perlu diatasi. Yuk lihat caranya.",
      "3": "Cukup banyak yang bisa diperbaiki dengan sistem yang tepat.",
      "4": "Cukup banyak yang bisa diperbaiki dengan sistem yang tepat.",
      "5": "Cukup banyak yang bisa diperbaiki dengan sistem yang tepat.",
      "6": "Sudah saatnya ubah cara kerja. Ini yang bisa membantu.",
      "7": "Sudah saatnya ubah cara kerja. Ini yang bisa membantu.",
      "8": "Sudah saatnya ubah cara kerja. Ini yang bisa membantu.",
    },
    ctaText: "Lihat solusinya",
    ctaTarget: "#bagaimana",
    ctaThreshold: 3,
  },

  productShowcase: {
    label: "BAGAIMANA CARANYA",
    title: "Alat yang Menemani Cara Kerja Anda,\nBukan Menambah Beban Baru.",
    subtitle: "3 momen sederhana yang mengubah cara Anda menutup proyek dengan profesional.",
    moments: [
      {
        number: "01",
        label: "SAAT WA MASUK",
        title: "Kirim Estimasi Harga\ndalam 2 Menit.",
        description:
          "Tidak perlu buka Excel. Tidak perlu hitung manual. Pilih kategori proyek, input ukuran, kirim langsung ke WhatsApp klien dengan tampilan yang meyakinkan.",
        points: [
          "Saring klien serius berdasarkan budget",
          "Auto-hitung berdasarkan spek dan ukuran",
          "Kirim langsung ke WhatsApp dalam sekali klik",
        ],
        mockupType: "whatsapp",
        floatingBadge: { icon: "Zap", text: "Dikirim dalam 2 menit" },
      },
      {
        number: "02",
        label: "SAAT SURVEI DI LOKASI",
        title: "Diskusi dan Hitung\ndi Depan Klien.",
        description:
          "Buka aplikasi di HP saat survei. Ubah item, sesuaikan spek, lihat harga berubah real-time. Klien bisa nego, Anda bisa respon di tempat, PDF penawaran keluar sebelum Anda pulang.",
        points: [
          "Adjust item dan harga real-time",
          "Bandingkan opsi material di layar",
          "Closing di tempat saat klien sedang antusias",
        ],
        mockupType: "estimator",
        floatingBadge: { icon: "Clock", text: "Update real-time" },
      },
      {
        number: "03",
        label: "PEMBERIAN PENAWARAN",
        title: "PDF Profesional yang\nMembangun Kepercayaan.",
        description:
          "Tinggalkan cara lama yang berantakan. Berikan rincian pekerjaan yang transparan dalam format PDF yang elegan. Bangun reputasi sebagai kontraktor berpengalaman.",
        points: [
          "PDF otomatis dengan rincian material",
          "Branding perusahaan Anda di setiap halaman",
          "Meningkatkan wibawa di mata calon klien",
        ],
        mockupType: "dashboard",
        floatingBadge: { icon: "RefreshCw", text: "Tampilan Elegan" },
      },
    ],
    closingStatement:
      "Bukan aplikasi rumit yang membingungkan. Cukup satu alat yang meningkatkan standar kerja Anda.",
  },

  testimonial: {
    label: "CERITA PENGGUNA",
    bigQuote: '"Dulu saya kejar klien.\nSekarang klien yang\nnunggu slot."',
    attribution: "— Ridwan Hakim, Kontraktor Renovasi · Bandung",
    story: {
      opening:
        "Sabtu sore. Baru pulang dari 3 survei. Bensin habis, tenaga habis, dan dari 3 klien itu — satu bilang 'belum ada budget', satu bilang 'nanti tahun depan', satu ghosting.\n\nSaya duduk di warung kopi, mikir: saya ini kontraktor atau tukang survei gratisan?",
      turningPoint:
        "Yang berubah bukan aplikasi yang saya pakai.\n\nYang berubah adalah cara saya menyaring klien. Saya berhenti melayani semua WA sama seriusnya. Yang belum jelas budget-nya, saya kasih gambaran harga dulu di chat. Yang cocok — lanjut. Yang tidak — kita sama-sama hemat waktu.",
      transformation:
        "Saat survei, saya berhenti bilang 'nanti saya hitung dulu ya'. Saya bawa alat, hitung di tempat, diskusi opsi langsung. Klien pulang sudah pegang PDF penawaran.",
      results: [
        "3 bulan kemudian, closing rate saya naik dari 15% ke 45%.",
        "6 bulan kemudian, saya berani hire 2 tukang tetap.",
        "Sekarang, booking saya penuh sampai 2 bulan ke depan.",
      ],
      bigQuote:
        '"Yang paling melelahkan bukan kerja proyeknya.\nTapi mengejar closing yang tidak kunjung terjadi."',
      closing:
        "Sekarang weekend saya beneran weekend. Bukan buat survei. Saya bisa milih proyek. Saya bisa naikkan harga karena reputasi sudah terbangun. Dan yang paling penting — saya jadi bos di bisnis saya sendiri.",
    },
    author: {
      initial: "RH",
      name: "Ridwan Hakim",
      title: "Kontraktor Renovasi · Bandung",
      duration: "8 bulan menggunakan Monefyi Planner",
    },
    socialProof: {
      rating: 4.9,
      reviewCount: 1200,
    },
  },

  calculator: {
    label: "HITUNG SENDIRI",
    title: "Berapa Proyek yang Hilang\ndi Bulan Ini?",
    subtitle: "Bukan menakut-nakuti. Cuma bantu Anda melihat angka yang selama ini terabaikan.",
    inputLabel: "Rata-rata WA masuk per bulan",
    defaultValue: 50,
    min: 10,
    max: 200,
    ticks: [10, 50, 100, 150, 200],
    formulas: {
      surveiRate: 0.4,
      dealRate: 0.08,
      idealDealRate: 0.2,
    },
    resultCards: {
      current: {
        label: "RATA-RATA INDUSTRI",
        template: "Dari {value} WA yang masuk:\n─ {surveiCount} lanjut ke survei\n─ {dealCount} yang jadi deal",
        closing: "Sisanya? Tenaga habis, closing nol.",
      },
      potential: {
        label: "JIKA CLOSING RATE NAIK KE 20%",
        sub: "(Rata-rata user Monefyi Planner setelah 90 hari)",
        potentialLabel: "Potensi tambahan:",
        template: "{potentialCount} proyek/bulan",
      },
    },
    closingStatement:
      "Angka ini bukan janji — tapi rata-rata dari pengguna yang menerapkan sistem closing yang lebih rapi.",
  },

  pricing: {
    label: "INVESTASI",
    title: "Satu Kali Bayar.\nPakai Selamanya.",
    subtitle:
      "Tidak ada langganan bulanan. Tidak ada biaya tersembunyi. Bayar sekali, akses selamanya.",
    plans: [
      {
        id: "estimator-standard",
        label: "UNTUK PERSONAL",
        name: "Estimator Standard",
        description: "Closing & penawaran — cukup untuk kontraktor solo",
        price: 99000,
        priceDisplay: "Rp 99.000",
        priceSubtitle: "sekali bayar · lisensi selamanya",
        features: [
          "Estimasi harga proyek unlimited",
          "Export PDF penawaran (1 template standar)",
          "Script balasan WA — 15 template screening",
          "Database klien & lead WA",
          "Trial Planner: convert max 2 proyek aktif",
          "Tanpa logo / branding custom di PDF",
          "Tanpa template PDF premium & rincian material otomatis",
        ],
        cta: { text: "Ambil Standard", variant: "outline" },
        recommended: false,
      },
      {
        id: "estimator-pro",
        label: "PALING POPULER",
        name: "Estimator Pro",
        description: "Penawaran profesional + branding perusahaan Anda",
        price: 199000,
        priceDisplay: "Rp 199.000",
        priceSubtitle: "sekali bayar · lisensi selamanya",
        features: [
          "Semua fitur Estimator Standard",
          "Logo & branding perusahaan di PDF penawaran",
          "5 desain template PDF premium",
          "Rincian material otomatis di penawaran",
          "Support WhatsApp prioritas",
          "Trial Planner: convert max 2 proyek aktif",
          "Upgrade Planner penuh (proyek unlimited) — opsi terpisah",
        ],
        cta: { text: "Ambil Estimator Pro", variant: "primary" },
        recommended: true,
        badgeText: "Best Value",
        theme: "dark",
      },
    ],
    trustLine: "Garansi 7 hari uang kembali · Tanpa pertanyaan",
    lynkCheckoutUrls: {
      estimator_standard: "",
      estimator_pro: "",
      planner_pro: "",
    },
    enterprise: {
      text: "Punya tim lebih dari 5 orang atau butuh custom feature?",
      linkText: "Hubungi kami untuk paket Enterprise",
      linkTarget: "https://wa.me/6281234567890",
    },
  },

  guaranteeFaq: {
    guarantee: {
      title: "Coba Tanpa Risiko.",
      description:
        "Kami yakin Monefyi Planner akan mengubah cara kerja Anda. Kalau dalam 7 hari terasa tidak membantu — kembalikan uang Anda, 100%, tanpa pertanyaan.",
    },
    faqLabel: "PERTANYAAN YANG SERING DITANYAKAN",
    faqs: [
      {
        question: "Bedanya Estimator Standard dan Pro apa?",
        answer:
          "Standard (Rp 99.000): estimasi unlimited, PDF template standar, script WA, database klien, trial Planner max 2 proyek — tanpa logo custom & tanpa template PDF premium.\n\nPro (Rp 199.000): semua Standard + logo/branding di PDF, 5 template premium, rincian material otomatis, dan support WA prioritas. Trial Planner tetap max 2 proyek; untuk proyek unlimited + tim + keuangan proyek, upgrade ke Monefyi Planner penuh.",
      },
      {
        question: "Apakah benar hanya sekali bayar?",
        answer:
          "Iya. Tidak ada biaya langganan bulanan. Sekali Anda membeli lisensi Monefyi Estimator, Anda bisa menggunakannya selamanya untuk proyek-proyek Anda di masa depan.",
      },
      {
        question: "Kalau beli Estimator Pro, benar-benar akses selamanya?",
        answer:
          "Iya. Sekali bayar Rp 199.000 untuk Estimator Pro — lisensi selamanya selama Monefyi beroperasi, termasuk update fitur Estimator. Upgrade ke Monefyi Planner penuh (proyek tanpa batas, tim, keuangan) adalah paket terpisah.",
      },
      {
        question: "Cocok untuk bisnis jasa selain konstruksi dan interior?",
        answer:
          "Cocok untuk bisnis apa saja dengan alur: WA masuk → survei/meeting → penawaran → proyek. Termasuk event organizer, wedding planner, agency, jasa fotografi, dan konsultan yang bekerja per project.",
      },
      {
        question: "Bagaimana cara mulai setelah pembayaran?",
        answer:
          "1. Selesaikan pembayaran via BCA, Mandiri, QRIS, atau e-wallet di Lynk.id.\n2. Cek email konfirmasi (inbox & spam) — untuk akun baru, klik \"Atur password & masuk\".\n3. Login di planner.monefyi.com/app dan ikuti setup wizard (~5 menit).\n4. Estimator langsung aktif; support WA tersedia jika butuh bantuan.",
      },
      {
        question: "Support-nya bagaimana?",
        answer:
          "Support via WhatsApp di jam kerja (09.00-18.00 WIB, Senin-Sabtu). Response time rata-rata di bawah 2 jam. Untuk pelanggan Planner Lifetime dapat priority support.",
      },
    ],
    contactLinks: {
      text: "Punya pertanyaan lain?",
      links: [
        { text: "Lihat FAQ lengkap", href: "/faq" },
        { text: "Chat WhatsApp", href: "https://wa.me/6281234567890" },
      ],
    },
  },

  finalCta: {
    title: "Mulai Cara yang lebih Cerdas",
    description:
      "Yang paling melelahkan bukan pekerjaannya —\ntapi closing yang terus bikin tenaga bocor.",
    ctaPrimary: { text: "Ambil Estimator Pro", target: "#harga" },
    ctaSecondary: { text: "Coba Standard Dulu", target: "#harga" },
    trustLine: "Garansi 7 hari · Update selamanya · Support WhatsApp",
  },

  footer: {
    logo: "Monefyi Planner",
    tagline: "Sistem closing dan project management untuk pelaku jasa proyek Indonesia.",
    contact: {
      label: "KONTAK",
      email: "support@monefyi.com",
      phone: "0812-xxxx-xxxx",
    },
    social: {
      label: "IKUTI",
      links: [
        { platform: "instagram", url: "https://instagram.com/monefyi", icon: "Instagram" },
        { platform: "youtube", url: "https://youtube.com/@monefyi", icon: "Youtube" },
        { platform: "linkedin", url: "https://linkedin.com/company/monefyi", icon: "Linkedin" },
      ],
    },
    copyright: "© 2026 Monefyi Indonesia",
    bottomLinks: [
      { text: "Kebijakan Privasi", href: "/privacy" },
      { text: "Syarat & Ketentuan", href: "/terms" },
      { text: "Enterprise", href: "https://wa.me/6281234567890" },
    ],
  },

  toast: {
    enabled: false,
    initialDelay: 5000,
    intervalMin: 15000,
    intervalMax: 45000,
    autoDismiss: 6000,
    sound: false,
    soundUrl: "/sounds/notification.mp3",
    volume: 0.5,
    position: "bottom-right",
    notifications: [],
  },

  seo: {
    title: "Monefyi Estimator — Sistem Closing Profesional untuk Jasa Proyek",
    description:
      "Generate PDF penawaran profesional secara instan. Saring lead WA, beri penawaran saat survei, dan tingkatkan kepercayaan klien.",
    keywords:
      "estimator proyek, closing kontraktor, pdf penawaran, manajemen proyek, monefyi planner",
    ogImage: "",
    googleAnalyticsId: "",
    fbPixelId: "",
    gtmId: "",
  },

  sectionOrder: [
    "hero",
    "threeStep",
    "transition",
    "relatable",
    "productShowcase",
    "testimonial",
    "calculator",
    "pricing",
    "guaranteeFaq",
    "finalCta",
    "footer",
  ],

  sectionVisibility: {
    hero: true,
    threeStep: true,
    transition: true,
    relatable: true,
    productShowcase: true,
    testimonial: true,
    calculator: true,
    pricing: true,
    guaranteeFaq: true,
    finalCta: true,
    footer: true,
  },
};
