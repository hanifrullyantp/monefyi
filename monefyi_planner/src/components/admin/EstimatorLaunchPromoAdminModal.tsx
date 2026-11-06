import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { isPlatformAdmin } from '../../services/adminService';
import {
  launchPromoAdminSeverity,
  SUPER_ADMIN_LAUNCH_ALERT_EMAIL,
  type EstimatorLaunchPromoStatus,
} from '../../lib/estimatorLaunchPromo';
import { loadEstimatorLaunchPromoStatus } from '../../services/launchPromoService';

const DISMISS_KEY = 'monefyi_estimator_launch_promo_admin_dismiss';

function shouldShowForUser(email: string | undefined, platformRole: string): boolean {
  if (!isPlatformAdmin(platformRole)) return false;
  return String(email || '').trim().toLowerCase() === SUPER_ADMIN_LAUNCH_ALERT_EMAIL;
}

/**
 * Popup khusus super admin (Hanif) saat kuota promo 100 org hampir habis.
 */
export default function EstimatorLaunchPromoAdminModal() {
  const { user, platformRole } = useAppStore();
  const [status, setStatus] = useState<EstimatorLaunchPromoStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldShowForUser(user?.email, platformRole)) return;

    let cancelled = false;
    void (async () => {
      const promo = await loadEstimatorLaunchPromoStatus();
      if (cancelled || !promo) return;
      setStatus(promo);
      const severity = launchPromoAdminSeverity(promo);
      if (!severity) return;

      const dismissRaw = sessionStorage.getItem(DISMISS_KEY);
      const dismissUsed = dismissRaw ? Number(dismissRaw) : -1;
      if (dismissUsed === promo.used) return;

      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email, platformRole]);

  if (!open || !status) return null;

  const severity = launchPromoAdminSeverity(status);
  const title =
    severity === 'critical'
      ? 'Kuota promo hampir habis'
      : severity === 'warn'
        ? 'Peringatan kuota promo'
        : 'Info kuota promo launch';

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, String(status.used));
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-amber-200"
        role="alertdialog"
        aria-labelledby="launch-promo-admin-title"
      >
        <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 border-b border-amber-100">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 id="launch-promo-admin-title" className="font-bold text-[#0F172A]">
              {title}
            </h2>
            <p className="text-sm text-[#5B6B7A] mt-1">
              Promo Estimator Standard Rp 93.000 (coret Rp 99.000) untuk{' '}
              <strong className="text-[#0F172A]">100 organisasi pertama</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[#5B6B7A] hover:bg-white/80"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-[#0F172A]">
          <p>
            Terpakai: <strong>{status.used}</strong> / {status.limit} org
            {status.promoActive ? (
              <> · Sisa slot promo: <strong>{status.remaining}</strong></>
            ) : (
              <> · Promo sudah <strong>nonaktif</strong> (checkout kembali Rp 99.000)</>
            )}
          </p>
          {status.remaining <= 10 && status.promoActive && (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
              Setelah slot ke-100 terisi, checkout otomatis memakai harga normal. Pastikan halaman Lynk
              dan landing sudah selaras.
            </p>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="w-full min-h-11 rounded-xl bg-[#0F172A] text-white font-semibold text-sm hover:bg-slate-800"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
