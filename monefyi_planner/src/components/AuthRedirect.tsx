import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';

export default function AuthRedirect() {
  const { isAuthenticated, authInitializing, platformRole, user } = useAppStore();
  const location = useLocation();
  if (authInitializing) return null;

  if (isAuthenticated) {
    const onLanding = location.pathname === '/';
    const isAdmin = isPlatformAdmin(platformRole, user?.email);
    if (onLanding && isAdmin) {
      return null;
    }
    return <Navigate to="/app" replace />;
  }

  return null;
}
