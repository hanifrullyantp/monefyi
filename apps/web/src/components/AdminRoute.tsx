import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authInitializing, user, platformRole } = useAppStore();

  if (authInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Memuat...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!isPlatformAdmin(platformRole, user?.email)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
