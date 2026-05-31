import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { config } from '../lib/config';

/** Requires authenticated session only (for onboarding / verify email). */
export default function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isDemoMode, authInitializing, emailVerified } = useAppStore();
  const location = useLocation();

  if (authInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isDemoMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!emailVerified && !config.skipEmailVerify && !location.pathname.startsWith('/verify-email')) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}
