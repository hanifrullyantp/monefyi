import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { config } from '../lib/config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isDemoMode,
    authInitializing,
    emailVerified,
    hasMembership,
    onboardingCompleted,
    user,
  } = useAppStore();
  const location = useLocation();

  if (authInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isDemoMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isDemoMode) return <>{children}</>;

  if (!emailVerified && !config.skipEmailVerify) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!hasMembership) {
    return <Navigate to="/signup?mode=join" replace />;
  }

  if (!onboardingCompleted && user?.role === 'owner') {
    return <Navigate to="/onboarding/owner" replace />;
  }

  if (!onboardingCompleted && (user?.role === 'worker' || user?.role === 'manager' || user?.role === 'staff')) {
    return <Navigate to="/onboarding/member" replace />;
  }

  return <>{children}</>;
}
