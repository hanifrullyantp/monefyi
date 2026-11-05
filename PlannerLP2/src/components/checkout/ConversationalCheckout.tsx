'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  Zap,
  Users,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BadgePercent,
  Bell,
  CheckCheck,
} from 'lucide-react';

export type ProductTier = 'standard' | 'pro';

interface CheckoutProps {
  initialProduct?: ProductTier;
  onSuccess?: (orderData: any) => void;
}

export default function ConversationalCheckout({
  initialProduct = 'standard',
  onSuccess,
}: CheckoutProps) {
  // 1. State Management
  const [product, setProduct] = useState<ProductTier>(initialProduct);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [takeOrderBump, setTakeOrderBump] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va/bca' | 'va/mandiri' | 'va/bni' | 'va/bri'>('qris');

  // Validation & Loading
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const authUser = useAuthStore((s) => s.user);

  // Auto-fill jika user / admin sudah terautentikasi (Hanif Rullyant)
  useEffect(() => {
    if (authUser) {
      if (authUser.name && !fullName) setFullName(authUser.name);
      if (authUser.email && !email) setEmail(authUser.email);
    }
  }, [authUser]);

  // Auto-focus input saat step berganti
  useEffect(() => {
    if (currentStep <= 3) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
    setErrorMsg('');
  }, [currentStep]);

  // Keyboard navigation: Tekan 'Enter' untuk submit per langkah
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentStep <= 3) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, fullName, email, whatsapp]);

  // 2. Kalkulasi Harga Dinamis
  const basePrice = product === 'standard' ? 99000 : 199000;
  const bumpPrice = product === 'standard' ? 50000 : 99000;
  const finalPrice = takeOrderBump ? basePrice + bumpPrice : basePrice;

  // Format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // 3. Validasi Tiap Langkah
  const handleNext = () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (!fullName.trim() || fullName.trim().length < 3) {
        setErrorMsg('Mohon masukkan nama lengkap Anda (minimal 3 karakter).');
        return;
      }
    } else if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setErrorMsg('Format email tidak valid. Contoh: nama@gmail.com');
        return;
      }
    } else if (currentStep === 3) {
      const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) {
        setErrorMsg('Nomor WhatsApp minimal 9 digit.');
        return;
      }
    }

    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setErrorMsg('');
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/checkout/mayar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          customerName: fullName.trim(),
          email: email.trim(),
          mobile: whatsapp.trim(),
          bumpTaken: takeOrderBump,
          amount: finalPrice,
          paymentMethod: paymentMethod === 'qris' ? undefined : paymentMethod,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.ok) {
        throw new Error(resData?.error || 'Gagal menyiapkan halaman pembayaran Mayar');
      }

      if (resData.redirectUrl) {
        if (onSuccess) {
          onSuccess(resData);
        }
        // Redirect ke gateway Mayar resmi
        window.location.href = resData.redirectUrl;
      } else {
        throw new Error('URL pembayaran Mayar tidak ditemukan');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    }
  };

  // Variasi Animasi Framer Motion
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 35 : -35,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.32, ease: 'easeInOut' },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -35 : 35,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.22, ease: 'easeInOut' },
    }),
  };

  const progressPercentage = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white font-sans antialiased">
      {/* Top Header Match Identitas UI Estimator */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {/* Logo E Estimator Sesuai Desain Asli Aplikasi */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#065f46] text-white flex items-center justify-center font-bold text-base shadow-sm">
                E
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                Estimator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
              Langkah {currentStep} dari 5
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1e40af] text-white text-xs font-bold flex items-center justify-center">
              h
            </div>
          </div>
        </div>

        {/* Smooth Animated Progress Bar */}
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#065f46] to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </div>
      </header>

      {/* Main Conversational Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <AnimatePresence custom={direction} mode="wait">
          {/* STEP 1: NAMA LENGKAP */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Registrasi Lisensi
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  Siapa nama lengkap Anda?
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Nama ini akan kami daftarkan secara permanen sebagai identitas pemilik lisensi di aplikasi <strong>Estimator</strong>.
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Novia Ramadhani"
                  className="w-full px-5 py-4 text-lg bg-white border-2 border-slate-200 focus:border-[#065f46] rounded-2xl outline-none transition-all shadow-sm focus:shadow-emerald-900/5 placeholder:text-slate-300 font-medium"
                />

                {errorMsg && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400 hidden sm:block">
                  Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-semibold text-slate-600">Enter ↵</kbd> untuk lanjut
                </p>
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15"
                >
                  Lanjut <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ALAMAT EMAIL */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" /> Akses Lisensi Rahasia
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  Ke mana kami kirimkan akses & lisensi Anda?
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Kami menjamin privasi Anda 100%. Digunakan untuk mengirimkan link aktivasi, receipt resmi, dan password sementara.
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full px-5 py-4 text-lg bg-white border-2 border-slate-200 focus:border-[#065f46] rounded-2xl outline-none transition-all shadow-sm focus:shadow-emerald-900/5 placeholder:text-slate-300 font-medium"
                />

                {errorMsg && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400 hidden sm:block">
                  Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-semibold text-slate-600">Enter ↵</kbd>
                </p>
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15"
                >
                  Lanjut <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: NOMOR WHATSAPP */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5" /> Notifikasi WhatsApp Instan
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  Nomor WhatsApp aktif Anda?
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Kadang email masuk folder spam. Kami kirimkan link aktivasi instan ke WhatsApp agar Anda bisa langsung menghitung proyek detik ini juga.
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative flex items-center">
                  <div className="absolute left-4 font-bold text-slate-500 border-r border-slate-200 pr-3 text-base">
                    +62
                  </div>
                  <input
                    ref={inputRef}
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/^0+/, ''))}
                    placeholder="812-3456-7890"
                    className="w-full pl-20 pr-5 py-4 text-lg bg-white border-2 border-slate-200 focus:border-[#065f46] rounded-2xl outline-none transition-all shadow-sm focus:shadow-emerald-900/5 placeholder:text-slate-300 font-medium"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400 hidden sm:block">
                  Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-semibold text-slate-600">Enter ↵</kbd>
                </p>
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15"
                >
                  Lanjut ke Penawaran <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: DYNAMIC ORDER BUMP */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1.5 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Penawaran Terbatas Sekali Ini Saja
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {product === 'standard'
                    ? 'Upgrade ke Estimator PRO Hemat Rp50.000!'
                    : 'Beli 1 Akun PRO Lagi untuk Tim — Diskon 50%!'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {product === 'standard'
                    ? 'Harga resmi PRO di landing page Rp199.000. Khusus di layar ini, Anda cukup menambah Rp50.000 saja.'
                    : 'Harga normal lisensi kedua Rp199.000. Khusus checkout ini, tambahkan 1 lisensi akun ekstra hanya Rp99.000.'}
                </p>
              </div>

              {/* Order Bump Card Interaktif */}
              <div
                onClick={() => setTakeOrderBump(!takeOrderBump)}
                className={`relative cursor-pointer rounded-3xl p-5 sm:p-6 transition-all duration-300 border-2 ${
                  takeOrderBump
                    ? 'bg-amber-50/80 border-amber-500 shadow-xl shadow-amber-500/15 ring-2 ring-amber-400/50'
                    : 'bg-white border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50/20 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      takeOrderBump
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'border-2 border-slate-300 bg-white'
                    }`}
                  >
                    {takeOrderBump && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                        {product === 'standard'
                          ? 'Ya! Upgrade ke Estimator PRO'
                          : 'Ya! Tambah 1 Lisensi PRO Ekstra'}
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 line-through mr-1.5">
                          Rp199.000
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                          +{formatIDR(bumpPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Benefit Points */}
                    <div className="mt-3.5 space-y-2 text-xs sm:text-sm text-slate-700">
                      {product === 'standard' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Export penawaran ke PDF & Excel tanpa watermark</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Buka semua template proyek (Kitchen set, Kanopi, Interior, Sipil)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Fitur otomatis kirim penawaran rapi via WhatsApp ke klien</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>1 Akun terpisah mandiri untuk staf atau estimator lapangan</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Database proyek terpisah & aman tanpa saling tumpuk</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BadgePercent className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Hemat Rp100.000 dibanding membeli lisensi kedua terpisah</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-medium">
                  <span>💡 Klik kotak ini untuk mengklaim atau membatalkan</span>
                  <span className="font-bold underline">{takeOrderBump ? 'Terpilih ✔' : 'Belum Ditambahkan'}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/15 text-base"
                >
                  Lanjut ke Pembayaran ({formatIDR(finalPrice)}) <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: RINGKASAN & METODE PEMBAYARAN */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Ringkasan & Metode Pembayaran
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Periksa rincian pesanan Anda dan pilih kanal pembayaran instan Mayar.
                </p>
              </div>

              {/* Order Summary Box */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">
                    Estimator {product === 'standard' ? 'Standard' : 'PRO'}
                  </span>
                  <span className="font-bold text-slate-900">{formatIDR(basePrice)}</span>
                </div>

                {takeOrderBump && (
                  <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100 text-amber-900">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {product === 'standard' ? 'Upgrade PRO (Promo Khusus)' : 'Ekstra 1 Akun PRO'}
                    </span>
                    <span className="font-bold">+{formatIDR(bumpPrice)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 text-slate-900">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                      Total Tagihan
                    </span>
                    <span className="text-2xl font-black text-[#065f46]">
                      {formatIDR(finalPrice)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    Aktivasi Otomatis ⚡
                  </span>
                </div>
              </div>

              {/* Data Pemesan Singkat */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600 flex justify-between items-center">
                <div className="truncate mr-2">
                  <span className="font-bold text-slate-800">{fullName}</span> • {email} • +62 {whatsapp}
                </div>
                <button
                  onClick={() => {
                    setDirection(-1);
                    setCurrentStep(1);
                  }}
                  className="text-emerald-700 font-bold hover:underline shrink-0"
                >
                  Ubah
                </button>
              </div>

              {/* Pilihan Metode Pembayaran */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Kanal Pembayaran
                </label>

                {/* QRIS Option */}
                <div
                  onClick={() => setPaymentMethod('qris')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-[#065f46] bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                      <QrCode className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">QRIS (Semua E-Wallet & Bank)</p>
                      <p className="text-xs text-slate-500">GoPay, OVO, ShopeePay, DANA, BCA, Livin, dll</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'qris'
                        ? 'border-[#065f46] bg-[#065f46]'
                        : 'border-slate-300'
                    }`}
                  >
                    {paymentMethod === 'qris' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Virtual Account Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'va/bca', label: 'BCA Virtual Account' },
                    { id: 'va/mandiri', label: 'Mandiri VA' },
                    { id: 'va/bni', label: 'BNI Virtual Account' },
                    { id: 'va/bri', label: 'BRI Virtual Account' },
                  ].map((va) => (
                    <div
                      key={va.id}
                      onClick={() => setPaymentMethod(va.id as any)}
                      className={`cursor-pointer p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${
                        paymentMethod === va.id
                          ? 'border-[#065f46] bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-xs text-slate-800">{va.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === va.id
                            ? 'border-[#065f46] bg-[#065f46]'
                            : 'border-slate-300'
                        }`}
                      >
                        {paymentMethod === va.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="space-y-3 pt-2">
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmitOrder}
                  className="w-full py-4 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyiapkan Pembayaran...</span>
                    </div>
                  ) : (
                    <>Selesaikan Pembayaran Sekarang ({formatIDR(finalPrice)})</>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Pembayaran Aman Mayar
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Garansi Akses 100%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Minimalis */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} Estimator App by Monefyi. Terintegrasi Resmi dengan Mayar.
      </footer>
    </div>
  );
}
