export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingFeature {
  iconKey: string;
  title: string;
  desc: string;
}

export interface LandingTestimonial {
  name: string;
  role: string;
  avatar: string;
  text: string;
  rating: number;
}

export interface LandingPlan {
  name: string;
  price: string;
  period: string;
  desc: string;
  color: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

export interface LandingContent {
  version: 1;
  brand: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    productName: string;
    productAccent: string;
  };
  seo: {
    title: string;
    description: string;
  };
  hero: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  stats: LandingStat[];
  featuresSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  features: LandingFeature[];
  howItWorks: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
  };
  testimonialsSection: { title: string };
  testimonials: LandingTestimonial[];
  pricingSection: { title: string; subtitle: string };
  plans: LandingPlan[];
  cta: {
    title: string;
    titleBreak: string;
    subtitle: string;
    button: string;
  };
  footer: {
    tagline: string;
    copyright: string;
  };
}

/** Warna landing selaras dengan MONEFYI_BRAND (emerald app shell). */
export const LANDING_BRAND_PRIMARY = '#10b981';
export const LANDING_BRAND_SECONDARY = '#059669';

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  version: 1,
  brand: {
    logoUrl: '',
    primaryColor: LANDING_BRAND_PRIMARY,
    secondaryColor: LANDING_BRAND_SECONDARY,
    productName: 'Monefyi',
    productAccent: 'Planner',
  },
  seo: {
    title: 'Monefyi Planner — Manajemen Proyek & Bisnis Konstruksi',
    description:
      'Platform manajemen proyek offline-first dengan AI. RAP, EVM, HR GPS, dan Monefyi Button.',
  },
  hero: {
    badge: 'Offline-First · AI-Powered · Mobile-Ready',
    title: '1 Button untuk',
    titleHighlight: 'Semua Kebutuhan',
    subtitle:
      'Monefyi Planner — Platform manajemen proyek & bisnis cerdas. Catat biaya, update progress, absensi GPS, dan analisa AI — semua dari satu tombol. Bahkan tanpa internet.',
    ctaPrimary: 'Mulai Gratis Sekarang',
    ctaSecondary: 'Masuk',
  },
  stats: [
    { value: '10x', label: 'Lebih cepat input data' },
    { value: '98%', label: 'Akurasi voice command' },
    { value: '100%', label: 'Bisa pakai offline' },
    { value: '24/7', label: 'AI analisa & rekomendasi' },
  ],
  featuresSection: {
    eyebrow: 'Platform Lengkap',
    title: 'Semua yang kamu butuhkan,\ndalam satu platform',
    subtitle:
      'Dari RAP hingga laporan akhir, dari absensi GPS hingga slip gaji — Monefyi Planner mengelola segalanya.',
  },
  features: [
    {
      iconKey: 'Sparkles',
      title: 'Monefyi Button — 1 for All',
      desc: 'Satu tombol cerdas untuk semua perintah. Bicara, ketik, atau ucapkan — sistem memahami, mengeksekusi, dan belajar dari setiap interaksi.',
    },
    {
      iconKey: 'BarChart3',
      title: 'Analisa Cerdas Otomatis',
      desc: 'Earned Value Management (CPI, SPI, EVM), Kurva S, rekomendasi AI, dan prediksi proyek real-time tanpa harus jadi ahli manajemen.',
    },
    {
      iconKey: 'Cloud',
      title: 'Offline-First, Sync Otomatis',
      desc: 'Aplikasi berjalan penuh tanpa internet. Data tersimpan lokal, lalu tersinkron otomatis saat online. Tidak ada data yang hilang.',
    },
    {
      iconKey: 'Wallet',
      title: 'Keuangan Bisnis & Proyek',
      desc: 'RAP vs Realisasi, P&L bisnis, arus kas, dividen, dan laporan konsolidasi semua proyek dalam satu tampilan yang mudah dipahami.',
    },
    {
      iconKey: 'Users',
      title: 'HR, Absensi & Payroll',
      desc: 'Sistem absensi GPS, hitung lembur otomatis, manajemen bon/hutang, dan slip gaji digital untuk seluruh tim lapangan & kantor.',
    },
    {
      iconKey: 'Shield',
      title: 'Multitenant & Role-Based',
      desc: 'Isolasi data per bisnis dengan Row-Level Security. Hierarki peran Owner → Admin → Manager → Staff → Worker yang terstruktur.',
    },
  ],
  howItWorks: {
    eyebrow: 'Monefyi Button',
    title: 'Bicara → Dipahami →',
    titleHighlight: 'Dieksekusi',
    subtitle:
      'AI 3-layer yang makin cerdas setiap hari. Ucapkan perintah dalam Bahasa Indonesia, sistem akan memahami, mengkonfirmasi, dan mengeksekusi.',
  },
  testimonialsSection: {
    title: 'Dipercaya kontraktor di seluruh Indonesia',
  },
  testimonials: [
    {
      name: 'Budi Santoso',
      role: 'Owner, CV Buana Konstruksi',
      avatar: 'BS',
      text: 'Monefyi Planner mengubah cara saya kelola 5 proyek sekaligus. Cukup satu button, semua tercatat. Sekarang saya tahu persis mana proyek yang mau boncos sebelum terlambat.',
      rating: 5,
    },
    {
      name: 'Sari Dewi',
      role: 'Project Manager, PT Alam Indah',
      avatar: 'SD',
      text: 'Fitur Kurva S dan EVM yang tadinya hanya ada di MS Project besar kini ada di genggaman. Tim lapangan tinggal ucap "update pondasi 70%", langsung terupdate semua.',
      rating: 5,
    },
    {
      name: 'Ahmad Fauzian',
      role: 'Kontraktor Mandiri',
      avatar: 'AF',
      text: 'Absensi GPS, slip gaji otomatis, dan bon pekerja semua terintegrasi. Tidak perlu WhatsApp group yang ribet lagi untuk koordinasi harian.',
      rating: 5,
    },
  ],
  pricingSection: {
    title: 'Harga yang Jelas & Transparan',
    subtitle: 'Mulai gratis, upgrade saat butuh. Tidak ada biaya tersembunyi.',
  },
  plans: [
    {
      name: 'Free',
      price: 'Rp 0',
      period: 'selamanya',
      desc: 'Untuk freelancer & proyek kecil',
      color: 'border-slate-200',
      features: [
        '3 proyek aktif',
        '5 anggota tim',
        'RAP & Realisasi dasar',
        'Monefyi Button (text)',
        'Sync offline-online',
        'Dashboard analitik dasar',
      ],
      cta: 'Mulai Gratis',
      highlight: false,
    },
    {
      name: 'Pro',
      price: 'Rp 299K',
      period: '/bulan',
      desc: 'Untuk kontraktor & bisnis aktif',
      color: 'border-emerald-500',
      features: [
        'Proyek tak terbatas',
        '25 anggota tim',
        'AI Voice Command',
        'EVM & Kurva S lengkap',
        'HR Absensi GPS + Payroll',
        'Analisa & Rekomendasi AI',
        'Laporan PDF & Excel',
        'Push notification',
      ],
      cta: 'Coba 14 Hari Gratis',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Untuk perusahaan dengan banyak proyek',
      color: 'border-emerald-700',
      features: [
        'Semua fitur Pro',
        'Anggota tak terbatas',
        'Multi-tenant custom',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'Onboarding & training',
        'White-label option',
      ],
      cta: 'Hubungi Sales',
      highlight: false,
    },
  ],
  cta: {
    title: 'Siap kelola bisnis',
    titleBreak: 'lebih cerdas?',
    subtitle:
      'Bergabung dengan ribuan kontraktor dan PM yang sudah pakai Monefyi Planner. Gratis untuk memulai.',
    button: 'Mulai Gratis — Tidak Perlu Kartu Kredit',
  },
  footer: {
    tagline: '"Simple di depan, jenius di dalam."',
    copyright: '© 2025 Monefyi.',
  },
};

export function mergeLandingContent(partial: Partial<LandingContent> | null | undefined): LandingContent {
  if (!partial || typeof partial !== 'object') return { ...DEFAULT_LANDING_CONTENT };
  const base = JSON.parse(JSON.stringify(DEFAULT_LANDING_CONTENT)) as LandingContent;
  const merged = deepMerge(base, partial as Record<string, unknown>) as LandingContent;
  // Migrasi palet lama (slate) ke hijau app
  if (merged.brand.secondaryColor === '#1e293b') {
    merged.brand.secondaryColor = LANDING_BRAND_SECONDARY;
  }
  if (merged.brand.primaryColor === '#047857') {
    merged.brand.primaryColor = LANDING_BRAND_PRIMARY;
  }
  return merged;
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv === undefined) continue;
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      const tv = target[key];
      if (tv && typeof tv === 'object' && !Array.isArray(tv)) {
        deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
        continue;
      }
    }
    (target as Record<string, unknown>)[key] = sv;
  }
  return target;
}
