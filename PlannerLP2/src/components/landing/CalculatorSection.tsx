"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Clock, DollarSign, Target } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

export function CalculatorSection() {
  const { content } = useContentStore();
  const { calculator } = content;

  const [waPerMonth, setWaPerMonth] = useState(50);
  const [surveiCount, setSurveiCount] = useState(20);
  const [dealCount, setDealCount] = useState(4);
  const [nilaiProyek, setNilaiProyek] = useState(15000000);
  const [jamPerSurvei, setJamPerSurvei] = useState(3);

  const results = useMemo(() => {
    const closingRate = waPerMonth > 0 ? (dealCount / waPerMonth) * 100 : 0;
    const surveiSiaSia = Math.max(0, surveiCount - dealCount);
    const waktuTerbuang = surveiSiaSia * jamPerSurvei;
    const hariTerbuang = (waktuTerbuang / 8).toFixed(1);
    const potentialLost = waPerMonth - surveiCount;
    const revenueLostMin = Math.round(potentialLost * 0.15 * nilaiProyek);
    const revenueLostMax = Math.round(potentialLost * 0.25 * nilaiProyek);
    const jamHemat = Math.round(surveiSiaSia * jamPerSurvei * 0.6);
    const revenueExtra = Math.round(
      dealCount * 2 * nilaiProyek * 0.3
    );

    return {
      closingRate: closingRate.toFixed(1),
      closingRateNum: closingRate,
      waktuTerbuang,
      hariTerbuang,
      revenueLostMin,
      revenueLostMax,
      jamHemat,
      revenueExtra,
    };
  }, [waPerMonth, surveiCount, dealCount, nilaiProyek, jamPerSurvei]);

  const closingColor =
    results.closingRateNum < 10
      ? "text-red-400"
      : results.closingRateNum < 20
      ? "text-amber-400"
      : "text-emerald-400";

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-emerald-50 to-white">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-4">
            {calculator.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            {calculator.title}
          </h2>
          <p className="text-lg text-slate-600">{calculator.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-6">Input Data Anda</h3>
            <div className="space-y-6">
              {/* WA per bulan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rata-rata WA masuk per bulan
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={10}
                    max={500}
                    value={waPerMonth}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setWaPerMonth(v);
                      if (surveiCount > v) setSurveiCount(v);
                      if (dealCount > surveiCount) setDealCount(surveiCount);
                    }}
                    className="flex-1 accent-emerald-600"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <input
                      type="number"
                      value={waPerMonth}
                      onChange={(e) => setWaPerMonth(Number(e.target.value))}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                    />
                    <span className="text-sm text-slate-500">chat</span>
                  </div>
                </div>
              </div>

              {/* Survei */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Berapa yang jadi survei?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={waPerMonth}
                    value={Math.min(surveiCount, waPerMonth)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSurveiCount(v);
                      if (dealCount > v) setDealCount(v);
                    }}
                    className="flex-1 accent-emerald-600"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <input
                      type="number"
                      value={surveiCount}
                      onChange={(e) => setSurveiCount(Number(e.target.value))}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                    />
                    <span className="text-sm text-slate-500">survei</span>
                  </div>
                </div>
              </div>

              {/* Deal */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Berapa yang jadi deal?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={surveiCount}
                    value={Math.min(dealCount, surveiCount)}
                    onChange={(e) => setDealCount(Number(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <input
                      type="number"
                      value={dealCount}
                      onChange={(e) => setDealCount(Number(e.target.value))}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                    />
                    <span className="text-sm text-slate-500">proyek</span>
                  </div>
                </div>
              </div>

              {/* Nilai Proyek */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rata-rata nilai proyek
                </label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-slate-500 text-sm font-medium">Rp</span>
                  <input
                    type="number"
                    value={nilaiProyek}
                    onChange={(e) => setNilaiProyek(Number(e.target.value))}
                    className="flex-1 outline-none text-sm font-semibold text-slate-800"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  = {formatCurrency(nilaiProyek)}
                </p>
              </div>

              {/* Jam per survei */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Berapa jam per survei (perjalanan + lokasi)?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={jamPerSurvei}
                    onChange={(e) => setJamPerSurvei(Number(e.target.value))}
                    className="flex-1 accent-emerald-600"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <span className="text-xl font-bold text-slate-800 w-6 text-center">
                      {jamPerSurvei}
                    </span>
                    <span className="text-sm text-slate-500">jam</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl"
          >
            <h3 className="text-xl font-bold text-emerald-400 mb-6">Hasil Analisis</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Closing Rate */}
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Closing Rate
                  </span>
                </div>
                <p className={cn("text-3xl font-extrabold", closingColor)}>
                  {results.closingRate}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {results.closingRateNum < 10 ? "Perlu ditingkatkan" : results.closingRateNum < 20 ? "Cukup baik" : "Sangat baik"}
                </p>
              </div>

              {/* Waktu Terbuang */}
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Waktu Sia-sia
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-amber-400">
                  {results.waktuTerbuang}j
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ={" "}{results.hariTerbuang} hari kerja
                </p>
              </div>
            </div>

            {/* Revenue Hilang */}
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Potensi Revenue Hilang
                </span>
              </div>
              <p className="text-2xl font-extrabold text-red-300">
                {formatCurrency(results.revenueLostMin)} – {formatCurrency(results.revenueLostMax)}/bulan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                dari lead yang tidak tersaring baik
              </p>
            </div>

            {/* Rekomendasi */}
            <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Rekomendasi
                </span>
              </div>
              <ul className="space-y-2">
                <li className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">→</span>
                  Saring lead di WA → hemat {results.jamHemat} jam/bulan
                </li>
                <li className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">→</span>
                  Closing saat survei → naikkan closing rate 2-3x
                </li>
                <li className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">→</span>
                  Potensi tambahan: {formatCurrency(results.revenueExtra)}/bulan
                </li>
              </ul>
            </div>

            <button
              onClick={() => scrollTo("harga")}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-4 font-bold text-base transition-all"
            >
              {calculator.ctaText}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
