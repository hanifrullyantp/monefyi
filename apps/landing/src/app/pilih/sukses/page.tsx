import { Suspense } from "react";
import { PilihSuksesTracker } from "./PilihSuksesTracker";

export const metadata = {
  title: "Pembayaran",
  description: "Lanjutkan ke aplikasi setelah pembayaran froyek.",
};

export default function PilihSuksesPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <Suspense fallback={null}>
        <PilihSuksesTracker />
      </Suspense>
      <h1 className="text-3xl font-bold text-slate-900">Terima kasih sudah melanjutkan</h1>
      <p className="mt-4 text-slate-600">
        Jika pembayaran sudah masuk, akses disiapkan lewat akun yang kamu isi. Buka aplikasi untuk menyelesaikan pengaturan awal.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <a className="rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold text-white" href="/onboarding/owner">Lanjut ke aplikasi</a>
        <a className="text-center font-semibold text-emerald-800" href="/login">Masuk</a>
      </div>
    </main>
  );
}
