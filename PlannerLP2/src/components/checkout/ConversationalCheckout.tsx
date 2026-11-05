'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useContentStore } from '@/lib/store/contentStore';
import { useLandingAdmin } from '@/lib/hooks/useLandingAdmin';
import { defaultContent } from '@/data/defaultContent';
import { EditableText } from '@/components/shared/EditableText';
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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BadgePercent,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Edit3,
  Save,
  Landmark,
  CreditCard,
  Wallet,
} from 'lucide-react';

export type ProductTier = 'free' | 'standard' | 'pro';

export type PaymentMethodId =
  | 'qris'
  | 'bca_va'
  | 'mandiri_va'
  | 'bri_va'
  | 'bni_va'
  | 'ewallet'
  | 'credit_card';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  badge?: string;
  iconType: 'qris' | 'bank' | 'wallet' | 'card';
}

export const AVAILABLE_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'qris',
    name: 'QRIS (Semua Bank & E-Wallet)',
    subtitle: 'BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay',
    badge: 'Rekomendasi ⚡',
    iconType: 'qris',
  },
  {
    id: 'bca_va',
    name: 'BCA Virtual Account',
    subtitle: 'Transfer via BCA Mobile, KlikBCA, atau ATM BCA',
    badge: 'Cek Otomatis',
    iconType: 'bank',
  },
  {
    id: 'mandiri_va',
    name: 'Mandiri Virtual Account',
    subtitle: 'Transfer via Livin\' by Mandiri atau ATM Mandiri',
    badge: 'Cek Otomatis',
    iconType: 'bank',
  },
  {
    id: 'bri_va',
    name: 'BRI Virtual Account (BRIVA)',
    subtitle: 'Transfer via BRImo atau ATM BRI',
    badge: 'Cek Otomatis',
    iconType: 'bank',
  },
  {
    id: 'bni_va',
    name: 'BNI Virtual Account',
    subtitle: 'Transfer via BNI Mobile Banking atau ATM BNI',
    badge: 'Cek Otomatis',
    iconType: 'bank',
  },
  {
    id: 'ewallet',
    name: 'E-Wallet Instan',
    subtitle: 'GoPay, OVO, DANA, ShopeePay direct link',
    badge: 'Instan',
    iconType: 'wallet',
  },
  {
    id: 'credit_card',
    name: 'Kartu Kredit / Debit Online',
    subtitle: 'Visa, Mastercard, JCB (3D Secure Terlindungi)',
    badge: 'Aman',
    iconType: 'card',
  },
];

interface CheckoutProps {
  initialProduct?: ProductTier;
  onSuccess?: (orderData: any) => void;
}

