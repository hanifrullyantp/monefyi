"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { trackEvent, captureUtm } from "@/lib/analytics/events";
import { useLeadsStore } from "@/lib/store/leadsStore";

function isValidWa(raw: string): boolean {
  const n = raw.replace(/\D/g, "");
  return /^(62|08)\d{8,13}$/.test(n) || /^8\d{8,12}$/.test(n);
}

export function CalculatorSection() {
  const addLead = useLeadsStore((s) => s.addLead);

  const [waPerMonth, setWaPerMonth] = useState(50);
  const [surveiCount, setSurveiCount] = useState(20);
  const [dealCount, setDealCount] = useState(4);
  const [nilaiProyek, setNilaiProyek] = useState(15_000_000);
  const [jamPerSurvei, setJamPerSurvei] = useState(3);

  const [started, setStarted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (started) trackEvent("calc_start");
  }, [started]);

  const results = useMemo(() => {
    const closingRate = waPerMonth > 0 ? (dealCount / waPerMonth) * 100 : 0;
    const surveiSiaSia = Math.max(0, surveiCount - dealCount);
    const waktuTerbuang = surveiSiaSia * jamPerSurvei;
    const potentialLost = Math.max(0, waPerMonth - surveiCount);
    return {
      closingRate: closingRate.toFixed(1),
      closingRateNum: closingRate,
      waktuTerbuang,
      hariTerbuang: (waktuTerbuang / 8).toFixed(1),
      revenueLostMin: Math.round(potentialLost * 0.15 * nilaiProyek),
      revenueLostMax: Math.round(potentialLost * 0.25 * nilaiProyek),
      jamHemat: Math.round(surveiSiaSia * jamPerSurvei * 0.6),
    };
  }, [waPerMonth, surveiCount, dealCount, nilaiProyek, jamPerSurvei]);

  const unlock = () => {
    setError("");
    if (!name.trim()) {
      setError("Isi nama dulu.");
      return;
    }
    if (!isValidWa(phone)) {
      setError("Nomor WA harus diawali 08 atau 62.");
      return;
    }
    const utm = captureUtm();
    addLead({
      name: name.trim(),
      phone: phone.trim(),
      source: "website",
      status: "new",
      projectType: "estimator_calc",
      notes: JSON.stringify({ ...results, ...utm, waPerMonth, surveiCount, dealCount }),
      tags: ["calculator", "landing"],
    });
    trackEvent("lead_submit", { source: "calculator" });
    trackEvent("calc_complete");
    setUnlocked(true);
  };

  const scrollToHarga = () => {
    const el = document.getElementById("harga");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <section id="kalkulator" className="section-pad bg-[var(--surface-soft)]">
      <Container className="content-max">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block bg-[var(--surface-alt)] text-[var(--brand-600)] rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase mb-3">
            Gratis · 30 detik
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight mb-3">
            Cek Efisiensi Closing Bisnismu
          </h2>
          <p className="text-[var(--muted)]">
            Masukkan data bulan ini. Ringkasan langsung muncul; rekomendasi detail setelah isi nomor WA.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[var(--surface-alt)]">
            <h3 className="text-lg font-bold text-[var(--ink)] mb-5">Data kamu</h3>
            <div className="space-y-5" onFocus={() => setStarted(true)}>
              {[
                { label: "WA masuk / bulan", value: waPerMonth, set: setWaPerMonth, min: 10, max: 500, unit: "chat" },
                { label: "Yang jadi survei", value: surveiCount, set: setSurveiCount, min: 0, max: waPerMonth, unit: "lokasi" },
                { label: "Yang deal", value: dealCount, set: setDealCount, min: 0, max: surveiCount, unit: "deal" },
                { label: "Jam per survei", value: jamPerSurvei, set: setJamPerSurvei, min: 1, max: 8, unit: "jam" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2">{f.label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={f.min}
                      max={f.max}
                      value={f.value}
                      onChange={(e) => f.set(Number(e.target.value))}
                      className="flex-1 accent-[var(--brand-600)]"
                    />
                    <span className="text-sm font-bold w-20 text-right">
                      {f.value} {f.unit}
                    </span>
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2">Nilai rata-rata proyek (Rp)</label>
                <input
                  type="number"
                  value={nilaiProyek}
                  onChange={(e) => setNilaiProyek(Number(e.target.value) || 0)}
                  className="w-full border border-[var(--surface-alt)] rounded-xl px-4 py-3 text-sm min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-dark)] text-white rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-[var(--brand-400)] mb-5">Hasil ringkas</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Closing rate
                </div>
                <p className={cn("text-2xl font-extrabold", results.closingRateNum < 10 ? "text-red-300" : "text-[var(--brand-400)]")}>
                  {results.closingRate}%
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Waktu sia-sia
                </div>
                <p className="text-2xl font-extrabold text-[var(--accent-warm)]">{results.waktuTerbuang}j</p>
                <p className="text-[10px] text-white/40">≈ {results.hariTerbuang} hari kerja</p>
              </div>
            </div>

            {!unlocked ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-sm text-white/80 font-semibold">
                  Buka rincian + rekomendasi — isi nama & WA
                </p>
                <input
                  type="text"
                  placeholder="Nama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[var(--ink)] min-h-[44px]"
                  aria-label="Nama"
                />
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[var(--ink)] min-h-[44px]"
                  aria-label="Nomor WhatsApp"
                />
                {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
                <button type="button" onClick={unlock} className="w-full btn-brand">
                  Lihat rekomendasi
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-red-300 mb-1">
                    <DollarSign className="w-3.5 h-3.5" /> Perkiraan peluang hilang*
                  </div>
                  <p className="text-lg font-extrabold text-red-200">
                    {formatCurrency(results.revenueLostMin)} – {formatCurrency(results.revenueLostMax)}/bulan
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">*Estimasi kasar dari input kamu, bukan jaminan.</p>
                </div>
                <ul className="text-sm text-white/80 space-y-2">
                  <li>→ Saring lead di WA dulu — hemat sekitar {results.jamHemat} jam/bulan</li>
                  <li>→ Kirim PDF di lokasi — manfaatkan momen klien masih serius</li>
                  <li>→ Pakai Estimator gratis 3x, upgrade kalau pas</li>
                </ul>
                <button type="button" onClick={scrollToHarga} className="w-full btn-brand inline-flex items-center justify-center gap-2">
                  Lihat paket <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
