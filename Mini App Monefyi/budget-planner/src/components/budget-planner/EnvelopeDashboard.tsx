"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowRightLeft,
  AlertTriangle,
  Check,
  X,
  Trash2,
  Home,
  Car,
  UtensilsCrossed,
  Zap,
  PiggyBank,
  Smile,
  MoreHorizontal,
} from "lucide-react";
import type { EnvelopeData } from "@/types/budget-planner";
import {
  formatCurrency,
  formatPercent,
  getProgressColor,
  getStatusAlokasi,
} from "@/lib/formatters";
import { parseNumberInput } from "@/lib/formatters";
import { cn } from "@/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home,
  Car,
  UtensilsCrossed,
  Zap,
  PiggyBank,
  Smile,
  MoreHorizontal,
};

interface EnvelopeDashboardProps {
  envelopes: EnvelopeData[];
  onAddTransaksi: (
    envelopeId: string,
    transaksi: { deskripsi: string; jumlah: number; tanggal: string }
  ) => void;
  onPindahSaldo: (fromId: string, toId: string, jumlah: number) => void;
}

export function EnvelopeDashboard({
  envelopes,
  onAddTransaksi,
  onPindahSaldo,
}: EnvelopeDashboardProps) {
  const [activeEnvelope, setActiveEnvelope] = useState<string | null>(null);
  const [showTransaksiModal, setShowTransaksiModal] = useState(false);
  const [showPindahModal, setShowPindahModal] = useState(false);
  const [transaksiDeskripsi, setTransaksiDeskripsi] = useState("");
  const [transaksiJumlah, setTransaksiJumlah] = useState("");
  const [pindahFrom, setPindahFrom] = useState("");
  const [pindahTo, setPindahTo] = useState("");
  const [pindahJumlah, setPindahJumlah] = useState("");
  const [pindahConfirm, setPindahConfirm] = useState(false);

  const openTransaksi = (envId: string) => {
    setActiveEnvelope(envId);
    setTransaksiDeskripsi("");
    setTransaksiJumlah("");
    setShowTransaksiModal(true);
  };

  const handleAddTransaksi = () => {
    if (!activeEnvelope || !transaksiDeskripsi.trim()) return;
    const jumlah = parseNumberInput(transaksiJumlah);
    if (jumlah <= 0) return;

    const env = envelopes.find((e) => e.envelopeId === activeEnvelope);
    if (env && jumlah > env.sisa && !window.confirm(`Pengeluaran melebihi saldo amplop "${env.nama}". Lanjutkan?`)) {
      return;
    }

    onAddTransaksi(activeEnvelope, {
      deskripsi: transaksiDeskripsi.trim(),
      jumlah,
      tanggal: new Date().toISOString().split("T")[0] ?? new Date().toISOString(),
    });
    setShowTransaksiModal(false);
    setActiveEnvelope(null);
  };

  const handlePindahSaldo = () => {
    if (!pindahConfirm) {
      setPindahConfirm(true);
      return;
    }
    const jumlah = parseNumberInput(pindahJumlah);
    if (!pindahFrom || !pindahTo || jumlah <= 0 || pindahFrom === pindahTo) return;

    onPindahSaldo(pindahFrom, pindahTo, jumlah);
    setShowPindahModal(false);
    setPindahConfirm(false);
    setPindahFrom("");
    setPindahTo("");
    setPindahJumlah("");
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setPindahConfirm(false);
            setShowPindahModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm"
        >
          <ArrowRightLeft size={14} />
          Pindah Saldo
        </button>
      </div>

      {/* Envelope grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {envelopes.map((env, i) => {
          const pct = env.alokasi > 0 ? (env.terpakai / env.alokasi) * 100 : 0;
          const status = getStatusAlokasi(pct);
          const progressColor = getProgressColor(pct);
          const Icon = ICON_MAP[env.icon] ?? MoreHorizontal;
          const isExpanded = activeEnvelope === env.envelopeId && !showTransaksiModal;

          return (
            <motion.div
              key={env.envelopeId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden"
            >
              {/* Envelope flap */}
              <div
                className="h-3 w-full"
                style={{ backgroundColor: `${env.warna}40` }}
              />

              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${env.warna}20` }}
                    >
                      <Icon size={16} style={{ color: env.warna }} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {env.nama}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Alokasi: {formatCurrency(env.alokasi)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                      status === "aman" && "border-green-700/50 text-green-400 bg-green-900/30",
                      status === "perhatian" && "border-amber-700/50 text-amber-400 bg-amber-900/30",
                      status === "waspada" && "border-orange-700/50 text-orange-400 bg-orange-900/30",
                      (status === "batas" || status === "overspend") &&
                        "border-red-700/50 text-red-400 bg-red-900/30"
                    )}
                  >
                    {formatPercent(pct, 0)} terpakai
                  </span>
                </div>

                {/* Sisa saldo */}
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400">Sisa Saldo</p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      env.sisa < 0 ? "text-red-400" : "text-white"
                    )}
                  >
                    {formatCurrency(Math.max(0, env.sisa))}
                  </p>
                  {env.sisa < 0 && (
                    <p className="text-xs text-red-400">
                      Overspend {formatCurrency(Math.abs(env.sisa))}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  className="h-2 bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.min(pct, 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${env.nama}: ${formatPercent(pct, 0)} terpakai`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full rounded-full", progressColor)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openTransaksi(env.envelopeId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: `${env.warna}20`,
                      color: env.warna,
                      border: `1px solid ${env.warna}30`,
                    }}
                  >
                    <Plus size={12} />
                    Catat Pengeluaran
                  </button>
                  {env.transaksi.length > 0 && (
                    <button
                      onClick={() =>
                        setActiveEnvelope(
                          isExpanded ? null : env.envelopeId
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
                    >
                      {env.transaksi.length}
                    </button>
                  )}
                </div>

                {/* Transaksi list */}
                <AnimatePresence>
                  {isExpanded && env.transaksi.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-700 pt-3 space-y-1.5"
                    >
                      {env.transaksi.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="text-slate-300 truncate flex-1">
                            {t.deskripsi}
                          </span>
                          <span className="text-red-400 font-medium tabular-nums ml-2">
                            -{formatCurrency(t.jumlah)}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Transaksi Modal */}
      <AnimatePresence>
        {showTransaksiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTransaksiModal(false);
            }}
          >
            <motion.div
              initial={{ y: 40, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Catat Pengeluaran
                </h3>
                <button
                  onClick={() => setShowTransaksiModal(false)}
                  className="text-slate-400 hover:text-white"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>

              {activeEnvelope && (
                <p className="text-sm text-slate-400">
                  Amplop:{" "}
                  <span className="text-white font-medium">
                    {envelopes.find((e) => e.envelopeId === activeEnvelope)
                      ?.nama}
                  </span>
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="txn-deskripsi"
                    className="block text-sm text-slate-400 mb-1.5"
                  >
                    Deskripsi
                  </label>
                  <input
                    id="txn-deskripsi"
                    type="text"
                    value={transaksiDeskripsi}
                    onChange={(e) => setTransaksiDeskripsi(e.target.value)}
                    placeholder="Beli makan siang..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="txn-jumlah"
                    className="block text-sm text-slate-400 mb-1.5"
                  >
                    Jumlah
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      Rp
                    </span>
                    <input
                      id="txn-jumlah"
                      type="text"
                      inputMode="numeric"
                      value={transaksiJumlah}
                      onChange={(e) => {
                        const n = parseNumberInput(e.target.value);
                        setTransaksiJumlah(
                          n > 0 ? n.toLocaleString("id-ID") : ""
                        );
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-green-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransaksiModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddTransaksi}
                  disabled={
                    !transaksiDeskripsi.trim() ||
                    parseNumberInput(transaksiJumlah) <= 0
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check size={14} />
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pindah Saldo Modal */}
      <AnimatePresence>
        {showPindahModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPindahModal(false);
                setPindahConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ y: 40, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-amber-400" />
                  Pindah Saldo Amplop
                </h3>
                <button
                  onClick={() => {
                    setShowPindahModal(false);
                    setPindahConfirm(false);
                  }}
                  className="text-slate-400 hover:text-white"
                  aria-label="Tutup modal pindah saldo"
                >
                  <X size={18} />
                </button>
              </div>

              {pindahConfirm && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-700/50 bg-amber-900/20">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Memindahkan saldo antar amplop mengurangi disiplin.
                    Yakin ingin melanjutkan?
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="pindah-from"
                    className="block text-sm text-slate-400 mb-1.5"
                  >
                    Dari Amplop
                  </label>
                  <select
                    id="pindah-from"
                    value={pindahFrom}
                    onChange={(e) => setPindahFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-800">
                      Pilih amplop...
                    </option>
                    {envelopes.map((e) => (
                      <option
                        key={e.envelopeId}
                        value={e.envelopeId}
                        className="bg-slate-800"
                        disabled={e.sisa <= 0}
                      >
                        {e.nama} (sisa: {formatCurrency(e.sisa)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="pindah-to"
                    className="block text-sm text-slate-400 mb-1.5"
                  >
                    Ke Amplop
                  </label>
                  <select
                    id="pindah-to"
                    value={pindahTo}
                    onChange={(e) => setPindahTo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-800">
                      Pilih amplop...
                    </option>
                    {envelopes
                      .filter((e) => e.envelopeId !== pindahFrom)
                      .map((e) => (
                        <option
                          key={e.envelopeId}
                          value={e.envelopeId}
                          className="bg-slate-800"
                        >
                          {e.nama}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="pindah-jumlah"
                    className="block text-sm text-slate-400 mb-1.5"
                  >
                    Jumlah
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      Rp
                    </span>
                    <input
                      id="pindah-jumlah"
                      type="text"
                      inputMode="numeric"
                      value={pindahJumlah}
                      onChange={(e) => {
                        const n = parseNumberInput(e.target.value);
                        setPindahJumlah(
                          n > 0 ? n.toLocaleString("id-ID") : ""
                        );
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-green-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPindahModal(false);
                    setPindahConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handlePindahSaldo}
                  disabled={
                    !pindahFrom ||
                    !pindahTo ||
                    parseNumberInput(pindahJumlah) <= 0 ||
                    pindahFrom === pindahTo
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                    pindahConfirm
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-amber-600 hover:bg-amber-500"
                  )}
                >
                  {pindahConfirm ? (
                    <>
                      <Check size={14} />
                      Ya, Pindahkan
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={14} />
                      Pindahkan
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="p-3 rounded-xl border border-slate-700/50 bg-slate-900/30">
        <div className="flex items-start gap-2">
          <Trash2 size={12} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Isi amplop di awal bulan. Gunakan dari amplop yang sesuai.
            Ketika amplop habis, hentikan pengeluaran di kategori tersebut.
          </p>
        </div>
      </div>
    </div>
  );
}
