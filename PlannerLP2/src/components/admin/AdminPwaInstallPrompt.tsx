"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, X, Share, PlusSquare, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AdminPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isWaitingPrompt, setIsWaitingPrompt] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneMode);

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua) && !((window as unknown as { MSStream?: unknown }).MSStream);
    setIsIOS(isAppleMobile);

    // Register Service Worker for Admin PWA scoped to /admin
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => {
        // Silently tolerate if SW registration is restricted
      });
    }

    // 1. Ambil prompt yang sudah ditangkap lebih awal di head
    const preCaptured =
      (window as any).__pwaPrompts?.admin ||
      (window as any).__pwaLastPrompt ||
      null;
    if (preCaptured) {
      setDeferredPrompt(preCaptured);
    }

    // 2. Catch Chrome/Android install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      setDeferredPrompt(p);
      (window as any).__pwaPrompts = (window as any).__pwaPrompts || {};
      (window as any).__pwaPrompts.admin = p;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Catch custom event dari script head
    const handlePromptReady = (e: any) => {
      if (e?.detail?.prompt) {
        setDeferredPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("pwa-prompt-ready", handlePromptReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse =
      deferredPrompt ||
      (window as any).__pwaPrompts?.admin ||
      (window as any).__pwaLastPrompt;

    if (promptToUse && typeof promptToUse.prompt === "function") {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          setIsDismissed(true);
        }
        return;
      } catch (err) {
        console.warn("[pwa-admin] Native prompt error:", err);
      }
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Tunggu sesaat jika Chrome sedang evaluasi installability
    setIsWaitingPrompt(true);
    setTimeout(async () => {
      const retryPrompt =
        deferredPrompt ||
        (window as any).__pwaPrompts?.admin ||
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
      {/* Top Banner / Install Prompt */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-900/40 relative shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-white">Pasang Aplikasi Admin CRM di HP</span>
              <span className="hidden sm:inline text-slate-300 ml-1.5">
                — Terpisah dari Estimator, langsung klik untuk instal tanpa setting browser.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isWaitingPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-lg text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isWaitingPrompt ? "Membuka..." : "Install di HP"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Panduan Install di HP (Khusus iOS / Fallback) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 text-slate-900 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Pasang di Layar Utama HP</h3>
                  <p className="text-xs text-slate-500">Monefyi Admin CRM PWA</p>
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
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {isIOS ? "Ketuk tombol 'Bagikan' (Share)" : "Buka Menu Browser"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isIOS ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                        Ikon kotak dengan panah ke atas <Share className="w-3 h-3 inline" /> di bilah bawah Safari.
                      </span>
                    ) : (
                      "Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Chrome/browser Anda."
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
                      Pilih <PlusSquare className="w-3 h-3 inline" /> Add to Home Screen / Tambahkan ke Layar Utama.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ketuk 'Tambah' (Add)</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aplikasi Admin CRM akan terpasang di HP Anda terpisah dari Estimator!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all cursor-pointer"
            >
              Mengerti, Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
