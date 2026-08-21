"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { saveSession } from "@/lib/utils/auth";
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
  const { isLoginModalOpen, setLoginModalOpen, pendingCheckoutProduct, setPendingCheckoutProduct } =
    useUiStore();
  const login = useAuthStore((s) => s.login);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setIsAdmin = useUiStore((s) => s.setIsAdmin);
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
    const orgId = (await ensureOwnerOrg(userId, name || "Organisasi Saya")) ?? useAuthStore.getState().orgId;
    if (!orgId) {
      setError("Gagal menyiapkan organisasi. Coba lagi dari dashboard.");
      return false;
    }
    await refreshUser();
    setLoginModalOpen(false);
    setPendingCheckoutProduct(null);
    redirectToLynkCheckout(pendingCheckoutProduct, {
      orgId,
      userId,
      email: userEmail,
    });
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
      saveSession();
      setIsAdmin(true);
    }
    if (pendingCheckoutProduct && isSupabaseConfigured()) {
      const redirected = await completePendingCheckout(result.user.id, result.user.email);
      if (redirected) return;
    }
    setLoginModalOpen(false);
    setPassword("");
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
    <Dialog open={isLoginModalOpen} onOpenChange={setLoginModalOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <LogIn className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Masuk ke Monefyi</DialogTitle>
          <DialogDescription className="text-center">{checkoutHint}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex gap-2 text-xs">
          {(["login", "signup", "forgot"] as AuthMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setInfo("");
              }}
              className={`flex-1 rounded-lg py-2 font-semibold ${
                mode === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {m === "login" ? "Login" : m === "signup" ? "Daftar" : "Lupa password"}
            </button>
          ))}
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}
          className="mt-4 space-y-4"
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
            className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
            className="w-full text-center text-xs text-slate-500 hover:text-emerald-600"
          >
            Kirim ulang email verifikasi
          </button>
        )}

        {!isSupabaseConfigured() && (
          <p className="mt-2 text-center text-xs text-amber-700">
            Supabase belum dikonfigurasi — mode demo mock aktif.
          </p>
        )}

        <button
          type="button"
          onClick={scrollToPricing}
          className="mt-2 w-full text-center text-sm text-emerald-600 hover:text-emerald-700"
        >
          Belum punya akun? Lihat paket harga
        </button>
      </DialogContent>
    </Dialog>
  );
}
