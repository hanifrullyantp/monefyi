import { useEffect } from 'react';
import LandingPage from './LandingPage';

const LP2_DEV_URL = (import.meta.env.VITE_PLANNER_LP2_DEV_URL as string | undefined)?.replace(/\/$/, '');

/**
 * Production root = PlannerLP2 (Vercel). SPA standalone di localhost menampilkan landing lama
 * kecuali VITE_PLANNER_LP2_DEV_URL di-set → redirect ke Next.js dev server.
 */
export default function LandingEntry() {
  const useLp2Redirect = import.meta.env.DEV && Boolean(LP2_DEV_URL);

  useEffect(() => {
    if (!useLp2Redirect || !LP2_DEV_URL) return;
    window.location.replace(LP2_DEV_URL);
  }, [useLp2Redirect]);

  if (useLp2Redirect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600">Membuka landing page baru…</p>
        <p className="text-xs text-slate-400">
          Pastikan <code className="bg-slate-100 px-1 rounded">PlannerLP2</code> jalan di{' '}
          <a href={LP2_DEV_URL} className="text-emerald-600 underline">{LP2_DEV_URL}</a>
        </p>
      </div>
    );
  }

  return <LandingPage />;
}
