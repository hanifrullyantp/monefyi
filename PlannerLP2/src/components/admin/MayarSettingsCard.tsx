"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Send,
  ShieldCheck,
  ExternalLink,
  Zap,
  Info,
} from "lucide-react";

export function MayarSettingsCard() {
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("https://api.mayar.id");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"healthy" | "unauthorized" | "error" | "unconfigured" | "loading">("loading");
  const [balance, setBalance] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAlert, setIsTestingAlert] = useState(false);

  // Fetch current status
  const loadStatus = async (forceCheck = false) => {
    try {
      setIsChecking(true);
      const res = await fetch(`/api/health/mayar${forceCheck ? "?check=1" : ""}`);
      const data = await res.json();
      if (data) {
        setStatus(data.status || "unconfigured");
        setBalance(typeof data.balance === "number" ? data.balance : null);
        setLastChecked(data.lastChecked || new Date().toISOString());
        if (data.apiUrl) setApiUrl(data.apiUrl);
      }
    } catch {
      setStatus("error");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Test API Key typed in the input
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setFeedback({ type: "error", message: "Masukkan API Key Mayar terlebih dahulu untuk diuji." });
      return;
    }

    try {
      setIsChecking(true);
      setFeedback(null);
      const res = await fetch(`/api/health/mayar?test_key=${encodeURIComponent(apiKey.trim())}&test_url=${encodeURIComponent(apiUrl)}`);
      const data = await res.json();

      if (data.ok && data.status === "healthy") {
        setFeedback({
          type: "success",
          message: `Kunci Valid & Aktif! Saldo Mayar terdeteksi: Rp ${(data.balance || 0).toLocaleString("id-ID")}. Silakan klik 'Simpan Kunci Baru' agar aktif permanen.`,
        });
        setStatus("healthy");
        setBalance(data.balance || 0);
      } else if (data.status === "unauthorized") {
        setFeedback({
          type: "error",
          message: "API Key DITOLAK oleh Mayar (401 Unauthorized). Pastikan Anda menyalin API Key yang valid dari Dashboard Mayar.",
        });
        setStatus("unauthorized");
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Gagal menghubungi Mayar API.",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Koneksi pengujian gagal" });
    } finally {
      setIsChecking(false);
    }
  };

  // Save new key
  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setFeedback({ type: "error", message: "API Key Mayar tidak boleh kosong." });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      const res = await fetch("/api/health/mayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), apiUrl }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setFeedback({
          type: "success",
          message: "API Key Mayar berhasil disimpan dan diverifikasi aktif di server cloud!",
        });
        setStatus("healthy");
        if (typeof data?.health?.balance === "number") {
          setBalance(data.health.balance);
        }
        setApiKey("");
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Gagal menyimpan API Key Mayar.",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan" });
    } finally {
      setIsSaving(false);
    }
  };

  // Test Emergency Alert to Admin WA/Telegram
  const handleTestAlert = async () => {
    try {
      setIsTestingAlert(true);
      setFeedback(null);
      const res = await fetch("/api/health/mayar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendTestAlert: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({
          type: "success",
          message: `Berhasil! Pesan alert darurat terkirim ke WhatsApp & Telegram: ${data.message}`,
        });
      } else {
        setFeedback({
          type: "error",
          message: `Peringatan: ${data.message}. Pastikan nomor WhatsApp Admin atau Bot Telegram sudah dikonfigurasi di Pengaturan.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Gagal mengirim alert tes" });
    } finally {
      setIsTestingAlert(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-6 shadow-xs">
      {/* Header & Status Indicator */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Koneksi Payment Gateway Mayar (QRIS & VA)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pusat kontrol integrasi Mayar, pemantauan status token, dan sistem alert otomatis anti-gagal.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2.5">
          {status === "healthy" ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TERHUBUNG & AKTIF</span>
              {balance !== null && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  (Saldo: Rp {balance.toLocaleString("id-ID")})
                </span>
              )}
            </div>
          ) : status === "unauthorized" ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>UNAUTHORIZED (401) — KUNCI EXPIRED</span>
            </div>
          ) : status === "loading" ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memeriksa Status...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>BELUM TERHUBUNG</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadStatus(true)}
            disabled={isChecking}
            title="Cek ulang koneksi Mayar"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : feedback.type === "error"
              ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
              : "bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* Form Input API Key */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Mayar API Key (Bearer Token)
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Masukkan API Key dari Dashboard Mayar (dimulai dengan eyJ...)"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Kunci ini disimpan aman di cloud Supabase dan tersinkronisasi otomatis di semua server dan checkout.
          </p>
        </div>

        {/* Environment Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Environment Mayar API
            </label>
            <select
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="https://api.mayar.id">Production Resmi (api.mayar.id)</option>
              <option value="https://api.mayar.club">Sandbox Testing (api.mayar.club)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isChecking || !apiKey.trim()}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{isChecking ? "Menguji..." : "Uji Kunci"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveKey}
              disabled={isSaving || !apiKey.trim()}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Kunci"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fitur Proteksi Fallback & Pencegahan Downtime */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sistem Proteksi Pembayaran 100% Anti-Gagal (Auto-Fallback)</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
          Jika sewaktu-waktu Mayar mengalami <strong>401 Unauthorized</strong> atau maintenance berkala:
        </p>
        <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold">✔</span>
            <span>
              <strong>Pembeli Otomatis Dialihkan:</strong> Checkout seketika mengarahkan pembeli ke link pembayaran cadangan resmi (Lynk.id / WhatsApp). Tidak ada calon pembeli yang gagal bayar.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold">✔</span>
            <span>
              <strong>Pengecekan Berkala (Health Check):</strong> Server memantau status token Mayar setiap interval reguler dan saat admin membuka dashboard.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold">✔</span>
            <span>
              <strong>Alert Seketika ke HP Anda:</strong> Bot WhatsApp &amp; Telegram mengirimkan pesan darurat dengan solusi langsung jika otorisasi Mayar bermasalah.
            </span>
          </li>
        </ul>
      </div>

      {/* Tombol Test Alert ke WhatsApp & Telegram */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Uji apakah bot WhatsApp dan Telegram Anda siap menerima notifikasi jika Mayar bermasalah:
        </div>

        <button
          type="button"
          onClick={handleTestAlert}
          disabled={isTestingAlert}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Send className={`w-3.5 h-3.5 ${isTestingAlert ? "animate-pulse text-indigo-400" : ""}`} />
          <span>{isTestingAlert ? "Mengirim Alert..." : "Test Kirim Alert (WhatsApp & Telegram)"}</span>
        </button>
      </div>

      {/* Tutorial Singkat Mengambil Kunci Mayar */}
      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
        <div className="font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Cara Mengambil API Key Baru di Mayar:</span>
          </span>
          <a
            href="https://dashboard.mayar.id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:no-underline"
          >
            <span>Buka Dashboard Mayar</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
          1. Buka <strong>dashboard.mayar.id</strong> &rarr; Masuk ke menu <strong>Integrasi / API</strong>.<br />
          2. Klik <strong>Generate API Key</strong> baru (Pilih scope pembayaran penuh).<br />
          3. Salin API Key dan tempel di formulir di atas, lalu klik <strong>Simpan Kunci</strong>.
        </p>
      </div>
    </div>
  );
}

