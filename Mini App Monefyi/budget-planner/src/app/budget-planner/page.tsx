"use client";

import { useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Calculator } from "lucide-react";
import { HeroSection } from "@/components/budget-planner/HeroSection";
import { PenghasilanInput } from "@/components/budget-planner/PenghasilanInput";
import { MetodeSelector } from "@/components/budget-planner/MetodeSelector";
import { BudgetDashboard } from "@/components/budget-planner/BudgetDashboard";
import { InsightPanel } from "@/components/budget-planner/InsightPanel";
import { PenyesuaianManual } from "@/components/budget-planner/PenyesuaianManual";
import { RiwayatBudget } from "@/components/budget-planner/RiwayatBudget";
import { TipsKeuangan } from "@/components/budget-planner/TipsKeuangan";
import { DisclaimerSection } from "@/components/budget-planner/DisclaimerSection";
import { BonusLiteBanner } from "@/components/shared/BonusLiteBanner";
import { LifetimeBonusCTA } from "@/components/shared/LifetimeBonusCTA";
import { Toast } from "@/components/budget-planner/Toast";
import { useBudgetPlanner } from "@/hooks/useBudgetPlanner";
import { useToast } from "@/hooks/useToast";
import type { ProfilKeuangan, RiwayatItem } from "@/types/budget-planner";
import { cn } from "@/lib/cn";

export default function BudgetPlannerPage() {
  const {
    profilKeuangan,
    metodeAktif,
    budgetPlan,
    envelopeData,
    zeroBudgetState,
    insights,
    isCalculated,
    isLoading,
    setProfil,
    setMetode,
    calculateBudget,
    updateKategoriAlokasi,
    updateKategoriTerpakai,
    resetBudget,
    saveBudget,
    loadRiwayat,
    addEnvelopeTransaksi,
    pindahSaldoEnvelope,
    addZeroBasedKategori,
    removeZeroBasedKategori,
    updateZeroBasedAlokasi,
  } = useBudgetPlanner();

  const { toasts, showToast, dismissToast } = useToast();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);

  const canCalculate =
    profilKeuangan.penghasilanBulanan > 0 && metodeAktif;

  const handleCalculate = useCallback(() => {
    if (!canCalculate) {
      showToast({
        message: "Masukkan penghasilan utama terlebih dahulu.",
        variant: "warning",
      });
      return;
    }
    calculateBudget();
    showToast({
      message: "Budget berhasil dihitung secara otomatis! 🎉",
      variant: "success",
    });
    setTimeout(() => {
      dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }, [canCalculate, calculateBudget, showToast]);

  const handleReset = () => {
    resetBudget();
    showToast({ message: "Budget direset. Mulai perencanaan baru.", variant: "info" });
  };

  const handleSave = () => {
    saveBudget();
    showToast({ message: "Budget berhasil disimpan ke riwayat! ✅", variant: "success" });
  };

  const handleScrollToStart = () => {
    step1Ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUpdateAlokasi = (id: string, rupiah: number) => {
    updateKategoriAlokasi(id, rupiah);
  };

  const handleUpdateTerpakai = (id: string, rupiah: number) => {
    updateKategoriTerpakai(id, rupiah);
    showToast({ message: "Pengeluaran diperbarui.", variant: "info" });
  };

  const handleRiwayatLoad = (_riwayat: RiwayatItem) => {
    showToast({ message: "Fitur load riwayat akan segera hadir.", variant: "info" });
  };

  // Step progress
  const step1Done = profilKeuangan.penghasilanBulanan > 0;
  const step2Done = !!metodeAktif;
  const step3Done = isCalculated;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <HeroSection onStart={handleScrollToStart} />

      <div className="max-w-6xl mx-auto px-4 -mt-6 mb-2 relative z-10">
        <BonusLiteBanner appId="budget" />
      </div>

      {/* Progress steps */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            {[
              { step: 1, label: "Penghasilan", done: step1Done },
              { step: 2, label: "Metode Budget", done: step2Done },
              { step: 3, label: "Dashboard", done: step3Done },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2 shrink-0">
                {i > 0 && (
                  <ChevronRight size={14} className="text-slate-600 shrink-0" />
                )}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    s.done
                      ? "bg-green-900/50 text-green-400 border border-green-700/50"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                      s.done ? "bg-green-500 text-white" : "bg-slate-700 text-slate-400"
                    )}
                  >
                    {s.done ? "✓" : s.step}
                  </span>
                  {s.label}
                </div>
              </div>
            ))}

            <div className="ml-auto">
              {canCalculate && (
                <button
                  onClick={handleCalculate}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                  }}
                >
                  <Calculator size={12} />
                  {isCalculated ? "Hitung Ulang" : "Hitung Budget"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
        {/* Step 1 & 2 */}
        <div ref={step1Ref} className="grid gap-6 lg:grid-cols-2">
          <PenghasilanInput
            profil={profilKeuangan}
            onUpdate={(partial: Partial<ProfilKeuangan>) => setProfil(partial)}
          />
          <MetodeSelector
            selected={metodeAktif}
            onSelect={setMetode}
          />
        </div>

        {/* Calculate CTA */}
        {!isCalculated && canCalculate && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <button
              onClick={handleCalculate}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
            >
              <Calculator size={20} />
              Hitung Budget Otomatis
            </button>
          </motion.div>
        )}

        {/* Step 3: Dashboard */}
        <AnimatePresence>
          {isCalculated && budgetPlan && (
            <motion.div
              ref={dashboardRef}
              key="dashboard"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <BudgetDashboard
                plan={budgetPlan}
                zeroBudgetState={zeroBudgetState}
                envelopeData={envelopeData}
                onUpdateAlokasi={handleUpdateAlokasi}
                onUpdateTerpakai={handleUpdateTerpakai}
                onReset={handleReset}
                onAddEnvelopeTransaksi={addEnvelopeTransaksi}
                onPindahSaldoEnvelope={pindahSaldoEnvelope}
                onAddZeroKategori={addZeroBasedKategori}
                onRemoveZeroKategori={removeZeroBasedKategori}
                onUpdateZeroAlokasi={updateZeroBasedAlokasi}
                onShowToast={(msg) => showToast({ message: msg, variant: "success" })}
                riwayatCallback={loadRiwayat}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights */}
        <AnimatePresence>
          {isCalculated && insights.length > 0 && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <InsightPanel insights={insights} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Penyesuaian Manual */}
        {isCalculated && budgetPlan && (
          <PenyesuaianManual
            plan={budgetPlan}
            onUpdateAlokasi={updateKategoriAlokasi}
            onReset={() => {
              calculateBudget();
              showToast({ message: "Alokasi direset ke default.", variant: "info" });
            }}
          />
        )}

        {/* Riwayat */}
        <RiwayatBudget onSave={handleSave} onLoad={handleRiwayatLoad} />

        {/* Tips */}
        <TipsKeuangan />

        <LifetimeBonusCTA appId="budget" className="mb-8" />

        {/* Disclaimer */}
        <DisclaimerSection />
      </main>

      {/* Sticky bottom bar for mobile */}
      {isCalculated && budgetPlan && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 text-white text-sm font-semibold"
            >
              Simpan Budget
            </button>
            <button
              onClick={() => {
                const text = `Budget ${budgetPlan.bulan} — ${budgetPlan.totalPenghasilan.toLocaleString("id-ID")}`;
                if (navigator.clipboard) navigator.clipboard.writeText(text);
                showToast({ message: "Disalin!", variant: "success" });
              }}
              className="px-4 py-3 rounded-2xl border border-slate-700 text-slate-400"
            >
              Salin
            </button>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
