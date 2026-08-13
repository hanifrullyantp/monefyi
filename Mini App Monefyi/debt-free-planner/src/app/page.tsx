// src/app/page.tsx
"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown } from "lucide-react";
import { useDebtPlanner } from "@/hooks/useDebtPlanner";
import { useToast } from "@/hooks/useToast";
import { HeroSection } from "@/components/debt/HeroSection";
import { DebtInputForm } from "@/components/debt/DebtInputForm";
import { IncomeAllocationForm } from "@/components/debt/IncomeAllocationForm";
import { StrategySelector } from "@/components/debt/StrategySelector";
import { ExtraPaymentToggle } from "@/components/debt/ExtraPaymentToggle";
import { ResultsDashboard } from "@/components/debt/ResultsDashboard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BonusLiteBanner } from "@/components/shared/BonusLiteBanner";
import { LifetimeBonusCTA } from "@/components/shared/LifetimeBonusCTA";
import { ToastContainer } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import type { DebtItem, IncomeAllocation, PayoffStrategy } from "@/types";
import { DEBT_TYPES_INFO } from "@/lib/debt-calculator";

function SectionLabel({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
        <span className="text-sm font-bold text-emerald-400">{number}</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  const planner = useDebtPlanner();
  const { toasts, addToast, removeToast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  const totalMinimum = planner.debts.reduce((s, d) => s + d.cicilanMinimum, 0);
  const isAlokasiKurang =
    planner.income.alokasiBayarHutang > 0 &&
    planner.income.alokasiBayarHutang < totalMinimum &&
    totalMinimum > 0;

  const canCalculate =
    planner.debts.length > 0 &&
    planner.income.alokasiBayarHutang > 0 &&
    planner.income.penghasilanBersih > 0;

  const handleAddDebt = () => {
    planner.addDebt({
      nama: "",
      jenis: "kartu_kredit",
      totalHutang: 0,
      bungaPerBulan: DEBT_TYPES_INFO.kartu_kredit.bungaTipikal,
      cicilanMinimum: 0,
    });
  };

  const handleHitung = () => {
    if (!canCalculate) {
      addToast(
        "Lengkapi data hutang, penghasilan, dan alokasi terlebih dahulu.",
        "error"
      );
      return;
    }
    if (isAlokasiKurang) {
      addToast(
        `Alokasi Anda kurang dari total cicilan minimum (Rp ${Math.round(totalMinimum).toLocaleString("id-ID")}). Harap sesuaikan.`,
        "warning"
      );
    }
    planner.hitung();
    addToast("Rencana berhasil dihitung!", "success");
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 400);
  };

  const handleApplyStrategy = (s: PayoffStrategy) => {
    planner.setStrategy(s);
    planner.hitung();
    addToast(
      `Strategi ${s === "snowball" ? "Snowball" : "Avalanche"} diterapkan!`,
      "success"
    );
  };

  const hasData = planner.debts.length > 0 || planner.income.penghasilanBersih > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header onReset={planner.reset} hasData={hasData} />

      <div className="max-w-6xl mx-auto px-4 py-4">
        <BonusLiteBanner appId="debt-free" />
      </div>

      <main className="flex-1">
        {/* Hero */}
        <HeroSection />

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-12">
          {/* Section 1: Debt Input */}
          <section id="debt-form-section">
            <SectionLabel
              number="1"
              title="Data Hutang Anda"
              subtitle="Masukkan semua hutang untuk hasil yang akurat"
            />
            <DebtInputForm
              debts={planner.debts}
              onAdd={handleAddDebt}
              onUpdate={(id, data) => planner.editDebt(id, data as Partial<DebtItem>)}
              onRemove={planner.removeDebt}
            />
          </section>

          {/* Section 2: Income Allocation */}
          <section id="income-section">
            <SectionLabel
              number="2"
              title="Alokasi Pembayaran"
              subtitle="Tentukan berapa yang bisa Anda sisihkan setiap bulan"
            />
            <IncomeAllocationForm
              income={planner.income}
              debts={planner.debts}
              onUpdate={(field, value) =>
                planner.updateIncome(field as keyof IncomeAllocation, value)
              }
            />
          </section>

          {/* Section 3: Strategy */}
          <section id="strategy-section">
            <SectionLabel
              number="3"
              title="Pilih Strategi"
              subtitle="Pilih metode yang sesuai dengan karakter Anda"
            />
            <div className="flex flex-col gap-4">
              <StrategySelector
                selected={planner.strategy}
                onSelect={planner.setStrategy}
                recommended={planner.comparison?.rekomendasi}
              />
              <ExtraPaymentToggle
                income={planner.income}
                debts={planner.debts}
                strategy={planner.strategy}
                onUpdate={(v) => planner.updateIncome("ekstraPembayaran", v)}
              />
            </div>
          </section>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="xl"
              onClick={handleHitung}
              disabled={!canCalculate}
              className="shadow-2xl shadow-emerald-500/30 min-w-[280px]"
              leftIcon={<Calculator size={22} />}
            >
              Hitung Rencana Bebas Hutang
            </Button>
            {!canCalculate && (
              <p className="text-xs text-slate-500 text-center">
                Lengkapi data hutang, penghasilan, dan alokasi untuk melanjutkan
              </p>
            )}
            {canCalculate && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <ChevronDown size={14} />
                <span>Hasil akan muncul di bawah</span>
              </div>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {planner.isCalculated && planner.currentResult && planner.comparison && (
              <motion.section
                ref={resultsRef}
                key="results"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                id="results-section"
              >
                {/* Results divider */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                  <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
                    Hasil Analisis
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                </div>

                <ResultsDashboard
                  result={planner.currentResult}
                  comparison={planner.comparison}
                  insights={planner.insights}
                  currentStrategy={planner.strategy}
                  monthlyAllocation={planner.income.alokasiBayarHutang}
                  onApplyStrategy={handleApplyStrategy}
                  onExport={planner.exportRingkasan}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <LifetimeBonusCTA appId="debt-free" />
      </div>

      <Footer />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Sticky CTA mobile */}
      {canCalculate && !planner.isCalculated && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-30 p-4 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800">
          <Button size="lg" onClick={handleHitung} fullWidth leftIcon={<Calculator size={18} />}>
            Hitung Rencana Sekarang
          </Button>
        </div>
      )}
    </div>
  );
}
