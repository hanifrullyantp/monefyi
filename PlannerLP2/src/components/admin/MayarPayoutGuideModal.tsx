"use client";

import { Wallet, X, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface MayarPayoutGuideModalProps {
  onClose: () => void;
  activeBalance: number;
  pendingBalance: number;
  onRefresh?: () => void;
}

export function MayarPayoutGuideModal({
  onClose,
  activeBalance,
  pendingBalance,
  onRefresh,
}: MayarPayoutGuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Tarik Saldo (Payout Mayar)</h3>
              <p className="text-xs text-slate-400">Panduan &amp; Solusi Penarikan Dana ke Rekening Bank</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Saldo Aktif vs Pending */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Saldo Siap Tarik (Active)
            </span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {formatCurrency(activeBalance)}
            </p>
            <span className="text-[10px] text-emerald-500/80 font-bold block mt-1">Bisa langsung ditarik</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Saldo Tertunda (Pending T+1)
            </span>
            <p className="text-xl font-black text-amber-400 mt-1">
              {formatCurrency(pendingBalance)}
            </p>
            <span className="text-[10px] text-amber-500/80 font-bold block mt-1">Holding kliring bank</span>
          </div>
        </div>

        {/* Diagnostik: Mengapa Payout Belum Bisa di Mayar? */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase tracking-wider text-[11px]">
            <AlertCircle className="w-4 h-4" />
            <span>Penyebab Payout Belum Bisa di Mayar &amp; Solusinya:</span>
          </div>

          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-black">1.</span>
              <span>
                <strong>Holding Period Kliring (T+1):</strong> Pembayaran via QRIS &amp; Virtual Account di Mayar membutuhkan holding period kliring 1 hari kerja bank sebelum otomatis pindah ke Saldo Siap Tarik.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-black">2.</span>
              <span>
                <strong>Verifikasi Akun (KYB/KYC):</strong> Pastikan akun Mayar Anda telah menyelesaikan verifikasi identitas (KTP) dan rekening bank penarikan di portal Mayar.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-black">3.</span>
              <span>
                <strong>Portal Resmi Penarikan:</strong> Halaman formulir penarikan resmi Mayar berada di <code>web.mayar.id/withdraw</code>.
              </span>
            </li>
          </ul>
        </div>

        {/* Direct Action Buttons */}
        <div className="space-y-2 pt-2">
          <a
            href="https://web.mayar.id/withdraw"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <span>Buka Form Penarikan Saldo di web.mayar.id/withdraw</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="flex gap-2">
            <a
              href="https://web.mayar.id/balance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Riwayat Mutasi Saldo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Saldo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
