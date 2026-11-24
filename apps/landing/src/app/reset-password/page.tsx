"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Loader2,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fallback untuk kirim ulang jika token kedaluwarsa
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    let isMounted = true;

    // 1. Ekstrak parameter dari hash dan query string
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "";
    const hashParams = new URLSearchParams(hash);
    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    const hashError =
      hashParams.get("error_description") || hashParams.get("error");
    const searchError =
      searchParams.get("error_description") || searchParams.get("error");

    if (hashError || searchError) {
      setError(
        decodeURIComponent(
          hashError ||
            searchError ||
            "Tautan reset password tidak valid atau telah kedaluwarsa.",
        ),
      );
      setReady(true);
      return;
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    // Jika token ada di URL hash, langsung aktifkan form password baru
    if (accessToken && refreshToken) {
      setHasSession(true);
      setReady(true);
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ data, error: setErr }) => {
          if (!isMounted) return;
          if (setErr) {
            console.warn("[reset-password] setSession warning:", setErr.message);
          } else if (data?.session) {
            setHasSession(true);
          }
        });
    }

    // Dukungan PKCE code
    const code = searchParams.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error: codeErr }) => {
          if (!isMounted) return;
          if (codeErr) {
            setError(codeErr.message);
          } else if (data?.session) {
            setHasSession(true);
          }
          setReady(true);
        });
    }

    // Periksa sesi yang sudah ada di browser
    supabase.auth.getSession().then(({ data, error: sessionErr }) => {
      if (!isMounted) return;
      if (sessionErr) {
        console.warn("[reset-password] getSession warning:", sessionErr.message);
      }
      if (data?.session) {
        setHasSession(true);
      }
      setReady(true);
    });

    // Dengarkan event auth state change (misal: PASSWORD_RECOVERY atau SIGNED_IN)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setReady(true);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Koneksi autentikasi belum siap.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        router.push("/?login=1");
      }, 2500);
    } catch (err: any) {
      setError(
        err?.message ||
          "Gagal memperbarui password. Silakan minta tautan baru.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    setError("");
    setResendSuccess("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data?.error || "Gagal mengirim tautan reset baru.");
      }
      setResendSuccess(
        "Tautan baru telah dikirim! Silakan periksa inbox atau folder spam email Anda.",
      );
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim tautan reset baru.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke beranda
        </Link>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20 mb-3 text-white">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Buat Password Baru
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan password baru untuk akun Froyek Anda.
            </p>
          </div>

          {!ready ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Memvalidasi sesi verifikasi...</span>
            </div>
          ) : success ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  Password Berhasil Diperbarui!
                </h3>
                <p className="text-xs text-slate-400">
                  Password akun Anda telah berhasil diubah. Mengalihkan ke halaman login...
                </p>
              </div>
              <Link
                href="/?login=1"
                className="inline-block w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all text-center"
              >
                Login Sekarang
              </Link>
            </div>
          ) : hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Password Baru"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Tautan reset password tidak valid atau sesi telah kedaluwarsa. Masukkan email Anda di bawah untuk menerima tautan baru.
                </span>
              </div>

              {resendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300">
                  {resendSuccess}
                </div>
              )}
              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="nama@perusahaan.com"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resending || !resendEmail}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Link Reset Baru"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

