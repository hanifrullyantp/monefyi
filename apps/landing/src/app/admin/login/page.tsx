"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect /admin/login → login unified di beranda. */
export default function AdminLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?login=1&next=/admin");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-500">Mengalihkan ke login…</p>
    </div>
  );
}
