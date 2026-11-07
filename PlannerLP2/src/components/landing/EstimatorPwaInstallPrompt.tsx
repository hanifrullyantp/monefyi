"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, X, Share, PlusSquare, Sparkles } from "lucide-react";
import { EstimatorLogo } from "@/components/brand/EstimatorLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "monefyi_estimator_pwa_dismissed";

export function EstimatorPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isWaitingPrompt, setIsWaitingPrompt] = useState(false);

  useEffect(() => {
    // Cek apakah sudah terpasang (standalone mode)
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneMode);

    if (standaloneMode) return;

    // Cek apakah pernah di-dismiss
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setIsDismissed(dismissed);

    // Cek iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua) && !((window as unknown as { MSStream?: unknown }).MSStream);
    setIsIOS(isAppleMobile);

    // 1. Ambil prompt yang sudah ditangkap lebih awal di head
    const preCaptured =
      (window as any).__pwaPrompts?.estimator ||
      (window as any).__pwaLastPrompt ||
      null;
    if (preCaptured) {
      setDeferredPrompt(preCaptured);
    }

    // 2. Listener event bawaan Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      setDeferredPrompt(p);
      (window as any).__pwaPrompts = (window as any).__pwaPrompts || {};
      (window as any).__pwaPrompts.estimator = p;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 3. Listener custom dari head
    const handleCustomReady = (e: any) => {
      if (e?.detail?.prompt) {
        setDeferredPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("pwa-prompt-ready", handleCustomReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pwa-prompt-ready", handleCustomReady);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleInstallClick = async () => {
    const promptToUse =
      deferredPrompt ||
      (window as any).__pwaPrompts?.estimator ||
      (window as any).__pwaLastPrompt;

    if (promptToUse && typeof promptToUse.prompt === "function") {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          handleDismiss();
        }
        return;
      } catch (err) {
        console.warn("[pwa-estimator] Native prompt error:", err);
      }
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Tunggu sesaat jika Chrome sedang inisialisasi install prompt
    setIsWaitingPrompt(true);
    setTimeout(async () => {
      const retryPrompt =
        deferredPrompt ||
        (window as any).__pwaPrompts?.estimator ||
        (window as any).__pwaLastPrompt;
      setIsWaitingPrompt(false);
      if (retryPrompt && typeof retryPrompt.prompt === "function") {
        await retryPrompt.prompt();
      } else {
        setShowIOSModal(true);
      }
    }, 1000);
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Pill Banner di Pojok Bawah Layar */}
      <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-bounce-in">
        <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-emerald-500/40 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <EstimatorLogo className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white">Pasang Estimator di HP</span>
              <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-300 px-1.5 py-0.2 rounded">PWA</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Buka aplikasi langsung dari home screen, hitung & kirim PDF penawaran lebih cepat.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isWaitingPrompt}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isWaitingPrompt ? "Membuka..." : "Install Sekarang"}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Panduan Install di HP (Khusus iOS / Fallback) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 text-slate-900 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Pasang di Layar Utama HP</h3>
                  <p className="text-xs text-slate-500">Monefyi Estimator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 my-5 text-sm text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {isIOS ? "Ketuk tombol 'Bagikan' (Share)" : "Buka Menu Browser"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isIOS ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        Ikon kotak panah atas <Share className="w-3 h-3 inline" /> di bilah bawah Safari.
                      </span>
                    ) : (
                      "Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Chrome Anda."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Pilih 'Tambahkan ke Layar Utama'</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="inline-flex items-center gap-1 font-medium text-purple-700">
                      Pilih <PlusSquare className="w-3 h-3 inline" /> Tambahkan ke Layar Utama / Install Aplikasi.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ketuk 'Tambah' (Add)</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aplikasi Estimator siap dipakai langsung dari home screen HP Anda!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all"
            >
              Mengerti, Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  );
}

