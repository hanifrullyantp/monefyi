"use client";

import { useState } from "react";
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

export function LoginModal() {
  const { isLoginModalOpen, setLoginModalOpen } = useUiStore();
  const login = useAuthStore((s) => s.login);
  const setIsAdmin = useUiStore((s) => s.setIsAdmin);
  const [email, setEmail] = useState("user@monefyi.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollToPricing = () => {
    setLoginModalOpen(false);
    document.getElementById("harga")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Login gagal.");
      return;
    }
    if (result.user?.isAdmin) {
      saveSession();
      setIsAdmin(true);
    }
    setLoginModalOpen(false);
    setPassword("");
  };

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={setLoginModalOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <LogIn className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Masuk ke Monefyi</DialogTitle>
          <DialogDescription className="text-center">
            Login untuk akses Estimator dan trial Planner (2 proyek).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="password123"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo: <strong>user@monefyi.com</strong> / password123 · Admin: <strong>hanif.rullyant@gmail.com</strong>
        </p>

        <button
          type="button"
          onClick={scrollToPricing}
          className="mt-2 w-full text-center text-sm text-emerald-600 hover:text-emerald-700"
        >
          Belum punya akun? Beli Estimator sekarang
        </button>
      </DialogContent>
    </Dialog>
  );
}
