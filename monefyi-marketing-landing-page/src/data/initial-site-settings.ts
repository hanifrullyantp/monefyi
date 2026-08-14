import type { SiteSettings } from '../types';
import { heroConfig } from './hero-config';
import { featuresData } from './features-data';
import { storiesData } from './testimonials-data';
import { faqData } from './faq-data';
import { pricingData } from './pricing-data';
import { bonusAppsData } from './bonus-apps-data';

export const INITIAL_SETTINGS: SiteSettings = {
  general: {
    siteName: 'Monefyi',
    tagline: 'Aplikasi Keuangan Personal Indonesia',
    description: 'Berhenti tebak-tebakan dengan uangmu. Monefyi menunjukkan tepatnya berapa yang aman kamu pakai hari ini, kapan kamu akan tekor, dan cara keluar dari lingkaran gaji habis untuk selamanya.',
    supportEmail: 'support@monefyi.com',
    whatsappNumber: '628123456789',
  },
  branding: {
    logoUrl: '',
    faviconUrl: '',
    accentColor: '#10b981',
  },
  marketing: {
    fbPixelId: '',
    googleAnalyticsId: '',
  },
  announcement: {
    active: false,
    text: 'SPESIAL LAUNCH: Hemat Rp 100.000 + BONUS 4 Aplikasi',
  },
  socials: {
    instagram: 'https://instagram.com/monefyi',
    twitter: 'https://twitter.com/monefyi',
    youtube: 'https://youtube.com/@monefyi',
    tiktok: 'https://tiktok.com/@monefyi',
  },
  content: {
    hero: heroConfig,
    painPoints: [
      'Tanggal 15 saldo sudah tipis',
      'Pengeluaran nggak jelas kemana',
      'Sudah niat nabung, selalu gagal',
      'Kaget lihat mutasi bank',
      'Cicilan numpuk',
      'Budget Excel jadi useless',
      'Buka banking = anxiety',
      'Kadang harus pinjam teman',
    ],
    howItWorks: [
      {
        icon: 'Smartphone',
        title: 'Input Data Dasar',
        desc: 'Cukup masukkan gaji, tanggal gajian, dan tagihan rutin kamu. Kurang dari 2 menit.',
        items: ['Gaji & Tanggal', 'Tagihan Bulanan', 'Saldo Saat Ini'],
        color: 'blue',
      },
      {
        icon: 'PieChart',
        title: 'Set Budget & Goal',
        desc: 'Pilih metode budgeting (50/30/20 atau Islami) dan set target tabungan kamu.',
        items: ['Pilih Metode', 'Alokasi Goal', 'Visualisasi Aset'],
        color: 'purple',
      },
      {
        icon: 'TrendingUp',
        title: 'Ikuti Safe to Spend',
        desc: 'Lihat angka aman tiap hari. Jika angka hijau, kamu aman. Jika merah, berhentilah.',
        items: ['Check Harian', 'Insight AI', 'Prediksi Akhir'],
        color: 'green',
      },
    ],
    features: featuresData,
    transformation: [
      {
        time: '08:00 WIB',
        label: 'Pagi Hari',
        before: 'Cek saldo m-banking, langsung stres & overthinking: "Cukup gak ya buat sampai gajian?"',
        after: 'Buka Monefyi, lihat angka Safe to Spend: "Oke, hari ini aman belanja Rp 85rb". Hati tenang.',
      },
      {
        time: '12:00 WIB',
        label: 'Makan Siang',
        before: 'Ikut teman pesan ojol food mahal + promo minimal belanja. Ujungnya kaget saldo ludes.',
        after: 'Pilih menu sesuai budget harian yang sudah diset AI. Makan enak tanpa rasa bersalah.',
      },
      {
        time: 'Sabtu Malam',
        label: 'Weekend',
        before: 'Foya-foya "self-reward" habis jutaan. Minggu sore nangis darah lihat sisa saldo.',
        after: 'Tau persis sisa budget senang-senang. Tetap nongkrong asik karena cashflow terkontrol.',
      },
      {
        time: 'Tanggal 25',
        label: 'Hari Gajian',
        before: 'Gali lubang tutup lubang. Gaji cuma numpang lewat buat bayar hutang & cicilan tekor.',
        after: 'Saldo bulan lalu masih sisa. Gajian masuk langsung buat nambah aset & investasi otomatis.',
      },
      {
        time: '5 Tahun Lagi',
        label: 'Masa Depan',
        before: 'Masih di posisi yang sama: tabungan nol, aset nihil, & dihantui inflasi yang makin gila.',
        after: 'Bebas hutang, dana darurat 12 bulan penuh, & rumah impian sudah di depan mata.',
      },
    ],
    testimonials: storiesData,
    faq: faqData,
    pricing: pricingData,
    bonusApps: bonusAppsData,
    headers: {
      pain_points: { eyebrow: 'RELATABLE?', title: 'Kamu Pasti Sudah', highlight: 'Rasakan Ini...', subtitle: 'Kelola uang bukan soal matematika, tapi soal kebiasaan. Mana yang sering kamu alami?' },
      how_it_works: { eyebrow: 'SIMPLE STEPS', title: 'Cara Monefyi', highlight: 'Mengubah Hidupmu', subtitle: 'Hanya 3 langkah sederhana untuk menghentikan kebiasaan gaji habis sebelum waktunya.' },
      features: { eyebrow: 'POWERFUL FEATURES', title: 'Didesain Untuk', highlight: 'Kenyamanan Finansial', subtitle: 'Monefyi menggabungkan AI cerdas dengan prinsip keuangan yang sudah teruji.' },
      transformation: { eyebrow: 'THE TRANSFORMATION', title: 'Dua Nasib yang', highlight: 'Berbeda Jauh', subtitle: 'Monefyi bukan cuma aplikasi, tapi sistem navigasi hidup Anda.' },
      testimonials: { eyebrow: 'USER STORIES', title: 'Kisah Nyata Dari', highlight: 'Mereka yang Berhasil', subtitle: 'Cerita pengguna yang sudah mengubah cara mereka memandang uang dengan Monefyi.' },
      faq: { eyebrow: 'F.A.Q', title: 'Masih Ada', highlight: 'Pertanyaan?', subtitle: 'Kami merangkum pertanyaan yang paling sering ditanyakan oleh calon pengguna.' },
      pricing: { eyebrow: 'PRICING', title: 'Mulai Perjalanan', highlight: 'Finansialmu Hari Ini', subtitle: 'Pilih paket yang cocok dengan situasi keuanganmu. Semua paket punya satu tujuan: kamu berhenti tekor sebelum gajian.' },
      bonus: { eyebrow: 'ALAT BANTU', title: 'Coba Kalkulator', highlight: 'Finansial Gratis', subtitle: 'Gunakan kalkulator dan planner di bawah untuk keputusan cerdas — tanpa perlu daftar.' },
    },
    footer: {
      navHeader: 'Navigasi',
      contactHeader: 'Kontak Kami',
      disclaimer: 'Monefyi adalah produk edukasi finansial. Seluruh keputusan finansial adalah tanggung jawab pengguna.',
    },
    guarantee: [
      'Sudah mulai pakai aplikasinya',
      'Proses refund < 24 jam',
      '100% uang kembali, tanpa potongan',
      'Support responsif via WA',
    ],
  },
  sections: [
    { id: 'hero', label: 'Hero', active: true, order: 0 },
    { id: 'pain-points', label: 'Pain Points', active: true, order: 1 },
    { id: 'calculator', label: 'Calculator', active: true, order: 2 },
    { id: 'how-it-works', label: 'How It Works', active: true, order: 3 },
    { id: 'features', label: 'Features', active: true, order: 4 },
    { id: 'transformation', label: 'Transformation', active: true, order: 5 },
    { id: 'testimonials', label: 'Testimonials', active: true, order: 6 },
    { id: 'comparison', label: 'Comparison', active: true, order: 7 },
    { id: 'bonus', label: 'Bonus Apps', active: true, order: 8 },
    { id: 'urgency', label: 'Urgency Banner', active: true, order: 9 },
    { id: 'pricing', label: 'Pricing', active: true, order: 10 },
    { id: 'guarantee', label: 'Guarantee', active: true, order: 11 },
    { id: 'faq', label: 'FAQ', active: true, order: 12 },
    { id: 'final-cta', label: 'Final CTA', active: true, order: 13 },
  ],
  media: {
    hero_video: { type: 'video', url: '' },
    hero_video_poster: { type: 'image', url: '' },
    transformation_image: { type: 'image', url: '' },
  },
  leads: [],
};
