import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Brain, CheckCircle, Clock, Cloud, Globe,
  Layers, MessageSquare, Mic, Shield, Smartphone, Sparkles,
  TrendingUp, Users, Wallet, Zap, ArrowRight, Star,
  Building2, ChevronRight, PlayCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

const features = [
  {
    icon: Sparkles,
    color: 'from-violet-500 to-indigo-600',
    bg: 'bg-violet-50',
    title: 'Monefyi Button — 1 for All',
    desc: 'Satu tombol cerdas untuk semua perintah. Bicara, ketik, atau ucapkan — sistem memahami, mengeksekusi, dan belajar dari setiap interaksi.',
  },
  {
    icon: BarChart3,
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
    title: 'Analisa Cerdas Otomatis',
    desc: 'Earned Value Management (CPI, SPI, EVM), Kurva S, rekomendasi AI, dan prediksi proyek real-time tanpa harus jadi ahli manajemen.',
  },
  {
    icon: Cloud,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    title: 'Offline-First, Sync Otomatis',
    desc: 'Aplikasi berjalan penuh tanpa internet. Data tersimpan lokal, lalu tersinkron otomatis saat online. Tidak ada data yang hilang.',
  },
  {
    icon: Wallet,
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    title: 'Keuangan Bisnis & Proyek',
    desc: 'RAP vs Realisasi, P&L bisnis, arus kas, dividen, dan laporan konsolidasi semua proyek dalam satu tampilan yang mudah dipahami.',
  },
  {
    icon: Users,
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
    title: 'HR, Absensi & Payroll',
    desc: 'Sistem absensi GPS, hitung lembur otomatis, manajemen bon/hutang, dan slip gaji digital untuk seluruh tim lapangan & kantor.',
  },
  {
    icon: Shield,
    color: 'from-slate-600 to-slate-800',
    bg: 'bg-slate-50',
    title: 'Multitenant & Role-Based',
    desc: 'Isolasi data per bisnis dengan Row-Level Security. Hierarki peran Owner → Admin → Manager → Staff → Worker yang terstruktur.',
  },
];

const stats = [
  { value: '10x', label: 'Lebih cepat input data' },
  { value: '98%', label: 'Akurasi voice command' },
  { value: '100%', label: 'Bisa pakai offline' },
  { value: '24/7', label: 'AI analisa & rekomendasi' },
];

const testimonials = [
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
];

