import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { isRabEnabled, isRabSuperAdmin } from '../../lib/rab';

interface RabGuardProps {
  children: React.ReactNode;
}

export default function RabGuard({ children }: RabGuardProps) {
  const { user, emailVerified } = useAppStore();
  const allowed = isRabEnabled() && isRabSuperAdmin(user?.email, emailVerified);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-slate-900">Akses ditolak</h2>
          <p className="text-sm text-slate-500 mt-2">
            Halaman RAB hanya tersedia untuk super admin terverifikasi.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
