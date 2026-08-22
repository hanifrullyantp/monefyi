"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, X } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";
import {
  resetPasswordForEmail,
  resendSignupVerification,
  signUpWithPassword,
} from "@/lib/services/authService";
import { ensureOwnerOrg } from "@/lib/services/orgService";
import { redirectToLynkCheckout } from "@/lib/checkout/lynk";
import { lynkProductLabel } from "@/lib/checkout/products";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthMode = "login" | "signup" | "forgot";

export function LoginModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoginModalOpen, setLoginModalOpen, pendingCheckoutProduct, setPendingCheckoutProduct } =
    useUIStore();
  const login = useAuthStore((s) => s.login);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setAdmin = useUIStore((s) => s.setAdmin);
  const { content } = useContentStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoginModalOpen) {
      setMode("login");
      setError("");
      setInfo("");
    }
  }, [isLoginModalOpen]);

  const scrollToPricing = () => {
    setLoginModalOpen(false);
    document.getElementById("harga")?.scrollIntoView({ behavior: "smooth" });
  };

  const completePendingCheckout = async (userId: string, userEmail: string) => {
    if (!pendingCheckoutProduct) return false;
    const orgId =
      (await ensureOwnerOrg(userId, name || "Organisasi Saya")) ?? useAuthStore.getState().orgId;
    if (!orgId) {
      setError("Gagal menyiapkan organisasi. Coba lagi dari dashboard.");
      return false;
    }
    await refreshUser();
    setLoginModalOpen(false);
    setPendingCheckoutProduct(null);
    redirectToLynkCheckout(
      pendingCheckoutProduct,
      { orgId, userId, email: userEmail },
      content.pricing.lynkCheckoutUrls,
    );
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const result = await login(email, password);
    setLoading(false);
    if (!result.success || !result.user) {
      setError(result.error ?? "Login gagal.");
      return;
    }
    if (result.user.isAdmin) {
      setAdmin(true);
    }
    if (pendingCheckoutProduct && isSupabaseConfigured()) {
      const redirected = await completePendingCheckout(result.user.id, result.user.email);
      if (redirected) return;
    }
    setLoginModalOpen(false);
    setPassword("");

    const next = searchParams.get("next");
    if (result.user.isAdmin && next?.startsWith("/admin")) {
      router.push(next);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const { data, error: signUpErr } = await signUpWithPassword(email, password, { name });
    setLoading(false);
    if (signUpErr) {
      setError(signUpErr.message);
      return;
    }
    if (data.session && data.user) {
      if (pendingCheckoutProduct) {
        const redirected = await completePendingCheckout(data.user.id, data.user.email || email);
        if (redirected) return;
      }
      setLoginModalOpen(false);
      return;
    }
    setInfo("Cek email untuk verifikasi akun. Setelah verifikasi, login lalu lanjut checkout.");
    setMode("login");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const { error: resetErr } = await resetPasswordForEmail(email);
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setInfo("Link reset password dikirim. Cek inbox dan folder spam.");
  };

  const handleResendVerify = async () => {
    setLoading(true);
    setError("");
    const { error: resendErr } = await resendSignupVerification(email);
    setLoading(false);
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setInfo("Email verifikasi dikirim ulang.");
  };

  const checkoutHint = pendingCheckoutProduct
    ? `Login untuk melanjutkan checkout ${lynkProductLabel(pendingCheckoutProduct)}.`
    : "Login untuk akses Estimator dan trial Planner (2 proyek).";

  return (
    <AnimatePresence>
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLoginModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setLoginModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Masuk ke Monefyi</h2>
              <p className="text-slate-500 mt-2 text-sm">{checkoutHint}</p>
            </div>

            <div className="flex gap-2 text-xs mb-4">
              {(["login", "signup", "forgot"] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                    setInfo("");
                  }}
                  className={`flex-1 rounded-xl py-2 font-semibold transition-all ${
                    mode === m ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m === "login" ? "Login" : m === "signup" ? "Daftar" : "Lupa password"}
                </button>
              ))}
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}
              className="space-y-4"
            >
              {mode === "signup" && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Nama</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              {mode !== "forgot" && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {info && <p className="text-sm text-emerald-600">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-premium text-white rounded-2xl py-3.5 font-bold text-sm shadow-premium disabled:opacity-50"
              >
                {loading
                  ? "Memproses…"
                  : mode === "login"
                    ? "Login"
                    : mode === "signup"
                      ? "Daftar"
                      : "Kirim link reset"}
              </button>
            </form>

            {mode === "login" && isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleResendVerify}
                disabled={loading || !email}
                className="mt-3 w-full text-center text-xs text-slate-500 hover:text-emerald-600"
              >
                Kirim ulang email verifikasi
              </button>
            )}

            {!isSupabaseConfigured() && (
              <p className="mt-2 text-center text-xs text-amber-700">
                Supabase belum dikonfigurasi — login tidak tersedia.
              </p>
            )}

            <button
              type="button"
              onClick={scrollToPricing}
              className="mt-4 w-full text-center text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Belum punya akun? Lihat paket harga
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
