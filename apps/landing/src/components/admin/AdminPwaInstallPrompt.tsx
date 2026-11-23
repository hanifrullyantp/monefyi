"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, X, Share, PlusSquare, MoreVertical, ShieldCheck, ExternalLink } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AdminPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isWaitingPrompt, setIsWaitingPrompt] = useState(false);

  useEffect(() => {
    // Cek apakah sudah dalam mode standalone / PWA terinstall
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneMode);

    // Cek apakah Apple iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua) && !((window as unknown as { MSStream?: unknown }).MSStream);
    setIsIOS(isAppleMobile);

    // Register Service Worker untuk Admin PWA scoped ke /admin/
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin/" }).catch(() => {
        // Toleransi jika SW registration terbatas
      });
    }

    // 1. Ambil prompt khusus admin yang ditangkap di head
    const preCaptured = (window as any).__pwaPrompts?.admin || null;
    if (preCaptured) {
      setDeferredPrompt(preCaptured);
    }

    // 2. Tangkap event install Chrome/Android khusus rute admin
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      (window as any).__pwaPrompts = (window as any).__pwaPrompts || {};
      (window as any).__pwaPrompts.admin = p;
      setDeferredPrompt(p);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Tangkap custom event admin dari script head layout
    const handleAdminPromptReady = (e: any) => {
      if (e?.detail?.prompt) {
        setDeferredPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("pwa-admin-prompt-ready", handleAdminPromptReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-admin-prompt-ready", handleAdminPromptReady);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).__pwaPrompts?.admin;

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

    // Jika native prompt belum siap atau browser mobile memblokir WebAPK duplikat otomatis,
    // langsung buka modal panduan langkah instalasi terpisah di HP (Android & iOS)
    setShowGuideModal(true);
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Top Banner / Install Prompt */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white px-4 py-2.5 border-b border-indigo-900/40 relative shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-white">Pasang Aplikasi Admin CRM di HP</span>
              <span className="hidden sm:inline text-slate-300 ml-1.5">
                — Terpisah 100% dari Estimator (Ikon Gelap & Notifikasi Realtime).
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

      {/* Modal Panduan Install di HP (Android & iOS) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-800 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Pasang Admin CRM di HP</h3>
                  <p className="text-xs text-slate-400">Terpisah dari Aplikasi Estimator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 mb-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bisa berdampingan:</strong> Aplikasi ini memakai ID & Scope terpisah (<code className="text-emerald-300">/admin/</code>), sehingga tidak akan bentrok atau menimpa aplikasi Estimator yang sudah Anda pasang di HP.
              </span>
            </div>

            <div className="space-y-3.5 my-4 text-sm text-slate-300">
              {isIOS ? (
                // Panduan Khusus iPhone / iPad Safari
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">Ketuk Tombol 'Bagikan' (Share)</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ikon kotak dengan panah ke atas <Share className="w-3.5 h-3.5 inline text-blue-400" /> di bilah bawah browser Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">Pilih 'Tambahkan ke Layar Utama'</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Gulir menu ke bawah lalu pilih <PlusSquare className="w-3.5 h-3.5 inline text-purple-400" /> Add to Home Screen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-white">Ketuk 'Tambah' (Add)</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Aplikasi Admin CRM dengan ikon gelap akan terpasang di layar utama HP Anda.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                // Panduan Khusus Android Chrome & Browser Lainnya
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">Buka Menu Titik Tiga (⋮) Chrome</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ketuk ikon titik tiga <MoreVertical className="w-3.5 h-3.5 inline text-blue-400" /> di pojok kanan atas layar browser Chrome Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">Pilih 'Tambahkan ke Layar Utama' atau 'Pasang Aplikasi'</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pilih menu <strong>Pasang aplikasi (Install app)</strong> atau <strong>Tambahkan ke Layar Utama (Add to Home screen)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-white">Ketuk 'Pasang / Install'</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Aplikasi <strong>Admin CRM</strong> (ikon hitam gelap) akan langsung terpasang di HP Anda tanpa menimpa Estimator!
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Mengerti, Siap Pasang di HP
            </button>
          </div>
        </div>
      )}
    </>
  );
}