const plans = [
  {
    name: 'Free',
    price: 'Rp 0',
    period: 'selamanya',
    desc: 'Untuk freelancer & proyek kecil',
    color: 'border-slate-200',
    features: ['3 proyek aktif', '5 anggota tim', 'RAP & Realisasi dasar', 'Monefyi Button (text)', 'Sync offline-online', 'Dashboard analitik dasar'],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'Rp 299K',
    period: '/bulan',
    desc: 'Untuk kontraktor & bisnis aktif',
    color: 'border-indigo-500',
    features: ['Proyek tak terbatas', '25 anggota tim', 'AI Voice Command', 'EVM & Kurva S lengkap', 'HR Absensi GPS + Payroll', 'Analisa & Rekomendasi AI', 'Laporan PDF & Excel', 'Push notification'],
    cta: 'Coba 14 Hari Gratis',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Untuk perusahaan dengan banyak proyek',
    color: 'border-slate-700',
    features: ['Semua fitur Pro', 'Anggota tak terbatas', 'Multi-tenant custom', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Onboarding & training', 'White-label option'],
    cta: 'Hubungi Sales',
    highlight: false,
  },
];

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export default function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Monefyi <span className="text-indigo-600">Planner</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Fitur</a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Cara Kerja</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Harga</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors px-3 py-2">
              Masuk
            </button>
            <button onClick={onSignup} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              Mulai Gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-indigo-100/60 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-violet-100/60 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>Offline-First · AI-Powered · Mobile-Ready</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tight mb-6"
            >
              1 Button untuk{' '}
              <span className="gradient-text">Semua Kebutuhan</span>{' '}
              Bisnis Konstruksimu
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Monefyi Planner — Platform manajemen proyek & bisnis cerdas. Catat biaya, update progress, absensi GPS, dan analisa AI — semua dari satu tombol. Bahkan tanpa internet.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <button
                onClick={onSignup}
                className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Mulai Gratis Sekarang
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 font-semibold px-6 py-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all bg-white shadow-sm"
              >
                <PlayCircle className="w-5 h-5" />
                Lihat Demo
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16"
            >
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-black gradient-text">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-indigo-100/50 border border-slate-200 bg-white">
              {/* Mock App UI */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-xs text-slate-400 font-mono">planner.monefyi.com</div>
              </div>
              <DashboardPreview onEnterApp={onLogin} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-4">
              <Layers className="w-4 h-4" />
              Platform Lengkap
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Semua yang kamu butuhkan,<br />dalam satu platform
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Dari RAP hingga laporan akhir, dari absensi GPS hingga slip gaji — Monefyi Planner mengelola segalanya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all group cursor-pointer bg-white"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works — Monefyi Button */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Monefyi Button
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Bicara → Dipahami →{' '}
              <span className="text-indigo-400">Dieksekusi</span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              AI 3-layer yang makin cerdas setiap hari. Ucapkan perintah dalam Bahasa Indonesia, sistem akan memahami, mengkonfirmasi, dan mengeksekusi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Command examples */}
            <div className="space-y-4">
              {[
                { cmd: '"catat semen 50 sak 65 ribu project rumah pak ahmad"', result: '✅ Dicatat: Semen 50 sak × Rp65.000 = Rp3.250.000', type: 'cost' },
                { cmd: '"update progress pondasi sudah 75 persen"', result: '✅ Progress Pondasi diupdate: 70% → 75%', type: 'progress' },
                { cmd: '"check in"', result: '✅ Check In: 08:15 — Lokasi terverifikasi (Site A)', type: 'attendance' },
                { cmd: '"gimana budget project gudang cikarang?"', result: '📊 Gudang Cikarang: Budget 40% terpakai, CPI: 1.12 — On Track ✓', type: 'query' },
                { cmd: '"assign todo ke Budi: cek bekisting blok A besok"', result: '✅ Todo dikirim ke Budi — Deadline: Besok', type: 'todo' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Mic className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-300 italic mb-2">{item.cmd}</p>
                      <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-1.5 w-fit">
                        <p className="text-xs text-emerald-400 font-medium">{item.result}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI Layer diagram */}
            <div className="relative">
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                <h3 className="text-lg font-bold mb-6 text-center">Arsitektur 3-Layer AI</h3>
                <div className="space-y-4">
                  {[
                    { layer: 'Layer 1', name: 'Rule-Based Parser', desc: 'Parsing instan, tanpa AI. 80% perintah selesai di sini.', speed: '< 5ms', color: 'from-emerald-500 to-teal-600', pct: 80 },
                    { layer: 'Layer 2', name: 'Fuzzy Matching', desc: 'Pencocokan cerdas nama project, item, dan user dari data kamu.', speed: '< 50ms', color: 'from-blue-500 to-indigo-600', pct: 15 },
                    { layer: 'Layer 3', name: 'GPT-4o AI', desc: 'Fallback AI untuk perintah kompleks dan belajar otomatis.', speed: '< 2s', color: 'from-violet-500 to-purple-600', pct: 5 },
                  ].map((layer, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${layer.color} mr-2`}>{layer.layer}</span>
                          <span className="text-sm font-semibold">{layer.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-indigo-400 font-mono">{layer.speed}</div>
                          <div className="text-xs text-slate-400">{layer.pct}% usage</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{layer.desc}</p>
                      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${layer.color} rounded-full`} style={{ width: `${layer.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
                  <Brain className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300">Self-improving: setiap perintah melatih sistem agar makin akurat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Dipercaya kontraktor di seluruh Indonesia
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Harga yang Jelas & Transparan</h2>
            <p className="text-lg text-slate-500">Mulai gratis, upgrade saat butuh. Tidak ada biaya tersembunyi.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 border-2 ${plan.color} ${plan.highlight ? 'shadow-xl shadow-indigo-100 bg-gradient-to-b from-indigo-50 to-white relative' : 'bg-white'}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                    PALING POPULER
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-black text-xl text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 text-sm">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignup}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Siap kelola bisnis<br />lebih cerdas?
            </h2>
            <p className="text-lg text-indigo-100 mb-10 max-w-xl mx-auto">
              Bergabung dengan ribuan kontraktor dan PM yang sudah pakai Monefyi Planner. Gratis untuk memulai.
            </p>
            <button
              onClick={onSignup}
              className="bg-white text-indigo-700 font-bold px-10 py-4 rounded-2xl text-lg shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all inline-flex items-center gap-2"
            >
              Mulai Gratis — Tidak Perlu Kartu Kredit
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">Monefyi Planner</span>
            </div>
            <p className="text-sm text-center">© 2025 Monefyi. "Simple di depan, jenius di dalam."</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardPreview({ onEnterApp }: { onEnterApp: () => void }) {
  const projects = [
    { name: 'Rumah Pak Ahmad', progress: 67, planned: 72, budget: 62, health: 'at_risk', status: 'active' },
    { name: 'Gudang Logistik PT Maju', progress: 45, planned: 42, budget: 40, health: 'on_track', status: 'active' },
    { name: 'Renovasi Kantor CV Sentosa', progress: 28, planned: 30, budget: 27, health: 'on_track', status: 'active' },
  ];

  return (
    <div className="bg-slate-50 p-4 md:p-6 min-h-[400px]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500">Selamat pagi,</div>
          <div className="font-bold text-slate-900">Pak Budi 👋</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-700 font-medium">Tersinkron</span>
          </div>
          <button onClick={onEnterApp} className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline">
            Masuk ke App <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Business Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Omzet Bulan Ini', value: 'Rp 230jt', change: '+12%', up: true },
          { label: 'Profit Kotor', value: 'Rp 78jt', change: '33.9%', up: true },
          { label: 'Pengeluaran Ops', value: 'Rp 24jt', change: '10.4%', up: false },
          { label: 'Net Profit', value: 'Rp 54jt', change: '23.5%', up: true },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{card.label}</div>
            <div className="font-bold text-slate-900 text-sm md:text-base">{card.value}</div>
            <div className={`text-xs font-medium ${card.up ? 'text-emerald-600' : 'text-rose-600'}`}>
              {card.up ? '↑' : '↓'} {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-3">Project Aktif</div>
        <div className="space-y-2">
          {projects.map((proj, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className={`w-2 h-10 rounded-full ${proj.health === 'on_track' ? 'bg-emerald-400' : proj.health === 'at_risk' ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{proj.name}</div>
                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proj.progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>Progress: {proj.progress}%</span>
                  <span>Budget: {proj.budget}%</span>
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${proj.health === 'on_track' ? 'bg-emerald-50 text-emerald-700' : proj.health === 'at_risk' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                {proj.health === 'on_track' ? '✓ On Track' : proj.health === 'at_risk' ? '⚠ At Risk' : '✗ Behind'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monefyi Button Preview */}
      <div className="mt-6 flex justify-center">
        <div className="relative">
          <button
            onClick={onEnterApp}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-300 flex items-center justify-center animate-breathe relative"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </button>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full">
            Monefyi Button ✦
          </div>
        </div>
      </div>
    </div>
  );
}
