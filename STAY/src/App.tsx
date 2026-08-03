import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { DEFAULT_AUTH_REDIRECT, MANAGER_ROLES, ALL_STAFF_ROLES } from './config/routes';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FrontDeskPage from './pages/FrontDeskPage';
import RoomsPage from './pages/RoomsPage';
import BookingsPage from './pages/BookingsPage';
import GuestsPage from './pages/GuestsPage';
import PaymentsPage from './pages/PaymentsPage';
import HousekeepingPage from './pages/HousekeepingPage';
import POSPage from './pages/POSPage';
import FinancePage from './pages/FinancePage';
import GuestSurveyPage from './pages/GuestSurveyPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import PricingPage from './pages/PricingPage';
import AccountingPage from './pages/AccountingPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={DEFAULT_AUTH_REDIRECT} replace /> : <LoginPage />}
      />
      <Route path="/survey/:bookingId" element={<GuestSurveyPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={DEFAULT_AUTH_REDIRECT} replace />} />
        <Route path="front-desk" element={<FrontDeskPage />} />
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
              <FinancePage />
            </ProtectedRoute>
          }
        />
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
          path="accounting"
          element={
            <ProtectedRoute requiredRoles={MANAGER_ROLES}>
              <AccountingPage />
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
    <BrowserRouter basename="/stay">
      <AppRoutes />
    </BrowserRouter>
  );
}
