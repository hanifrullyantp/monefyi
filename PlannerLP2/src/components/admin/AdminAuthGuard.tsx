"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const setAdmin = useUIStore((s) => s.setAdmin);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace("/?login=1&next=/admin");
      return;
    }

    if (!user?.isAdmin) {
      setChecked(true);
      return;
    }

    setAdmin(true);
    setChecked(true);
  }, [hydrated, isAuthenticated, user, router, setAdmin]);

  if (!hydrated || !checked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Akses Admin Ditolak</h1>
          <p className="text-sm text-slate-500 mb-6">
            Akun Anda tidak memiliki izin admin. Login dengan akun administrator.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
