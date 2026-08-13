"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  BudgetPlan,
  ZeroBudgetState,
  EnvelopeData,
  KategoriTipe,
  RiwayatItem,
} from "@/types/budget-planner";
import { METODE_LIST } from "@/lib/budget-data";
import { formatCurrency, formatMonth } from "@/lib/formatters";
import { BudgetSummary } from "./BudgetSummary";
import { AlokasChart } from "./AlokasChart";
import { KategoriCard } from "./KategoriCard";
import { ZeroBasedDashboard } from "./ZeroBasedDashboard";
import { EnvelopeDashboard } from "./EnvelopeDashboard";
import { IslamiSection } from "./IslamiSection";

interface BudgetDashboardProps {
  plan: BudgetPlan;
  zeroBudgetState: ZeroBudgetState | null;
  envelopeData: EnvelopeData[];
  onUpdateAlokasi: (id: string, rupiah: number) => void;
  onUpdateTerpakai: (id: string, rupiah: number) => void;
  onReset: () => void;
  onAddEnvelopeTransaksi: (
    envelopeId: string,
    transaksi: { deskripsi: string; jumlah: number; tanggal: string }
  ) => void;
  onPindahSaldoEnvelope: (fromId: string, toId: string, jumlah: number) => void;
  onAddZeroKategori: (nama: string, tipe: KategoriTipe) => void;
  onRemoveZeroKategori: (id: string) => void;
  onUpdateZeroAlokasi: (id: string, rupiah: number) => void;
  onShowToast: (msg: string) => void;
  riwayatCallback: () => RiwayatItem[];
}

export function BudgetDashboard({
  plan,
  zeroBudgetState,
  envelopeData,
  onUpdateAlokasi,
  onUpdateTerpakai,
  onReset,
  onAddEnvelopeTransaksi,
  onPindahSaldoEnvelope,
  onAddZeroKategori,
  onRemoveZeroKategori,
  onUpdateZeroAlokasi,
  onShowToast,
}: BudgetDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "detail">("overview");

  const metodeInfo = METODE_LIST.find((m) => m.id === plan.metode);
  const isEnvelope = plan.metode === "envelope";
  const isZeroBased = plan.metode === "zero-based";
  const isIslami = plan.metode === "40302010";

  const sedekahKategori = plan.kategori.find((k) => k.tipe === "sedekah");

  const handleCopyRingkasan = () => {
    const lines = [
      "══════════════════════════════════════",
      "RINGKASAN BUDGET BULANAN",
      "Monefyi — Budget Planner",
      `${formatMonth(`${plan.bulan}-${plan.tahun}`)}`,
      "══════════════════════════════════════",
      `Metode     : ${metodeInfo?.nama ?? plan.metode}`,
      `Penghasilan: ${formatCurrency(plan.totalPenghasilan)}`,
      "",
      "ALOKASI:",
      ...plan.kategori.map((k) => {
        const pct =
          plan.totalPenghasilan > 0
            ? ((k.rupiahAlokasi / plan.totalPenghasilan) * 100).toFixed(0)
            : "0";
        const name = k.nama.padEnd(22, " ");
        return `${name}${pct}%  →  ${formatCurrency(k.rupiahAlokasi)}`;
      }),
      "",
      "RINGKASAN:",
      `Total Dialokasikan : ${formatCurrency(plan.totalAlokasi)}`,
      `Total Terpakai     : ${formatCurrency(plan.totalTerpakai)}`,
      `Sisa               : ${formatCurrency(plan.sisa)}`,
      "══════════════════════════════════════",
      "Dibuat dengan Monefyi Budget Planner",
      "monefyi.com/budget-planner",
      "══════════════════════════════════════",
    ];

    const text = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => onShowToast("Ringkasan budget berhasil disalin! 📋"))
        .catch(() => onShowToast("Gagal menyalin. Coba lagi."));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
      id="budget-dashboard"
    >
      {/* Dashboard Header */}
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #022c22 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-green-400" />
              <span className="text-sm text-green-400 font-medium">
                {formatMonth(plan.bulan + "-" + plan.tahun)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Budget{" "}
              {plan.profilKeuangan.namaPengguna
                ? plan.profilKeuangan.namaPengguna + " 👋"
                : "Anda 👋"}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Berdasarkan metode{" "}
              <span className="text-green-400 font-medium">
                {metodeInfo?.nama ?? plan.metode}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyRingkasan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-700/50 bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors text-sm"
              aria-label="Salin ringkasan budget"
            >
              <Copy size={14} />
              Salin Ringkasan
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm"
              aria-label="Reset budget dan mulai baru"
            >
              <RefreshCw size={14} />
              Budget Baru
            </button>
          </div>
        </div>
      </div>

      {/* Main dashboard layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Sidebar: Summary + Chart (Desktop: 5 cols, Mobile: full) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          <div className="sticky top-24 space-y-8">
            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 md:p-8 glass-card premium-shadow">
              <BudgetSummary plan={plan} />
            </div>

            {!isEnvelope && !isZeroBased && (
              <div className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 md:p-8 glass-card">
                <AlokasChart
                  kategori={plan.kategori}
                  totalPenghasilan={plan.totalPenghasilan}
                />
              </div>
            )}

            {/* Islami section */}
            {isIslami && (
              <div className="premium-shadow">
                <IslamiSection
                  sedekahKategori={sedekahKategori}
                  penghasilan={plan.profilKeuangan.penghasilanBulanan}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Content: Kategori cards / special views (Desktop: 7 cols, Mobile: full) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {isEnvelope ? (
            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 md:p-8 glass-card premium-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Amplop Digital</h3>
                  <p className="text-sm text-slate-400">Kelola pengeluaran per amplop</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-900/40 text-blue-400 text-xs font-bold border border-blue-800/50">
                  {envelopeData.length} Aktif
                </span>
              </div>
              <EnvelopeDashboard
                envelopes={envelopeData}
                onAddTransaksi={onAddEnvelopeTransaksi}
                onPindahSaldo={onPindahSaldoEnvelope}
              />
            </div>
          ) : isZeroBased && zeroBudgetState ? (
            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/40 p-6 md:p-8 glass-card premium-shadow">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Zero-Based Budgeting</h3>
                <p className="text-sm text-slate-400">Setiap rupiah harus memiliki tujuan</p>
              </div>
              <ZeroBasedDashboard
                state={zeroBudgetState}
                onUpdateAlokasi={onUpdateZeroAlokasi}
                onAddKategori={onAddZeroKategori}
                onRemoveKategori={onRemoveZeroKategori}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs with premium look */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Rencana Anggaran</h3>
                  <p className="text-sm text-slate-400">Klik ikon pensil untuk mengubah alokasi</p>
                </div>
                <div className="flex gap-1 p-1 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-md">
                  {(["overview", "detail"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                        activeTab === tab
                          ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      )}
                    >
                      {tab === "overview" ? "Grid" : "List"}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "overview" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  {plan.kategori.map((k, i) => (
                    <KategoriCard
                      key={k.id}
                      item={k}
                      totalPenghasilan={plan.totalPenghasilan}
                      onUpdateAlokasi={onUpdateAlokasi}
                      onUpdateTerpakai={onUpdateTerpakai}
                      index={i}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {plan.kategori.map((k, i) => (
                    <KategoriCard
                      key={k.id}
                      item={k}
                      totalPenghasilan={plan.totalPenghasilan}
                      onUpdateAlokasi={onUpdateAlokasi}
                      onUpdateTerpakai={onUpdateTerpakai}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
