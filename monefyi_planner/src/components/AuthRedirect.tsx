import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';

const MEMBERSHIP_SETUP_PATHS = [
  '/signup/owner',
  '/find-company',
  '/join',
  '/join-by-code',
  '/verify-email',
  '/onboarding/owner',
  '/onboarding/member',
];

export default function AuthRedirect() {
  const { isAuthenticated, authInitializing, platformRole, user, hasMembership } = useAppStore();
  const location = useLocation();
  if (authInitializing) return null;

  if (isAuthenticated) {
    const onLanding = location.pathname === '/';
    const isAdmin = isPlatformAdmin(platformRole, user?.email);
    if (onLanding && isAdmin) return null;

    if (!hasMembership && !isAdmin) {
      if (MEMBERSHIP_SETUP_PATHS.some(path => location.pathname.startsWith(path))) {
        return null;
      }
    }

    const guestOnlyPaths = ['/', '/login', '/signup'];
    if (guestOnlyPaths.includes(location.pathname)) {
      return <Navigate to="/app" replace />;
    }

    if (location.pathname === '/signup/owner' && hasMembership) {
      return <Navigate to="/app" replace />;
    }
  }

  return null;
}
