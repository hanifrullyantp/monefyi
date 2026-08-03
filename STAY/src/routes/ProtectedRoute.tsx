import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccessRoute, ROLE_DENIED_REDIRECT } from '../config/routes';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const path = location.pathname.replace(/^\/stay/, '') || '/';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roles = requiredRoles;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={ROLE_DENIED_REDIRECT} replace />;
  }

  if (!roles && user && !canAccessRoute(path, user.role)) {
    return <Navigate to={ROLE_DENIED_REDIRECT} replace />;
  }

  return <>{children}</>;
}
