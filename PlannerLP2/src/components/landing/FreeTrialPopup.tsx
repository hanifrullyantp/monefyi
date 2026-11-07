"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, Loader2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useUIStore } from "@/lib/store/uiStore";
import { ownsEstimator } from "@/lib/permissions";
import { trackEvent } from "@/lib/analytics/events";
import { trackMetaCompleteRegistration } from "@/lib/analytics/metaPixel";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { scrollToPricingSection } from "@/lib/hooks/useLandingCta";

type TriggerReason = "back_button" | "exit_intent" | "idle";

/**
 * Relink Back System & Exit Popup:
 * Menangkap tombol Back browser dan exit intent (kursor keluar layar),
 * lalu memunculkan popup besar penawaran Free Trial dengan form registrasi instan.
 * Saat data disubmit: mengirim pixel CompleteRegistration (BUKAN InitiateCheckout/IC, dan BUKAN Payment API).
 */
export function FreeTrialPopup() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { isAdmin, isEditMode } = useLandingAdmin();
  const isLoginModalOpen = useUIStore((s) => s.isLoginModalOpen);

  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<TriggerReason>("back_button");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const historyArmedRef = useRef(false);
  const cooldownRef = useRef(false);

  const eligible =
    hydrated &&
    !isAuthenticated &&
    !isAdmin &&
    !isEditMode &&
    !ownsEstimator(user) &&
    !isLoginModalOpen;

  const openPopup = useCallback(
    (reason: TriggerReason) => {
      if (!eligible || open || cooldownRef.current || success) return;
      setTrigger(reason);
      setOpen(true);
      trackEvent("free_trial_popup_view", { source: reason });
    },
    [eligible, open, success],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    setErrorMsg("");
    // Cooldown 1.5 detik agar animasi penutupan tidak langsung tertrigger ulang
    cooldownRef.current = true;
    window.setTimeout(() => {
      cooldownRef.current = false;
    }, 1500);
    trackEvent("free_trial_popup_dismiss", { source: trigger });
  }, [trigger]);

  const viewPaidPlans = useCallback(() => {
    dismiss();
    scrollToPricingSection();
  }, [dismiss]);

  // Relink Back & Exit Intent Listeners
  useEffect(() => {
    if (!eligible || typeof window === "undefined") return;

    // 1. Arm history trap untuk tombol back (mobile & desktop)
    if (!historyArmedRef.current) {
      historyArmedRef.current = true;
      try {
        window.history.pushState({ relinkFreeTrial: true }, "", window.location.href);
      } catch {
        /* ignore */
      }
    }

    const onPopState = () => {
      // Re-push agar klik back berikutnya tetap tertangkap
      try {
        window.history.pushState({ relinkFreeTrial: true }, "", window.location.href);
      } catch {
        /* ignore */
      }
      openPopup("back_button");
    };

    // 2. Exit Intent mouseout / mouseleave ke arah tab/toolbar atas (desktop)
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.relatedTarget === null) {
        openPopup("exit_intent");
      }
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [eligible, openPopup]);

  // Handle ESC key & scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismiss]);

  // Submit Free Trial Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setErrorMsg("Mohon masukkan nama lengkap Anda (minimal 2 karakter).");
      return;
    }

    const cleanDigits = phone.replace(/[^0-9]/g, "");
    if (cleanDigits.length < 8) {
      setErrorMsg("Mohon masukkan nomor WhatsApp aktif yang valid.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Mohon masukkan alamat email aktif yang valid.");
      return;
    }

    setLoading(true);

    try {
      // 1. Kirim data registrasi gratis ke API server (Rp 0, tanpa Mayar checkout gateway invoice)
      const res = await fetch("/api/checkout/mayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "free",
          customerName: cleanName,
          email: cleanEmail,
          mobile: cleanDigits,
          bumpTaken: false,
          amount: 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.ok) {
        throw new Error(resData?.error || "Gagal mendaftarkan akses Free Trial.");
      }

      // 2. Simpan lead progress ke CRM backend
      const sid = `relink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      fetch("/api/crm/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          name: cleanName,
          email: cleanEmail,
          phone: cleanDigits,
          planTier: "free",
          bumpTaken: false,
          paymentMethod: "free",
          amount: 0,
          checkoutStep: 5,
          status: "free_active",
        }),
      }).catch(() => {});

      // 3. META PIXEL: CompleteRegistration (Registrations completed)
      // JANGAN PERNAH panggil InitiateCheckout (IC) atau Payment API untuk paket Free Trial!
      trackMetaCompleteRegistration({
        content_name: "Estimator Free Trial (Relink Back)",
        status: "completed",
        value: 0,
        currency: "IDR",
      });

      trackEvent("free_signup", {
        source: `relink_popup_${trigger}`,
        email: cleanEmail,
      });

      setSuccess(true);

      // 4. Redirect ke aplikasi Estimator dengan status teraktivasi
      const targetUrl =
        resData.redirectUrl ||
        plannerAppPath(
          `/app/estimator?status=activated&plan=free&email=${encodeURIComponent(cleanEmail)}`,
        );

      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala koneksi. Silakan coba kembali.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-trial-heading"
        >
          {/* Backdrop gelap dengan efek blur */}
          <button
            type="button"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            aria-label="Tutup"
            onClick={dismiss}
          />

          {/* Modal Box Besar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-xl md:max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
          >
            {/* Top Gradient Banner */}
            <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

            {/* Tombol Tutup (X) */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 p-2.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10"
              aria-label="Tutup modal penawaran"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 md:p-9">
              {success ? (
                /* Tampilan Berhasil */
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Akses Free Trial Berhasil Diaktifkan!
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Terima kasih, <strong>{name}</strong>. Akun uji coba Estimator Anda telah aktif. Mengalihkan ke dashboard aplikasi dalam beberapa detik…
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan workspace gratis Anda…</span>
                  </div>
                </div>
              ) : (
                /* Form Penawaran Free Trial */
                <>
                  {/* Badge & Headline */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold uppercase tracking-wider mb-4">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>Tunggu Sebentar! Penawaran Spesial Sebelum Pergi</span>
                  </div>

                  <h2
                    id="free-trial-heading"
                    className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight"
                  >
                    Coba Gratis Estimator — Buat Penawaran Kilat Tanpa Biaya Sepeserpun!
                  </h2>

                  <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                    Jangan pulang survei tanpa penawaran. Aktifkan <strong>Free Trial Estimator</strong> sekarang dan buat 3 penawaran proyek lengkap dengan PDF resmi langsung dari HP Anda.
                  </p>

                  {/* 4 Keunggulan Free Trial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>3 Kuota Estimasi Proyek Lengkap</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Export PDF Penawaran Siap Kirim WA</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>Hitung Material & Upah Otomatis</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>100% Gratis Tanpa Kartu Kredit</span>
                    </div>
                  </div>

                  {/* Form Isi Data */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                        {errorMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          disabled={loading}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nomor WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          disabled={loading}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Alamat Email Aktif
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com (untuk akses akun)"
                        disabled={loading}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Tombol Submit Free Trial */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[50px] mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm sm:text-base hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-700/20 transition cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Mempersiapkan Akses Free Trial…</span>
                        </>
                      ) : (
                        <>
                          <span>Klaim Akses Free Trial Saya (Gratis)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Footer Modal: Sekunder ke Paket Standard / Pro */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={viewPaidPlans}
                      className="font-bold text-slate-600 hover:text-emerald-700 transition"
                    >
                      Ingin langsung fitur tanpa batas? <span className="underline">Pilih Standard (Rp 93.000) / Pro</span>
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Nanti saja, tetap keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
