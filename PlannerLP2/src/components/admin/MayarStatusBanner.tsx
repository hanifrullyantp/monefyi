"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowRight, X } from "lucide-react";

export function MayarStatusBanner() {
  const [status, setStatus] = useState<"healthy" | "unauthorized" | "error" | "unconfigured" | "loading">("loading");
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchHealth = async (forceCheck = false) => {
    try {
      setIsChecking(true);
      const res = await fetch(`/api/health/mayar${forceCheck ? "?check=1" : ""}`);
      const data = await res.json();
      if (data?.status) {
        setStatus(data.status);
      }
    } catch {
      setStatus("error");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Pengecekan berkala setiap 5 menit
    const interval = setInterval(() => {
      fetchHealth(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || status === "healthy" || status === "loading") {
    return null;
  }

  const isUnauthorized = status === "unauthorized";

  return (
    <div className="bg-red-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md sticky top-0 z-50 transition-all flex flex-wrap items-center justify-between gap-2 border-b border-red-700">
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
        <div className="p-1 rounded-lg bg-red-700/80 shrink-0 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
        </div>
        <div>
          <span className="font-extrabold tracking-wide uppercase mr-1.5 text-amber-200">
            {isUnauthorized ? "Mayar 401 Unauthorized" : "Koneksi Mayar Bermasalah"}
          </span>
          <span className="text-white/90">
            {isUnauthorized
              ? "API Key Mayar kedaluwarsa/tidak valid. Pembeli saat ini otomatis dialihkan ke jalur Fallback (Lynk.id / WhatsApp)."
              : "Gateway pembayaran Mayar mengalami gangguan teknis. Mode fallback aktif."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/admin/settings?tab=payment"
          className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-red-50 text-red-700 font-extrabold rounded-lg transition-all shadow-sm active:scale-95 text-xs cursor-pointer"
        >
          <span>Perbarui API Key</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <button
          onClick={() => fetchHealth(true)}
          disabled={isChecking}
          title="Cek ulang status Mayar"
          className="p-1.5 rounded-lg bg-red-700/70 hover:bg-red-700 text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={() => setDismissed(true)}
          title="Tutup pemberitahuan sementara"
          className="p-1.5 rounded-lg hover:bg-red-700/60 text-white/80 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

