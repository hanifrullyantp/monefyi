import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { DEFAULT_AUTH_REDIRECT, getPostLoginRedirect, MANAGER_ROLES } from './config/routes';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FrontDeskPage from './pages/FrontDeskPage';
import RoomsPage from './pages/RoomsPage';
import BookingsPage from './pages/BookingsPage';
import GuestsPage from './pages/GuestsPage';
import PaymentsPage from './pages/PaymentsPage';
import HousekeepingPage from './pages/HousekeepingPage';
import POSPage from './pages/POSPage';
import KeuanganPage from './pages/KeuanganPage';
import GuestSurveyPage from './pages/GuestSurveyPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import PricingPage from './pages/PricingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import FrontDeskPreferencesPage from './pages/settings/FrontDeskPreferencesPage';
import XenditDashboardPage from './pages/XenditDashboardPage';
import PublicBookingPage from './pages/public/PublicBookingPage';
import LandingPage from './pages/LandingPage';
import { useStayBootstrap } from './hooks/useStayBootstrap';

const RoomCardDemo = import.meta.env.DEV
  ? lazy(() => import('./pages/dev/RoomCardDemo'))
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();
  useStayBootstrap();

  const postLoginPath = user ? getPostLoginRedirect(user.role) : DEFAULT_AUTH_REDIRECT;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={postLoginPath} replace /> : <LoginPage />}
      />
      <Route path="/survey/:bookingId" element={<GuestSurveyPage />} />
      <Route path="/book/:tenantSlug" element={<PublicBookingPage />} />

      {import.meta.env.DEV && RoomCardDemo && (
        <Route
          path="/dev/room-cards"
          element={
            <Suspense fallback={<div className="p-8 text-center">Memuat demo...</div>}>
              <RoomCardDemo />
            </Suspense>
          }
        />
      )}

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="front-desk" element={<FrontDeskPage />} />
        <Route path="settings/frontdesk-preferences" element={<FrontDeskPreferencesPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route
          path="finance"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <KeuanganPage />
            </ProtectedRoute>
          }
        />
        <Route path="accounting" element={<Navigate to="/finance" replace />} />
        <Route
          path="staff"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <EmployeeManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pricing"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <PricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="xendit"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <XenditDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/stay">
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
