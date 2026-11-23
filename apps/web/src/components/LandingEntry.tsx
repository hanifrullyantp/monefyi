import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isEstimatorBrandContext } from '../lib/estimatorBrand';
import { estimatorAppEntryPath } from '../lib/pwaBrand';

const LP2_DEV_URL = (import.meta.env.VITE_PLANNER_LP2_DEV_URL as string | undefined)?.replace(/\/$/, '');

/** Root `/` — marketing ada di PlannerLP2; SPA hanya redirect ke login/app. */
export default function LandingEntry() {
  const useLp2Redirect = import.meta.env.DEV && Boolean(LP2_DEV_URL);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    if (!useLp2Redirect || !LP2_DEV_URL) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
      if (!cancelled) setUnreachable(true);
    }, 3500);

    fetch(LP2_DEV_URL, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
      .then(() => {
        if (!cancelled) window.location.replace(LP2_DEV_URL);
      })
      .catch(() => {
        if (!cancelled) setUnreachable(true);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [useLp2Redirect]);

  if (useLp2Redirect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        {!unreachable && (
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        )}
        <div className="space-y-1.5 max-w-md">
          <p className="text-sm font-semibold text-slate-800">
            {unreachable
              ? 'Server landing page dev tidak terjangkau.'
              : 'Membuka landing page baru…'}
          </p>
          <p className="text-xs text-slate-600">
            Pastikan <code className="bg-slate-100 px-1 rounded">PlannerLP2</code> jalan di{' '}
            <a href={LP2_DEV_URL} className="text-emerald-700 font-semibold underline">{LP2_DEV_URL}</a>
            {unreachable ? ', atau lanjut langsung ke aplikasi Froyek di bawah.' : ''}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
          <Link
            to="/login"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Masuk Langsung ke Aplikasi Froyek
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 text-sm font-semibold rounded-xl transition-colors"
          >
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    );
  }

  const next = isEstimatorBrandContext() ? estimatorAppEntryPath() : '/app';
  return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
}
