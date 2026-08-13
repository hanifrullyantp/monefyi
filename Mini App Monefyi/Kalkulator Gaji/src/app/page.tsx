"use client";

import { Footer } from "@/components/layout/Footer";
import { BonusLiteBanner } from "@/components/shared/BonusLiteBanner";
import { LifetimeBonusCTA } from "@/components/shared/LifetimeBonusCTA";
import { SalaryCalculator } from "@/components/calculator/SalaryCalculator";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        <section className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Hitung Gaji Bersih &amp; PPh21
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Estimasi take-home pay dengan tarif efektif rata-rata (TER) — sama seperti versi
            demo di monefyi.com Extra Bonuses.
          </p>
        </section>

        <BonusLiteBanner appId="salary" />

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5 md:p-8">
          <SalaryCalculator />
        </section>

        <LifetimeBonusCTA appId="salary" />
      </main>

      <Footer />
    </div>
  );
}
