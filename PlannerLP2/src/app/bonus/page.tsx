"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Gift, LockKeyhole } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { LoginRedirect } from "@/components/landing/LoginRedirect";
import { Navbar } from "@/components/landing/Navbar";
import { useUIStore } from "@/lib/store/uiStore";
import { canClaimBonusApps } from "@/lib/permissions";
import { BONUS_APPS, bonusAppUrl, type BonusAppDef } from "@/lib/config/bonusApps";

export default function BonusPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setLoginModalOpen = useUIStore((state) => state.setLoginModalOpen);
  const [selectedApp, setSelectedApp] = useState<BonusAppDef | null>(null);
  const canClaim = canClaimBonusApps(user);

  const openApp = (app: BonusAppDef) => {
    if (!hydrated || !isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (!canClaim) return;
    setSelectedApp(app);
  };

  return (
    <>
      <AuthHydrator />
      <ContentHydrator />
      <LoginRedirect />
      <Navbar />
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Monefyi
          </button>

          <header className="mb-10 rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 p-7 sm:p-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
              <Gift className="h-4 w-4" /> Bonus eksklusif pembeli
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Etalase Aplikasi Bonus</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Empat mini app Lite (Budget, Debt Free, Bagi Hasil, Kalkulator Gaji) untuk pembeli Estimator Standard/Pro
              atau Planner. Login dengan akun yang sama saat checkout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-slate-200">
                <Check className="h-4 w-4 text-emerald-400" /> Status akun:{" "}
                {!hydrated ? "Memeriksa…" : !isAuthenticated ? "Belum login" : canClaim ? "Bonus aktif" : "Belum termasuk"}
              </span>
              {isAuthenticated && canClaim && (
                <span className="rounded-xl bg-emerald-400/10 px-4 py-2 font-semibold text-emerald-300">
                  Terbuka untuk akun ini
                </span>
              )}
            </div>
            {!hydrated ? null : !isAuthenticated ? (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                Login untuk klaim bonus <ArrowRight className="h-4 w-4" />
              </button>
            ) : !canClaim ? (
              <p className="mt-6 text-sm text-slate-400">
                Bonus ini tersedia setelah pembelian Estimator atau Planner. Pastikan Anda login dengan email yang sama
                saat pembayaran.
              </p>
            ) : null}
          </header>

          <section aria-label="Aplikasi bonus" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {BONUS_APPS.map((app) => {
              const Icon = app.icon;
              const unlocked = hydrated && isAuthenticated && canClaim;
              return (
                <article
                  key={app.id}
                  className="flex min-h-[290px] flex-col rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-amber-300">
                      {app.valueLabel}
                    </span>
                  </div>
                  <h2 className="mt-6 text-xl font-extrabold">{app.name}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{app.description}</p>
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <div
                      className={`mb-3 flex items-center gap-2 text-xs font-bold ${unlocked ? "text-emerald-300" : "text-slate-500"}`}
                    >
                      {unlocked ? <Check className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                      {unlocked ? "Siap digunakan" : "Terkunci — login pembeli"}
                    </div>
                    <button
                      type="button"
                      onClick={() => openApp(app)}
                      disabled={hydrated && isAuthenticated && !canClaim}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {unlocked ? "Buka aplikasi" : "Klaim akses"} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {selectedApp && (
            <div
              className="fixed inset-0 z-[100] flex flex-col bg-slate-950"
              role="dialog"
              aria-modal="true"
              aria-label={selectedApp.name}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{selectedApp.name}</h2>
                  <p className="text-xs text-slate-400">Mini app bonus · by Monefyi Lite</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={bonusAppUrl(selectedApp)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
                  >
                    Buka tab baru <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <iframe
                title={selectedApp.name}
                src={bonusAppUrl(selectedApp)}
                className="min-h-0 flex-1 border-0 bg-white"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