export default function ConversationalCheckout({
  initialProduct = 'standard',
  onSuccess,
}: CheckoutProps) {
  // 1. Content & Admin Stores
  const { content, isDirty, publishContent, isSaving } = useContentStore();
  const { isEditMode, setEditMode, setAdmin } = useLandingAdmin();
  const co = { ...defaultContent.checkout!, ...(content.checkout || {}) };

  // State Management
  const [product] = useState<ProductTier>(initialProduct);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [floatingPill, setFloatingPill] = useState<{ text: string } | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [takeOrderBump, setTakeOrderBump] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('qris');

  // Payment Active State (Native QRIS / VA Screen)
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    qrImageUrl: string | null;
    redirectUrl: string | null;
    amount: number;
    method?: PaymentMethodId;
  } | null>(null);

  // Timer & Polling Status
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 menit
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

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

  // Auto-focus input saat step berganti (jika bukan dalam mode edit admin)
  useEffect(() => {
    if (currentStep <= 3 && !isEditMode) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
    setErrorMsg('');
  }, [currentStep, isEditMode]);

  // Countdown Timer saat di layar QRIS
  useEffect(() => {
    if (!paymentData || paymentSuccess) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentData, paymentSuccess]);

  // Auto-polling status pembayaran setiap 5 detik saat layar QRIS aktif
  useEffect(() => {
    if (!paymentData?.paymentId || paymentSuccess) return;

    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/mayar?id=${paymentData.paymentId}`);
        const data = await res.json();
        if (data?.isPaid) {
          setPaymentSuccess(true);
          clearInterval(checkInterval);
          setTimeout(() => {
            window.location.href = 'https://estimator.monefyi.com/app/estimator?status=activated';
          }, 2500);
        }
      } catch {
        // silent retry
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [paymentData, paymentSuccess]);

  // Keyboard navigation: Tekan 'Enter' untuk submit per langkah (hanya saat tidak edit mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentStep <= 3 && !paymentData && !isEditMode) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, fullName, email, whatsapp, paymentData, isEditMode]);

  // Toggle inline edit mode untuk admin
  const handleToggleEdit = () => {
    const next = !isEditMode;
    setEditMode(next);
    setAdmin(true);
  };

  // 2. Kalkulasi Harga Dinamis
  const basePrice = product === 'free' ? 0 : product === 'standard' ? 99000 : 199000;
  const bumpPrice = product === 'free' ? 99000 : product === 'standard' ? 50000 : 99000;
  const finalPrice = takeOrderBump ? basePrice + bumpPrice : basePrice;

  // Format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3. Validasi Tiap Langkah
  const handleNext = () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setErrorMsg('Mohon masukkan nama lengkap Anda (minimal 2 karakter).');
        return;
      }
      setFloatingPill({ text: fullName.trim() });
      setTimeout(() => setFloatingPill(null), 650);
    } else if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setErrorMsg('Format email tidak valid. Contoh: nama@gmail.com');
        return;
      }
      setFloatingPill({ text: email.trim() });
      setTimeout(() => setFloatingPill(null), 650);
    } else if (currentStep === 3) {
      const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 8) {
        setErrorMsg('Nomor WhatsApp minimal 9 digit.');
        return;
      }
      const phoneDisplay = whatsapp.startsWith('0') ? whatsapp : `0${whatsapp}`;
      setFloatingPill({ text: phoneDisplay });
      setTimeout(() => setFloatingPill(null), 650);
    }

    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (paymentData) {
      setPaymentData(null);
      return;
    }
    if (currentStep > 1) {
      setErrorMsg('');
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (stepNumber: number) => {
    if (paymentData) return;
    setErrorMsg('');
    setDirection(stepNumber > currentStep ? 1 : -1);
    setCurrentStep(stepNumber);
  };

  // 4. Submit Order & Tampilkan Native QRIS Screen (No generic Mayar page)
  const handleSubmitOrder = async () => {
    if (isEditMode) {
      alert('Nonaktifkan Mode Edit terlebih dahulu untuk melakukan pengujian checkout.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/checkout/mayar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          customerName: fullName.trim() || 'Pelanggan Estimator',
          email: email.trim(),
          mobile: whatsapp.trim() || '081234567890',
          bumpTaken: takeOrderBump,
          amount: finalPrice,
          paymentMethod,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.ok) {
        throw new Error(resData?.error || 'Gagal menyiapkan pesanan');
      }

      if (resData.isFree) {
        setPaymentSuccess(true);
        setPaymentData({
          paymentId: resData.paymentId,
          qrImageUrl: null,
          redirectUrl: resData.redirectUrl,
          amount: 0,
        });
        if (onSuccess) onSuccess(resData);
        setTimeout(() => {
          window.location.href = resData.redirectUrl || 'https://estimator.monefyi.com/app/estimator?status=activated&plan=free';
        }, 1800);
        return;
      }

      setPaymentData({
        paymentId: resData.paymentId,
        qrImageUrl: resData.qrImageUrl,
        redirectUrl: resData.redirectUrl,
        amount: resData.amount || finalPrice,
        method: paymentMethod,
      });

      if (onSuccess) {
        onSuccess(resData);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Check Payment Status
  const handleManualCheckStatus = async () => {
    if (!paymentData?.paymentId) return;
    setIsCheckingPayment(true);
    try {
      const res = await fetch(`/api/checkout/mayar?id=${paymentData.paymentId}`);
      const data = await res.json();
      if (data?.isPaid) {
        setPaymentSuccess(true);
        setTimeout(() => {
          window.location.href = 'https://estimator.monefyi.com/app/estimator?status=activated';
        }, 2000);
      } else {
        alert('Pembayaran belum terdeteksi. Silakan selesaikan scan QRIS terlebih dahulu.');
      }
    } catch {
      alert('Gagal mengecek status. Coba beberapa saat lagi.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(finalPrice.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
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

  const progressPercentage = paymentData ? 100 : (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white font-sans antialiased">
      {/* Floating Ghost Animation saat data selesai diisi & melayang ke atas */}
      <AnimatePresence>
        {floatingPill && (
          <motion.div
            initial={{ opacity: 0.95, y: 30, scale: 0.95 }}
            animate={{ opacity: [0.95, 1, 0], y: [-20, -70, -120], scale: [0.95, 1, 0.9] }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none fixed z-50 left-1/2 -translate-x-1/2 top-1/2 inline-flex items-center gap-2 px-4 py-2 bg-[#065f46] text-white rounded-full font-bold text-sm shadow-2xl border border-emerald-300/50"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
            <span>{floatingPill.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* TOP BAR INLINE EDIT (SELALU TERSEDIA DI ATAS CHECKOUT PAGE) */}
      {/* ===================================================================== */}
      <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">Checkout Estimator</span>
          </div>

          {/* Shortcut lompat langkah (Step Jumper) — selalu bisa dipakai untuk edit langsung */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[11px]">
            <span className="text-slate-400 px-1 font-medium hidden sm:inline">Langkah:</span>
            {[1, 2, 3, 4, 5].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => goToStep(st)}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  currentStep === st
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={`Lompat ke langkah ${st}`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleEdit}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isEditMode
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Mode Edit: AKTIF ✏️' : '✏️ Mode Edit Teks'}</span>
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={() => void publishContent()}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg font-bold bg-[#065f46] hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan 💾'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Helper Banner saat Mode Edit Aktif */}
      {isEditMode && (
        <div className="bg-amber-400 text-slate-950 px-4 py-1.5 text-xs font-semibold border-b border-amber-300 shadow-xs">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Mode Edit Aktif: Klik teks bertanda kuning untuk mengubah. Klik nomor langkah [1-5] di atas untuk berpindah halaman.</span>
            </span>
          </div>
        </div>
      )}

      {/* Header Aplikasi Estimator */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(currentStep > 1 || paymentData) && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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
              {paymentData ? 'Menunggu Pembayaran' : `Langkah ${currentStep} dari 5`}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1e40af] text-white text-xs font-bold flex items-center justify-center shadow-xs">
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
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col justify-center">
        {/* ===================================================================== */}
        {/* HASIL ISIAN BERJEJER SATU BARIS (. Nama  . Email  . WhatsApp) */}
        {/* SETIAP ITEM DIAWALI TITIK BESAR HIJAU, ANIMASI MELAYANG KE ATAS */}
        {/* ===================================================================== */}
        {!paymentData && (
          <div className="flex items-center gap-3 sm:gap-4 py-2 px-1 mb-6 border-b border-slate-200/80 overflow-x-auto no-scrollbar whitespace-nowrap min-h-[44px]">
            <AnimatePresence mode="popLayout">
              {/* . Nama (Melayang ke atas saat selesai diisi) */}
              {currentStep > 1 && fullName && (
                <motion.button
                  key="summary-name"
                  layout
                  initial={{ y: 35, opacity: 0, scale: 0.85 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -15, opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => goToStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer shrink-0 group py-1 px-1.5 rounded-lg hover:bg-emerald-50/70"
                  title="Klik untuk ubah nama"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/60 group-hover:scale-125 transition-transform" />
                  <span className="truncate max-w-[150px]">{fullName}</span>
                </motion.button>
              )}

              {/* . Email (Melayang ke atas saat selesai diisi) */}
              {currentStep > 2 && email && (
                <motion.button
                  key="summary-email"
                  layout
                  initial={{ y: 35, opacity: 0, scale: 0.85 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -15, opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => goToStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer shrink-0 group py-1 px-1.5 rounded-lg hover:bg-emerald-50/70"
                  title="Klik untuk ubah email"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/60 group-hover:scale-125 transition-transform" />
                  <span className="truncate max-w-[180px]">{email}</span>
                </motion.button>
              )}

              {/* . WhatsApp (Melayang ke atas saat selesai diisi) */}
              {currentStep > 3 && whatsapp && (
                <motion.button
                  key="summary-wa"
                  layout
                  initial={{ y: 35, opacity: 0, scale: 0.85 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -15, opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => goToStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer shrink-0 group py-1 px-1.5 rounded-lg hover:bg-emerald-50/70"
                  title="Klik untuk ubah WhatsApp"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/60 group-hover:scale-125 transition-transform" />
                  <span>{whatsapp.startsWith('0') ? whatsapp : `0${whatsapp}`}</span>
                </motion.button>
              )}

              {/* . Order Bump (jika dipilih) */}
              {currentStep > 4 && takeOrderBump && (
                <motion.button
                  key="summary-bump"
                  layout
                  initial={{ y: 35, opacity: 0, scale: 0.85 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -15, opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => goToStep(4)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-900 hover:text-amber-950 transition-colors cursor-pointer shrink-0 group py-1 px-1.5 rounded-lg hover:bg-amber-100/60"
                  title="Klik untuk ubah penawaran"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/60" />
                  <span>
                    {product === 'free'
                      ? 'Upgrade Standard (+Rp99rb)'
                      : product === 'standard'
                      ? 'Upgrade PRO (+Rp50rb)'
                      : '2 Akun PRO (+Rp99rb)'}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===================================================================== */}
        {/* LAYAR PEMBAYARAN NATIVE (QRIS IN-APP — TANPA INVOICE BIRU MAYAR) */}
        {/* ===================================================================== */}
        {paymentData ? (
          <motion.div
            key="payment-screen"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-5"
          >
            {paymentSuccess ? (
              <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center shadow-lg space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-[#065f46] flex items-center justify-center">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {paymentData?.amount === 0 ? 'Pendaftaran Berhasil!' : 'Pembayaran Berhasil!'}
                </h2>
                <p className="text-sm text-slate-600">
                  Terima kasih, <strong>{fullName}</strong>. Akun Estimator Anda otomatis aktif. Mengalihkan Anda ke aplikasi...
                </p>
                <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
                {/* Header Nominal & Timer */}
                <div className="text-center space-y-2 border-b border-slate-100 pb-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#065f46] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                    <Clock className="w-3.5 h-3.5" /> Bayar sebelum {formatTimer(timeLeft)}
                  </span>

                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    Total Pembayaran
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-[#065f46] tracking-tight">
                      {formatIDR(paymentData.amount)}
                    </span>
                    <button
                      onClick={copyAmount}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Salin nominal"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {copiedAmount && (
                    <p className="text-xs text-emerald-600 font-semibold animate-fade-in">
                      Nominal disalin!
                    </p>
                  )}
                </div>

                {/* Container Gambar QRIS atau Detail Virtual Account */}
                {paymentData.qrImageUrl ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 bg-white rounded-2xl border-2 border-emerald-100 shadow-md ring-4 ring-emerald-50 flex items-center justify-center">
                      <img
                        src={paymentData.qrImageUrl}
                        alt="QRIS Pembayaran Estimator"
                        className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                      />
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                      Scan dengan BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4 py-2">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#065f46] shadow-xs">
                      <Landmark className="w-8 h-8" />
                    </div>

                    <div className="text-center space-y-1">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full uppercase">
                        Virtual Account / Transfer
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg">
                        {AVAILABLE_PAYMENT_METHODS.find((m) => m.id === paymentData.method)?.name || 'Transfer Bank'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Klik tombol di bawah untuk melihat rincian nomor pembayaran Anda dan selesaikan transfer.
                      </p>
                    </div>

                    {paymentData.redirectUrl && (
                      <a
                        href={paymentData.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/15 text-sm text-center cursor-pointer"
                      >
                        <span>Buka Detail Pembayaran & No. VA</span>
                        <ExternalLink className="w-4 h-4 ml-0.5" />
                      </a>
                    )}

                    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cara Pembayaran:</span>
                      </div>
                      <p>1. Buka link pembayaran di atas untuk mendapatkan nomor Virtual Account resmi Anda.</p>
                      <p>2. Salin nomor VA dan lakukan transfer dari m-banking atau ATM bank Anda.</p>
                      <p>3. Setelah transfer berhasil, sistem otomatis mendeteksi dan mengaktifkan akun Anda.</p>
                    </div>
                  </div>
                )}

                {/* Tombol Aksi */}
                <div className="space-y-2.5 pt-1">
                  <button
                    disabled={isCheckingPayment}
                    onClick={handleManualCheckStatus}
                    className="w-full py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15 disabled:opacity-60 text-sm cursor-pointer"
                  >
                    {isCheckingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Memeriksa Status...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Saya Sudah Bayar (Cek Otomatis)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentData(null)}
                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    ← Ganti Metode Pembayaran Lain
                  </button>

                  {/* Fallback ke invoice Mayar jika pembeli ingin buka di tab baru */}
                  {paymentData.redirectUrl && paymentData.qrImageUrl && (
                    <a
                      href={paymentData.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-xs text-slate-400 hover:text-emerald-700 py-1 transition-colors"
                    >
                      Buka rincian invoice di tab baru <ExternalLink className="w-3 h-3 inline ml-0.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ===================================================================== */
          /* FORM INTERVIEW CONVERSATIONAL (STEP 1 - STEP 5) DENGAN INLINE EDIT */
          /* ===================================================================== */
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
                    <EditableText section="checkout" field="step1Badge" value={co.step1Badge} />
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                    <EditableText section="checkout" field="step1Title" value={co.step1Title} />
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <EditableText section="checkout" field="step1Help" value={co.step1Help} multiline />
                    </span>
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={co.step1Placeholder || "Contoh: Novia Ramadhani"}
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
                    className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15 cursor-pointer"
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
                    <Lock className="w-3.5 h-3.5" />
                    <EditableText section="checkout" field="step2Badge" value={co.step2Badge} />
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                    <EditableText section="checkout" field="step2Title" value={co.step2Title} />
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <EditableText section="checkout" field="step2Help" value={co.step2Help} multiline />
                    </span>
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={co.step2Placeholder || "nama@perusahaan.com"}
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
                    className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15 cursor-pointer"
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
                    <Zap className="w-3.5 h-3.5" />
                    <EditableText section="checkout" field="step3Badge" value={co.step3Badge} />
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                    <EditableText section="checkout" field="step3Title" value={co.step3Title} />
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed flex items-start gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <EditableText section="checkout" field="step3Help" value={co.step3Help} multiline />
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
                      placeholder={co.step3Placeholder || "812-3456-7890"}
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
                    className="w-full sm:w-auto ml-auto px-7 py-3.5 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/15 cursor-pointer"
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
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <EditableText section="checkout" field="bumpBadge" value={co.bumpBadge} />
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {product === 'free' ? (
                      <EditableText section="checkout" field="bumpTitleFree" value={co.bumpTitleFree || "Upgrade Langsung ke Estimator Standard Seumur Hidup?"} />
                    ) : product === 'standard' ? (
                      <EditableText section="checkout" field="bumpTitleStandard" value={co.bumpTitleStandard} />
                    ) : (
                      <EditableText section="checkout" field="bumpTitlePro" value={co.bumpTitlePro} />
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    {product === 'free' ? (
                      <EditableText section="checkout" field="bumpSubFree" value={co.bumpSubFree || "Khusus pendaftaran ini: Buka batas 3 estimasi & dapatkan lisensi seumur hidup hanya Rp99.000 (hemat Rp100.000)!"} multiline />
                    ) : product === 'standard' ? (
                      <EditableText section="checkout" field="bumpSubStandard" value={co.bumpSubStandard} multiline />
                    ) : (
                      <EditableText section="checkout" field="bumpSubPro" value={co.bumpSubPro} multiline />
                    )}
                  </p>
                </div>

                {/* Order Bump Card Interaktif */}
                <div
                  onClick={() => {
                    if (!isEditMode) setTakeOrderBump(!takeOrderBump);
                  }}
                  className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-300 border-2 ${
                    isEditMode ? 'cursor-default' : 'cursor-pointer'
                  } ${
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
                          {product === 'free'
                            ? 'Ya! Ambil Lisensi Standard Seumur Hidup'
                            : product === 'standard'
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

                      {/* Benefit Points Inline Editable */}
                      <div className="mt-3.5 space-y-2 text-xs sm:text-sm text-slate-700">
                        {product === 'free' ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit1Free" value={co.bumpBenefit1Free || "Buka batas 3 estimasi — hitung estimasi & RAB tanpa batas kuota"} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit2Free" value={co.bumpBenefit2Free || "Ekspor PDF penawaran resmi berlogo & bertanda tangan perusahaan"} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit3Free" value={co.bumpBenefit3Free || "Lisensi aktif seumur hidup tanpa biaya langganan bulanan"} /></span>
                            </div>
                          </>
                        ) : product === 'standard' ? (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit1Standard" value={co.bumpBenefit1Standard} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit2Standard" value={co.bumpBenefit2Standard} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit3Standard" value={co.bumpBenefit3Standard} /></span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit1Pro" value={co.bumpBenefit1Pro} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit2Pro" value={co.bumpBenefit2Pro} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BadgePercent className="w-4 h-4 text-amber-600 shrink-0" />
                              <span><EditableText section="checkout" field="bumpBenefit3Pro" value={co.bumpBenefit3Pro} /></span>
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
                    className="w-full py-4 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/15 text-base cursor-pointer"
                  >
                    {finalPrice === 0 ? 'Lanjut ke Aktivasi Gratis' : `Lanjut ke Pembayaran (${formatIDR(finalPrice)})`} <ArrowRight className="w-4 h-4" />
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
                    <EditableText section="checkout" field="step5Title" value={co.step5Title} />
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    <EditableText section="checkout" field="step5Subtitle" value={co.step5Subtitle} />
                  </p>
                </div>

                {/* Order Summary Box */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      Estimator {product === 'free' ? 'Free (Uji Coba 3 Estimasi)' : product === 'standard' ? 'Standard' : 'PRO'}
                    </span>
                    <span className="font-bold text-slate-900">{formatIDR(basePrice)}</span>
                  </div>

                  {takeOrderBump && (
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100 text-amber-900">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        {product === 'free'
                          ? 'Upgrade Standard (Promo Spesial)'
                          : product === 'standard'
                          ? 'Upgrade PRO (Promo Khusus)'
                          : 'Ekstra 1 Akun PRO'}
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
                        {finalPrice === 0 ? 'Rp 0 (GRATIS)' : formatIDR(finalPrice)}
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
                    <span className="font-bold text-slate-800">{fullName || 'Nama Anda'}</span> • {email || 'email@anda.com'} • +62 {whatsapp || '812...'}
                  </div>
                  <button
                    onClick={() => goToStep(1)}
                    className="text-emerald-700 font-bold hover:underline shrink-0 cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>

                {/* Pilihan Metode Pembayaran: Bebas Bayar untuk Free vs QRIS untuk Berbayar */}
                {finalPrice === 0 ? (
                  <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-[#065f46] shadow-xs shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">
                        Akses Gratis 100% — Tanpa Biaya
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Link aktivasi dan password dikirimkan otomatis ke WhatsApp & Email Anda tanpa perlu pembayaran.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Pilihan Metode Pembayaran
                      </label>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        7 Metode Tersedia
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5 no-scrollbar">
                      {AVAILABLE_PAYMENT_METHODS.map((pm) => {
                        const isSelected = paymentMethod === pm.id;
                        return (
                          <div
                            key={pm.id}
                            onClick={() => setPaymentMethod(pm.id)}
                            className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'border-[#065f46] bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/25'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                  isSelected
                                    ? 'bg-[#065f46] text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {pm.iconType === 'qris' && <QrCode className="w-5 h-5" />}
                                {pm.iconType === 'bank' && <Landmark className="w-5 h-5" />}
                                {pm.iconType === 'wallet' && <Wallet className="w-5 h-5" />}
                                {pm.iconType === 'card' && <CreditCard className="w-5 h-5" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-extrabold text-slate-900 text-sm truncate">
                                    {pm.name}
                                  </p>
                                  {pm.badge && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        pm.id === 'qris'
                                          ? 'bg-emerald-100 text-[#065f46]'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {pm.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{pm.subtitle}</p>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-[#065f46] bg-[#065f46]'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit CTA */}
                <div className="space-y-3 pt-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isSubmitting && !isEditMode) handleSubmitOrder();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isSubmitting && !isEditMode) {
                        e.preventDefault();
                        handleSubmitOrder();
                      }
                    }}
                    className={`w-full py-4 bg-[#065f46] hover:bg-[#047857] active:scale-[0.98] text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-900/20 select-none ${
                      isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{finalPrice === 0 ? 'Mendaftarkan Akun Gratis...' : 'Menyiapkan Pembayaran...'}</span>
                      </div>
                    ) : finalPrice === 0 ? (
                      <span>Aktifkan Akun Gratis Saya Sekarang 🚀</span>
                    ) : (
                      <span>
                        Bayar via {AVAILABLE_PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.name.split(' ')[0] || 'Sekarang'} ({formatIDR(finalPrice)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <EditableText section="checkout" field="securityBadge" value={co.securityBadge} />
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <EditableText section="checkout" field="guaranteeBadge" value={co.guaranteeBadge} />
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer Minimalis */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} <EditableText section="checkout" field="footerText" value={co.footerText} />
      </footer>
    </div>
  );
}
